import { db } from './db';
import { 
  rewards, 
  dailyRewards, 
  lpPositions, 
  users,
  type InsertReward,
  type InsertDailyReward,
  type Reward,
  type DailyReward
} from '@shared/schema';
import { eq, and, gte, desc, sum, sql } from 'drizzle-orm';

export interface RewardCalculationResult {
  baseAPR: number;
  timeMultiplier: number;
  sizeMultiplier: number;
  effectiveAPR: number;
  dailyRewards: number;
  liquidityAmount: number;
  daysStaked: number;
  accumulatedRewards: number;
  canClaim: boolean;
  daysUntilClaim: number;
  rank: number | null;
  totalParticipants: number;
}

export interface ClaimRewardResult {
  success: boolean;
  claimedAmount: number;
  transactionHash?: string;
  transactionData?: {
    to: string;
    amount: number;
    tokenContract: string;
    networkId: number;
    timestamp: string;
  };
  error?: string;
}

export class RewardService {
  constructor(private db: any) {}

  // Top 100 ranking system parameters
  private readonly TREASURY_ALLOCATION = 2905600; // 1% of 290.56M KILT supply
  private readonly PROGRAM_DURATION_DAYS = 365; // 365 days program duration
  private readonly DAILY_BUDGET = this.TREASURY_ALLOCATION / this.PROGRAM_DURATION_DAYS; // ~7,960 KILT/day
  private readonly LOCK_PERIOD_DAYS = 90; // 90 days from liquidity addition
  private readonly MIN_POSITION_VALUE = 100; // Minimum $100 position
  private readonly MAX_PARTICIPANTS = 100; // Top 100 participants
  private readonly DAILY_BUDGET_PER_USER = this.DAILY_BUDGET / this.MAX_PARTICIPANTS; // ~79.6 KILT per user
  
  // Liquidity + Duration Weighted Rule parameters
  private readonly LIQUIDITY_WEIGHT = 0.6; // w1 - weight for liquidity provided
  private readonly TIME_WEIGHT = 0.4; // w2 - weight for days active

  /**
   * Calculate rank multiplier based on position in top 100
   * Formula: 1 - (rank - 1) / 99
   */
  private calculateRankMultiplier(rank: number): number {
    if (rank < 1 || rank > 100) return 0;
    return 1 - ((rank - 1) / 99);
  }

  /**
   * Calculate user's liquidity score for replacement mechanism
   * Formula: L_u * D_u (liquidity × days active)
   */
  private calculateLiquidityScore(liquidity: number, daysActive: number): number {
    return liquidity * daysActive;
  }

  /**
   * Get top 100 participants ranked by liquidity
   */
  private async getTop100Participants(): Promise<any[]> {
    const positions = await this.db.select().from(lpPositions).where(eq(lpPositions.isActive, true));
    
    // Sort by liquidity value (descending) and take top 100
    const sortedPositions = positions.sort((a, b) => b.currentValueUSD - a.currentValueUSD);
    return sortedPositions.slice(0, this.MAX_PARTICIPANTS);
  }

  /**
   * Get user's current ranking position
   */
  async getUserRanking(userId: number): Promise<{ rank: number | null, totalParticipants: number }> {
    const positions = await this.db.select().from(lpPositions).where(eq(lpPositions.isActive, true));
    
    // Sort by liquidity value (descending)
    const sortedPositions = positions.sort((a, b) => b.currentValueUSD - a.currentValueUSD);
    
    // Find user's position
    const userPositionIndex = sortedPositions.findIndex(pos => pos.userId === userId);
    
    return {
      rank: userPositionIndex >= 0 ? userPositionIndex + 1 : null,
      totalParticipants: Math.min(sortedPositions.length, this.MAX_PARTICIPANTS)
    };
  }

  /**
   * Get total liquidity of top 100 participants
   */
  private async getTotalTop100Liquidity(): Promise<number> {
    const top100 = await this.getTop100Participants();
    return top100.reduce((sum, position) => sum + position.currentValueUSD, 0);
  }

