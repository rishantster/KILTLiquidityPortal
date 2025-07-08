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

  // Bonding curve reward parameters
  private readonly TREASURY_ALLOCATION = 2905600; // 1% of 290.56M KILT supply
  private readonly PROGRAM_DURATION_DAYS = 365; // 365 days program duration
  private readonly DAILY_BUDGET = this.TREASURY_ALLOCATION / this.PROGRAM_DURATION_DAYS; // ~7,960 KILT/day
  private readonly LOCK_PERIOD_DAYS = 90; // 90 days from liquidity addition
  private readonly MIN_POSITION_VALUE = 100; // Minimum $100 position
  
  // Bonding curve parameters
  private readonly LIQUIDITY_WEIGHT = 0.6; // w1 - weight for liquidity provided
  private readonly TIME_WEIGHT = 0.4; // w2 - weight for days active
  private readonly BONDING_CURVE_K = 50; // k - bonding curve constant (adjustable)

  /**
   * Calculate bonding curve factor based on number of active users
   * Formula: k / (N + k) where N = number of active users
   */
  private calculateBondingCurveFactor(activeUsers: number): number {
    return this.BONDING_CURVE_K / (activeUsers + this.BONDING_CURVE_K);
  }

  /**
   * Calculate user's share of total liquidity
   */
  private calculateLiquidityShare(userLiquidity: number, totalLiquidity: number): number {
    if (totalLiquidity === 0) return 0;
    return userLiquidity / totalLiquidity;
  }

  /**
   * Calculate time factor based on days active (normalized to 0-1)
   */
  private calculateTimeFactor(daysActive: number): number {
    return Math.min(daysActive / this.PROGRAM_DURATION_DAYS, 1.0);
  }

  /**
   * Get total liquidity across all active positions
   */
  private async getTotalLiquidity(): Promise<number> {
    const result = await this.db.select({
      totalLiquidity: sum(lpPositions.currentValueUSD)
    }).from(lpPositions)
    .where(eq(lpPositions.isActive, true));
    
    return Number(result[0]?.totalLiquidity || 0);
  }

  /**
   * Get number of active users in the program
   */
  private async getActiveUserCount(): Promise<number> {
    const result = await this.db.select({
      count: sql<number>`count(distinct ${lpPositions.userId})`
    }).from(lpPositions)
    .where(eq(lpPositions.isActive, true));
    
    return Number(result[0]?.count || 0);
  }

  /**
   * Calculate rewards using bonding curve formula
   * Formula: R_u = (w1 * L_u/T + w2 * D_u/365) * R/365 * k/(N+k)
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
    
    // Get pool-wide metrics for bonding curve calculation
    const totalLiquidity = await this.getTotalLiquidity();
    const activeUsers = await this.getActiveUserCount();
    
    // Calculate bonding curve components
    const liquidityShare = this.calculateLiquidityShare(positionValueUSD, totalLiquidity);
    const timeFactor = this.calculateTimeFactor(daysStaked);
    const bondingCurveFactor = this.calculateBondingCurveFactor(activeUsers);
    
    // Calculate base component: w1 * L_u/T + w2 * D_u/365
    const baseComponent = (this.LIQUIDITY_WEIGHT * liquidityShare) + (this.TIME_WEIGHT * timeFactor);
    
    // Calculate daily rewards using bonding curve formula
    // R_u = base_component * (R/365) * k/(N+k)
    const dailyRewards = baseComponent * this.DAILY_BUDGET * bondingCurveFactor;
    
    // Calculate effective APR based on daily rewards
    const annualRewards = dailyRewards * 365;
    const effectiveAPR = positionValueUSD > 0 ? (annualRewards / positionValueUSD) * 100 : 0;
    
    // Get accumulated rewards
    const accumulatedRewards = existingReward ? Number(existingReward.accumulatedAmount) : 0;
    
    // Check if eligible for claiming (90 day lock from liquidity addition)
    const canClaim = daysSinceLiquidity >= this.LOCK_PERIOD_DAYS;
    const daysUntilClaim = Math.max(0, this.LOCK_PERIOD_DAYS - daysSinceLiquidity);

    return {
      baseAPR: effectiveAPR, // Now calculated from bonding curve
      timeMultiplier: timeFactor, // Now 0-1 normalized time factor
      sizeMultiplier: bondingCurveFactor, // Now bonding curve factor
      effectiveAPR,
      dailyRewards,
      liquidityAmount: positionValueUSD,
      daysStaked,
      accumulatedRewards,
      canClaim,
      daysUntilClaim
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
  async getBondingCurveAnalytics(): Promise<{
    totalLiquidity: number;
    activeUsers: number;
    bondingCurveFactor: number;
    dailyBudget: number;
    estimatedAPR: number;
    treasuryRemaining: number;
    daysRemaining: number;
    bondingCurveK: number;
  }> {
    const totalLiquidity = await this.getTotalLiquidity();
    const activeUsers = await this.getActiveUserCount();
    const bondingCurveFactor = this.calculateBondingCurveFactor(activeUsers);
    
    // Calculate estimated APR for average position
    const avgPositionValue = activeUsers > 0 ? totalLiquidity / activeUsers : 0;
    const avgLiquidityShare = activeUsers > 0 ? 1 / activeUsers : 0;
    const avgTimeFactor = 0.5; // Assume average 6 months staking
    const avgBaseComponent = (this.LIQUIDITY_WEIGHT * avgLiquidityShare) + (this.TIME_WEIGHT * avgTimeFactor);
    const avgDailyRewards = avgBaseComponent * this.DAILY_BUDGET * bondingCurveFactor;
    const estimatedAPR = avgPositionValue > 0 ? (avgDailyRewards * 365 / avgPositionValue) * 100 : 0;
    
    // Calculate treasury status
    const dailyDistribution = this.DAILY_BUDGET * bondingCurveFactor;
    const treasuryRemaining = this.TREASURY_ALLOCATION - (dailyDistribution * 30); // Rough estimate
    const daysRemaining = dailyDistribution > 0 ? Math.floor(treasuryRemaining / dailyDistribution) : this.PROGRAM_DURATION_DAYS;
    
    return {
      totalLiquidity,
      activeUsers,
      bondingCurveFactor,
      dailyBudget: this.DAILY_BUDGET,
      estimatedAPR,
      treasuryRemaining,
      daysRemaining,
      bondingCurveK: this.BONDING_CURVE_K
    };
  }
}

export const rewardService = new RewardService(db);