  /**
   * Check if user qualifies for top 100 based on replacement rule
   */
  private async checkReplacementEligibility(liquidity: number, daysActive: number): Promise<{ eligible: boolean, rank?: number }> {
    const top100 = await this.getTop100Participants();
    
    if (top100.length < this.MAX_PARTICIPANTS) {
      return { eligible: true, rank: top100.length + 1 };
    }
    
    // Check if user's L_u * D_u > L_100 * D_100
    const userScore = this.calculateLiquidityScore(liquidity, daysActive);
    const rank100Position = top100[99];
    const rank100DaysActive = Math.floor((Date.now() - new Date(rank100Position.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const rank100Score = this.calculateLiquidityScore(rank100Position.currentValueUSD, rank100DaysActive);
    
    if (userScore > rank100Score) {
      return { eligible: true, rank: 100 };
    }
    
    return { eligible: false };
  }

  /**
   * Calculate rewards using Top 100 ranking system
   * Formula: R_u = (w1 * L_u/T_top100 + w2 * D_u/365) * R/365/100 * (1 - (rank-1)/99)
   */
  async calculatePositionRewards(
    userId: number,
    nftTokenId: string,
    positionValueUSD: number,
    liquidityAddedAt?: Date,
    stakingStartDate?: Date
  ): Promise<RewardCalculationResult> {
    // Get existing reward record for dates if not provided
    let existingReward = null;
    if (!liquidityAddedAt || !stakingStartDate) {
      existingReward = await this.getPositionReward(userId, nftTokenId);
    }
    
    // Use provided dates or fall back to existing record
    const liquidityDate = liquidityAddedAt || (existingReward ? new Date(existingReward.liquidityAddedAt) : new Date());
    const stakingDate = stakingStartDate || (existingReward ? new Date(existingReward.stakingStartDate) : new Date());
    
    // Calculate days since liquidity was added (for claim eligibility)
    const daysSinceLiquidity = Math.floor((Date.now() - liquidityDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Calculate days since NFT staking started (for reward accumulation)
    const daysStaked = Math.floor((Date.now() - stakingDate.getTime()) / (24 * 60 * 60 * 1000));
    
    // Get top 100 participants and check user's rank
    const top100 = await this.getTop100Participants();
    const totalTop100Liquidity = await this.getTotalTop100Liquidity();
    
    // Find user's position in top 100 (rank 1-100)
    const userRank = top100.findIndex(pos => pos.userId === userId && pos.nftTokenId === nftTokenId) + 1;
    
    // If user is not in top 100, check replacement eligibility
    if (userRank === 0) {
      const eligibility = await this.checkReplacementEligibility(positionValueUSD, daysStaked);
      if (!eligibility.eligible) {
        return {
          baseAPR: 0,
          timeMultiplier: 0,
          sizeMultiplier: 0,
          effectiveAPR: 0,
          dailyRewards: 0,
          liquidityAmount: positionValueUSD,
          daysStaked,
          accumulatedRewards: 0,
          canClaim: false,
          daysUntilClaim: Math.max(0, this.LOCK_PERIOD_DAYS - daysSinceLiquidity),
          rank: null,
          totalParticipants: Math.min(top100.length, this.MAX_PARTICIPANTS)
        };
      }
    }
    
    // Calculate Top 100 ranking reward formula
    // R_u = (w1 * L_u/T_top100 + w2 * D_u/365) * R/365/100 * (1 - (rank-1)/99)
    const liquidityShare = positionValueUSD / totalTop100Liquidity;
    const timeFactor = Math.min(daysStaked / this.PROGRAM_DURATION_DAYS, 1);
    const rankMultiplier = this.calculateRankMultiplier(userRank || 100);
    
    // Calculate base component: w1 * L_u/T_top100 + w2 * D_u/365
    const baseComponent = (this.LIQUIDITY_WEIGHT * liquidityShare) + (this.TIME_WEIGHT * timeFactor);
    
    // Calculate daily rewards using Top 100 ranking formula
    // R_u = base_component * (R/365/100) * rank_multiplier
    const dailyRewards = baseComponent * this.DAILY_BUDGET_PER_USER * rankMultiplier;
    
    // Calculate effective APR based on daily rewards
    const annualRewards = dailyRewards * 365;
    const effectiveAPR = positionValueUSD > 0 ? (annualRewards / positionValueUSD) * 100 : 0;
    
    // Get accumulated rewards
    const accumulatedRewards = existingReward ? Number(existingReward.accumulatedAmount) : 0;
    
    // Check if eligible for claiming (90 day lock from liquidity addition)
    const canClaim = daysSinceLiquidity >= this.LOCK_PERIOD_DAYS;
    const daysUntilClaim = Math.max(0, this.LOCK_PERIOD_DAYS - daysSinceLiquidity);

    return {
      baseAPR: effectiveAPR, // Now calculated from ranking system
      timeMultiplier: timeFactor, // Now 0-1 normalized time factor
      sizeMultiplier: rankMultiplier, // Now rank multiplier
      effectiveAPR,
      dailyRewards,
      liquidityAmount: positionValueUSD,
      daysStaked,
      accumulatedRewards,
      canClaim,
      daysUntilClaim,
      rank: userRank || null,
      totalParticipants: Math.min(top100.length, this.MAX_PARTICIPANTS)
    };
  }

  /**
   * Create or update reward tracking for a position
   */
  async createPositionReward(
    userId: number,
    positionId: number,
    nftTokenId: string,
    positionValueUSD: number,
    liquidityAddedAt: Date,
    stakingStartDate?: Date
  ): Promise<Reward> {
    const stakingDate = stakingStartDate || new Date(); // Default to now if not provided
    
    const calculation = await this.calculatePositionRewards(
      userId, 
      nftTokenId, 
      positionValueUSD, 
      liquidityAddedAt,
      stakingDate
    );
    
    const rewardData: InsertReward = {
      userId,
      positionId,
      nftTokenId,
      positionValueUSD: positionValueUSD.toString(),
      dailyRewardAmount: calculation.dailyRewards.toString(),
      accumulatedAmount: "0",
      liquidityAddedAt,
      stakingStartDate: stakingDate
    };

    const [reward] = await this.db
      .insert(rewards)
      .values(rewardData)
      .returning();

    return reward;
  }

  /**
   * Update daily rewards for all active positions
   */
  async updateDailyRewards(): Promise<void> {
    // Get all active reward positions
    const activeRewards = await this.db
      .select({
        reward: rewards,
        position: lpPositions,
        user: users
      })
      .from(rewards)
      .leftJoin(lpPositions, eq(rewards.positionId, lpPositions.id))
      .leftJoin(users, eq(rewards.userId, users.id))
      .where(eq(lpPositions.isActive, true));

    const today = new Date().toISOString().split('T')[0];

    for (const { reward, position } of activeRewards) {
      if (!reward || !position) continue;

      // Calculate days staked and liquidity duration
      const stakingStart = new Date(reward.stakingStartDate);
      const liquidityStart = new Date(reward.liquidityAddedAt);
      const daysStaked = Math.floor((Date.now() - stakingStart.getTime()) / (24 * 60 * 60 * 1000));

      // Recalculate rewards based on current position value and staking time
      const positionValue = Number(reward.positionValueUSD);
      const calculation = await this.calculatePositionRewards(
        reward.userId,
        reward.nftTokenId,
        positionValue,
        liquidityStart,
        stakingStart
      );

      // Check if we already recorded today's reward
      const existingDailyReward = await this.db
        .select()
        .from(dailyRewards)
        .where(
          and(
            eq(dailyRewards.rewardId, reward.id),
            eq(dailyRewards.date, today)
          )
        )
        .limit(1);

      if (existingDailyReward.length === 0) {
        // Record today's reward
        const dailyRewardData: InsertDailyReward = {
          rewardId: reward.id,
          userId: reward.userId,
          positionId: reward.positionId,
          date: today,
          positionValueUSD: positionValue.toString(),
          baseAPR: calculation.baseAPR.toString(),
          timeMultiplier: calculation.timeMultiplier.toString(),
          sizeMultiplier: calculation.sizeMultiplier.toString(),
          effectiveAPR: calculation.effectiveAPR.toString(),
          dailyRewardAmount: calculation.dailyRewards.toString(),
          daysStaked: calculation.daysStaked
        };

        await this.db.insert(dailyRewards).values(dailyRewardData);

        // Update accumulated amount
        const newAccumulated = Number(reward.accumulatedAmount) + calculation.dailyRewards;
        await this.db
          .update(rewards)
          .set({
            accumulatedAmount: newAccumulated.toString(),
            lastRewardCalculation: new Date(),
            isEligibleForClaim: daysStaked >= this.LOCK_PERIOD_DAYS
          })
          .where(eq(rewards.id, reward.id));
      }
    }
  }

  /**
   * Get reward information for a specific position
   */
  async getPositionReward(userId: number, nftTokenId: string): Promise<Reward | null> {
    const [reward] = await this.db
      .select()
      .from(rewards)
      .where(
        and(
          eq(rewards.userId, userId),
          eq(rewards.nftTokenId, nftTokenId)
        )
      )
      .limit(1);

    return reward || null;
  }

  /**
   * Get all rewards for a user
   */
  async getUserRewards(userId: number): Promise<Reward[]> {
    return await this.db
      .select()
      .from(rewards)
      .where(eq(rewards.userId, userId))
      .orderBy(desc(rewards.createdAt));
  }

  /**
   * Get claimable rewards for a user
   */
  async getClaimableRewards(userId: number): Promise<Reward[]> {
    return await this.db
      .select()
      .from(rewards)
      .where(
        and(
          eq(rewards.userId, userId),
          eq(rewards.isEligibleForClaim, true),
          sql`${rewards.accumulatedAmount} > ${rewards.claimedAmount}`
        )
      );
  }

  /**
   * Claim rewards for a user - transfers KILT tokens to user's wallet
   */
  async claimRewards(userId: number, userAddress: string): Promise<ClaimRewardResult> {
    try {
      const claimableRewards = await this.getClaimableRewards(userId);
      
      if (claimableRewards.length === 0) {
        return {
          success: false,
          claimedAmount: 0,
          error: "No claimable rewards available"
        };
      }

      let totalClaimable = 0;
      
      // Calculate total claimable amount
      for (const reward of claimableRewards) {
        const accumulated = Number(reward.accumulatedAmount);
        const claimed = Number(reward.claimedAmount || 0);
        totalClaimable += (accumulated - claimed);
      }

      if (totalClaimable <= 0) {
        return {
          success: false,
          claimedAmount: 0,
          error: "No rewards available to claim"
        };
      }

      // Prepare transaction data for KILT token transfer
      const transferData = {
        to: userAddress,
        amount: totalClaimable,
        tokenContract: "0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8", // KILT token address
        networkId: 8453, // Base network
        timestamp: new Date().toISOString()
      };

      // Update claimed amounts in database
      for (const reward of claimableRewards) {
        await this.db
          .update(rewards)
          .set({
            claimedAmount: reward.accumulatedAmount,
            claimedAt: new Date()
          })
          .where(eq(rewards.id, reward.id));
      }

      // Return transaction data for frontend to handle the actual token transfer
      // Frontend will use this data to prepare the transaction for user signing
      return {
        success: true,
        claimedAmount: totalClaimable,
        transactionData: transferData
      };

    } catch (error) {
      return {
        success: false,
        claimedAmount: 0,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Get reward history for a position
   */
  async getPositionRewardHistory(
    userId: number, 
    positionId: number, 
    days: number = 30
  ): Promise<DailyReward[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    return await this.db
      .select()
      .from(dailyRewards)
      .where(
        and(
          eq(dailyRewards.userId, userId),
          eq(dailyRewards.positionId, positionId),
          gte(dailyRewards.date, fromDate.toISOString().split('T')[0])
        )
      )
      .orderBy(desc(dailyRewards.date));
  }

  /**
   * Get total rewards statistics for a user
   */
  async getUserRewardStats(userId: number): Promise<{
    totalAccumulated: number;
    totalClaimed: number;
    totalClaimable: number;
    activePositions: number;
    avgDailyRewards: number;
  }> {
    const userRewards = await this.getUserRewards(userId);
    
    let totalAccumulated = 0;
    let totalClaimed = 0;
    let totalClaimable = 0;
    let activePositions = 0;

    for (const reward of userRewards) {
      const accumulated = Number(reward.accumulatedAmount);
      const claimed = Number(reward.claimedAmount || 0);
      
      totalAccumulated += accumulated;
      totalClaimed += claimed;
      
      if (reward.isEligibleForClaim && accumulated > claimed) {
        totalClaimable += (accumulated - claimed);
      }
      
      if (accumulated > 0) {
        activePositions++;
      }
    }

    // Calculate average daily rewards from recent 7 days
    const recentRewards = await this.db
      .select({
        avgDaily: sql<number>`AVG(CAST(${dailyRewards.dailyRewardAmount} AS DECIMAL))`
      })
      .from(dailyRewards)
      .where(
        and(
          eq(dailyRewards.userId, userId),
          gte(dailyRewards.date, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        )
      );

    const avgDailyRewards = recentRewards[0]?.avgDaily || 0;

    return {
      totalAccumulated,
      totalClaimed,
      totalClaimable,
      activePositions,
      avgDailyRewards
    };
  }

  /**
   * Get bonding curve analytics for the entire program
   */
  async getTop100RankingAnalytics(): Promise<{
    totalLiquidity: number;
    activeParticipants: number;
    top100Participants: number;
    estimatedAPR: { rank1: number; rank50: number; rank100: number };
    treasuryRemaining: number;
    daysRemaining: number;
    dailyDistribution: number;
  }> {
    const top100 = await this.getTop100Participants();
    const totalTop100Liquidity = await this.getTotalTop100Liquidity();
    
    // Calculate estimated APR for different ranks
    const typicalPositionValue = 10000; // $10,000 position
    const typicalDaysStaked = 180; // 6 months
    const liquidityShare = typicalPositionValue / (totalTop100Liquidity || 1);
    const timeFactor = Math.min(typicalDaysStaked / this.PROGRAM_DURATION_DAYS, 1);
    const baseComponent = (this.LIQUIDITY_WEIGHT * liquidityShare) + (this.TIME_WEIGHT * timeFactor);
    
    // Calculate APR for different ranks
    const rank1Multiplier = this.calculateRankMultiplier(1);
    const rank50Multiplier = this.calculateRankMultiplier(50);
    const rank100Multiplier = this.calculateRankMultiplier(100);
    
    const rank1DailyRewards = baseComponent * this.DAILY_BUDGET_PER_USER * rank1Multiplier;
    const rank50DailyRewards = baseComponent * this.DAILY_BUDGET_PER_USER * rank50Multiplier;
    const rank100DailyRewards = baseComponent * this.DAILY_BUDGET_PER_USER * rank100Multiplier;
    
    const estimatedAPR = {
      rank1: typicalPositionValue > 0 ? (rank1DailyRewards * 365 / typicalPositionValue) * 100 : 0,
      rank50: typicalPositionValue > 0 ? (rank50DailyRewards * 365 / typicalPositionValue) * 100 : 0,
      rank100: typicalPositionValue > 0 ? (rank100DailyRewards * 365 / typicalPositionValue) * 100 : 0
    };
    
    // Calculate treasury metrics
    const currentDate = new Date();
    const programStartDate = new Date('2025-07-09'); // Program start date from new specification
    const daysSinceStart = Math.max(0, Math.floor((currentDate.getTime() - programStartDate.getTime()) / (24 * 60 * 60 * 1000)));
    const distributedAmount = daysSinceStart * this.DAILY_BUDGET;
    const treasuryRemaining = Math.max(0, this.TREASURY_ALLOCATION - distributedAmount);
    const daysRemaining = Math.floor(treasuryRemaining / this.DAILY_BUDGET);
    
    return {
      totalLiquidity: totalTop100Liquidity,
      activeParticipants: top100.length,
      top100Participants: Math.min(top100.length, this.MAX_PARTICIPANTS),
      estimatedAPR,
      treasuryRemaining,
      daysRemaining,
      dailyDistribution: this.DAILY_BUDGET
    };
  }
}

export const rewardService = new RewardService(db);