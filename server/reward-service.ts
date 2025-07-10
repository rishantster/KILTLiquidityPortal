import { db } from './db';
import { smartContractService } from './smart-contract-service';
import { uniswapV3APRService } from './uniswap-v3-apr-service';
import { 
  rewards, 
  dailyRewards, 
  lpPositions, 
  users,
  positionSnapshots,
  performanceMetrics,
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
  tradingFeeAPR: number;
  incentiveAPR: number;
  totalAPR: number;
  dailyRewards: number;
  liquidityAmount: number;
  daysStaked: number;
  accumulatedRewards: number;
  canClaim: boolean;
  daysUntilClaim: number;
  rank: number | null;
  totalParticipants: number;
  aprBreakdown: {
    poolVolume24h: number;
    poolTVL: number;
    feeRate: number;
    liquidityShare: number;
    timeInRangeRatio: number;
    concentrationFactor: number;
    dailyFeeEarnings: number;
    dailyIncentiveRewards: number;
    isInRange: boolean;
  };
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

  // Open participation reward system parameters
  private readonly TREASURY_ALLOCATION = 2905600; // 1% of 290.56M KILT supply
  private readonly PROGRAM_DURATION_DAYS = 365; // 365 days program duration
  private readonly DAILY_BUDGET = this.TREASURY_ALLOCATION / this.PROGRAM_DURATION_DAYS; // ~7,960 KILT/day
  private readonly LOCK_PERIOD_DAYS = 90; // 90 days from liquidity addition
  private readonly MIN_POSITION_VALUE = 100; // Minimum $100 position
  
  // Liquidity + Duration Weighted Rule parameters
  private readonly LIQUIDITY_WEIGHT = 0.6; // w1 - weight for liquidity provided
  private readonly TIME_WEIGHT = 0.4; // w2 - weight for days active

  /**
   * Calculate proportional reward multiplier based on liquidity share
   * All participants get proportional rewards based on their liquidity contribution
   */
  private calculateProportionalMultiplier(userLiquidity: number, totalLiquidity: number): number {
    if (totalLiquidity === 0) return 0;
    return userLiquidity / totalLiquidity;
  }

  /**
   * Get in-range multiplier for position
   * Full range positions: Always 100% of rewards (they're always providing liquidity)
   * Concentrated positions: Based on time-in-range performance
   * Out-of-range positions: 0% of rewards
   */
  private async getInRangeMultiplier(nftTokenId: string): Promise<number> {
    try {
      // First, get the position details to check if it's full range
      const [position] = await this.db
        .select()
        .from(lpPositions)
        .where(eq(lpPositions.nftTokenId, nftTokenId))
        .limit(1);

      if (!position) {
        console.error(`Position not found for NFT ${nftTokenId}`);
        return 0.0;
      }

      const minPrice = parseFloat(position.minPrice);
      const maxPrice = parseFloat(position.maxPrice);
      
      // Check if this is a full range position (essentially infinite range)
      const FULL_RANGE_MIN = 0.0001; // Effectively 0
      const FULL_RANGE_MAX = 1000000; // Effectively infinite
      
      const isFullRange = minPrice <= FULL_RANGE_MIN && maxPrice >= FULL_RANGE_MAX;
      
      if (isFullRange) {
        // Full range positions always earn full rewards
        console.log(`Full range position ${nftTokenId} - 100% rewards`);
        return 1.0;
      }

      // For concentrated positions, check actual in-range performance
      const [performanceMetrics] = await this.db
        .select()
        .from(performanceMetrics)
        .where(eq(performanceMetrics.positionId, position.id))
        .orderBy(desc(performanceMetrics.date))
        .limit(1);

      if (!performanceMetrics) {
        // No performance data yet - check current price against range
        const currentPoolPrice = 0.0160; // Current KILT price in ETH (would get from live data)
        
        const isCurrentlyInRange = currentPoolPrice >= minPrice && currentPoolPrice <= maxPrice;
        
        if (isCurrentlyInRange) {
          console.log(`New concentrated position ${nftTokenId} currently in range - 100% rewards`);
          return 1.0;
        } else {
          console.log(`New concentrated position ${nftTokenId} currently out of range - 0% rewards`);
          return 0.0;
        }
      }

      // Use time-in-range ratio from performance metrics
      const timeInRangeRatio = parseFloat(performanceMetrics.timeInRangeRatio) / 100; // Convert percentage to decimal
      
      // Proportional rewards based on time in range
      // >90% time in range = full rewards
      // 10-90% time in range = proportional rewards
      // <10% time in range = no rewards
      let multiplier = 0.0;
      
      if (timeInRangeRatio >= 0.9) {
        multiplier = 1.0;
      } else if (timeInRangeRatio >= 0.1) {
        multiplier = timeInRangeRatio;
      } else {
        multiplier = 0.0;
      }
      
      console.log(`Concentrated position ${nftTokenId} - ${(timeInRangeRatio * 100).toFixed(1)}% time in range - ${(multiplier * 100).toFixed(1)}% rewards`);
      return multiplier;

    } catch (error) {
      console.error('Error calculating in-range multiplier:', error);
      // Default to full rewards on error to avoid penalizing legitimate positions
      return 1.0;
    }
  }

  /**
   * Calculate user's liquidity score for replacement mechanism
   * Formula: L_u * D_u (liquidity × days active)
   */
  private calculateLiquidityScore(liquidity: number, daysActive: number): number {
    return liquidity * daysActive;
  }

  /**
   * Get all active participants
   */
  private async getAllActiveParticipants(): Promise<any[]> {
    try {
      const positions = await this.db.select().from(lpPositions).where(eq(lpPositions.isActive, true));
      
      // Sort by liquidity value (descending)
      const sortedPositions = positions.sort((a, b) => Number(b.currentValueUSD || 0) - Number(a.currentValueUSD || 0));
      return sortedPositions;
    } catch (error) {
      console.error('Error getting active participants:', error);
      return [];
    }
  }

  /**
   * Get user's current ranking position
   */
  async getUserRanking(userId: number): Promise<{ rank: number | null, totalParticipants: number }> {
    try {
      const positions = await this.db.select().from(lpPositions).where(eq(lpPositions.isActive, true));
      
      // Sort by liquidity value (descending)
      const sortedPositions = positions.sort((a, b) => Number(b.currentValueUSD || 0) - Number(a.currentValueUSD || 0));
      
      // Find user's position
      const userPositionIndex = sortedPositions.findIndex(pos => pos.userId === userId);
      
      return {
        rank: userPositionIndex >= 0 ? userPositionIndex + 1 : null,
        totalParticipants: sortedPositions.length
      };
    } catch (error) {
      console.error('Error getting user ranking:', error);
      return { rank: null, totalParticipants: 0 };
    }
  }

  /**
   * Get total liquidity of all active participants
   */
  private async getTotalActiveLiquidity(): Promise<number> {
    const activePositions = await this.getAllActiveParticipants();
    return activePositions.reduce((sum, position) => sum + Number(position.currentValueUSD || 0), 0);
  }

  /**
   * All participants are eligible for rewards (no limits)
   */
  private async checkParticipantEligibility(liquidity: number, daysActive: number): Promise<{ eligible: boolean, rank?: number }> {
    // All participants with minimum position value are eligible
    if (liquidity >= this.MIN_POSITION_VALUE) {
      return { eligible: true };
    }
    
    return { eligible: false };
  }

  /**
   * Calculate rewards using proportional distribution system
   * Formula: R_u = (w1 * L_u/T_total + w2 * D_u/365) * R/365 * inRangeMultiplier
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
    
    // Check if position meets minimum requirements
    const eligibility = await this.checkParticipantEligibility(positionValueUSD, daysStaked);
    if (!eligibility.eligible) {
      return {
        baseAPR: 0,
        timeMultiplier: 0,
        sizeMultiplier: 0,
        effectiveAPR: 0,
        tradingFeeAPR: 0,
        incentiveAPR: 0,
        totalAPR: 0,
        dailyRewards: 0,
        liquidityAmount: positionValueUSD,
        daysStaked,
        accumulatedRewards: 0,
        canClaim: false,
        daysUntilClaim: Math.max(0, this.LOCK_PERIOD_DAYS - daysSinceLiquidity),
        rank: null,
        totalParticipants: 0,
        aprBreakdown: {
          poolVolume24h: 0,
          poolTVL: 0,
          feeRate: 0,
          liquidityShare: 0,
          timeInRangeRatio: 0,
          concentrationFactor: 1,
          dailyFeeEarnings: 0,
          dailyIncentiveRewards: 0,
          isInRange: false
        }
      };
    }
    
    // Get all participants and total liquidity
    const allParticipants = await this.getAllActiveParticipants();
    const totalActiveLiquidity = await this.getTotalActiveLiquidity();
    
    // Find user's ranking position
    const userRank = allParticipants.findIndex(pos => pos.userId === userId && pos.nftTokenId === nftTokenId) + 1;
    
    // Calculate proportional reward formula with in-range adjustment
    // R_u = (w1 * L_u/T_total + w2 * D_u/365) * R/365 * inRangeMultiplier
    let dailyRewards = 0;
    let effectiveAPR = 0;
    let tradingFeeAPR = 0;
    let incentiveAPR = 0;
    let totalAPR = 0;
    let aprBreakdown = {
      poolVolume24h: 0,
      poolTVL: 0,
      feeRate: 0.003,
      liquidityShare: 0,
      timeInRangeRatio: 0,
      concentrationFactor: 1,
      dailyFeeEarnings: 0,
      dailyIncentiveRewards: 0,
      isInRange: false
    };
    
    if (totalActiveLiquidity > 0 && positionValueUSD > 0) {
      const liquidityShare = positionValueUSD / totalActiveLiquidity;
      const timeFactor = Math.min(daysStaked / this.PROGRAM_DURATION_DAYS, 1);
      
      // Get in-range multiplier based on position's current range status
      const inRangeMultiplier = await this.getInRangeMultiplier(nftTokenId);
      
      // Calculate base component: w1 * L_u/T_total + w2 * D_u/365
      const baseComponent = (this.LIQUIDITY_WEIGHT * liquidityShare) + (this.TIME_WEIGHT * timeFactor);
      
      // Calculate daily rewards using proportional distribution with in-range adjustment
      // R_u = base_component * R/365 * inRangeMultiplier
      dailyRewards = baseComponent * this.DAILY_BUDGET * inRangeMultiplier;
      
      // Calculate incentive APR based on daily rewards with reasonable caps
      const annualRewards = dailyRewards * 365;
      incentiveAPR = Math.min(200, (annualRewards / positionValueUSD) * 100); // Cap at 200% APR
      
      // Get position details for full APR calculation
      const [position] = await this.db.select().from(lpPositions).where(eq(lpPositions.nftTokenId, nftTokenId)).limit(1);
      
      if (position) {
        try {
          // Calculate full Uniswap V3 APR (Trading Fees + Incentives)
          const fullAPR = await uniswapV3APRService.calculateFullUniswapV3APR(
            position.id,
            userId,
            nftTokenId,
            positionValueUSD,
            Number(position.minPrice),
            Number(position.maxPrice),
            0.003, // 0.3% fee tier for KILT/ETH
            incentiveAPR,
            dailyRewards
          );
          
          tradingFeeAPR = fullAPR.tradingFeeAPR;
          totalAPR = fullAPR.totalAPR;
          aprBreakdown = {
            poolVolume24h: fullAPR.breakdown.poolVolume24h,
            poolTVL: fullAPR.breakdown.poolTVL,
            feeRate: fullAPR.breakdown.feeRate,
            liquidityShare: fullAPR.breakdown.liquidityShare,
            timeInRangeRatio: fullAPR.breakdown.timeInRangeRatio,
            concentrationFactor: fullAPR.breakdown.concentrationFactor,
            dailyFeeEarnings: fullAPR.breakdown.dailyFeeEarnings,
            dailyIncentiveRewards: fullAPR.breakdown.dailyIncentiveRewards,
            isInRange: fullAPR.breakdown.isInRange
          };
        } catch (error) {
          console.error('Error calculating full APR:', error);
          // Fall back to incentive APR only
          tradingFeeAPR = 0;
          totalAPR = incentiveAPR;
        }
      } else {
        // If no position found, use incentive APR only
        totalAPR = incentiveAPR;
      }
      
      effectiveAPR = totalAPR;
    }
    
    // Get accumulated rewards
    const accumulatedRewards = existingReward ? Number(existingReward.accumulatedAmount) : 0;
    
    // Check if eligible for claiming (90 day lock from liquidity addition)
    const canClaim = daysSinceLiquidity >= this.LOCK_PERIOD_DAYS;
    const daysUntilClaim = Math.max(0, this.LOCK_PERIOD_DAYS - daysSinceLiquidity);

    return {
      baseAPR: effectiveAPR, // Now calculated from proportional system
      timeMultiplier: timeFactor, // Now 0-1 normalized time factor
      sizeMultiplier: liquidityShare, // Now liquidity share multiplier
      effectiveAPR,
      tradingFeeAPR,
      incentiveAPR,
      totalAPR,
      dailyRewards,
      liquidityAmount: positionValueUSD,
      daysStaked,
      accumulatedRewards,
      canClaim,
      daysUntilClaim,
      rank: userRank || null,
      totalParticipants: allParticipants.length,
      aprBreakdown
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

      // Get NFT token IDs for smart contract claim
      const nftTokenIds = claimableRewards.map(reward => reward.nftTokenId);
      
      // If smart contract is available, use it for claiming
      if (smartContractService.isContractAvailable()) {
        const claimResult = await smartContractService.executeClaimRewards(
          userAddress,
          nftTokenIds
        );
        
        if (claimResult.success) {
          return {
            success: true,
            claimedAmount: claimResult.claimedAmount || 0,
            transactionHash: claimResult.txHash,
            transactionData: {
              to: userAddress,
              amount: claimResult.claimedAmount || 0,
              tokenContract: "0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8",
              networkId: 8453,
              timestamp: new Date().toISOString()
            }
          };
        } else {
          return {
            success: false,
            claimedAmount: 0,
            error: claimResult.error || "Smart contract claim failed"
          };
        }
      } else {
        // Fallback to database-only implementation
        return {
          success: true,
          claimedAmount: totalClaimable,
          transactionData: transferData
        };
      }

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
   * Get claimable rewards for a user
   */
  async getClaimableRewards(userId: number): Promise<{
    totalClaimable: number;
    positions: any[];
    canClaim: boolean;
    nextClaimDate: Date | null;
  }> {
    try {
      const userRewards = await this.getUserRewards(userId);
      
      let totalClaimable = 0;
      let positions = [];
      let canClaim = false;
      let nextClaimDate = null;
      
      for (const reward of userRewards) {
        const accumulated = Number(reward.accumulatedAmount);
        const claimed = Number(reward.claimedAmount || 0);
        const claimable = Math.max(0, accumulated - claimed);
        
        if (claimable > 0 && reward.isEligibleForClaim) {
          totalClaimable += claimable;
          canClaim = true;
          
          positions.push({
            positionId: reward.positionId,
            nftTokenId: reward.nftTokenId,
            claimableAmount: claimable,
            liquidityAddedAt: reward.liquidityAddedAt,
            stakingStartDate: reward.stakingStartDate
          });
        }
        
        // Calculate next claim date if not yet eligible
        if (!reward.isEligibleForClaim && accumulated > claimed) {
          const liquidityDate = new Date(reward.liquidityAddedAt);
          const claimDate = new Date(liquidityDate.getTime() + (this.LOCK_PERIOD_DAYS * 24 * 60 * 60 * 1000));
          
          if (!nextClaimDate || claimDate < nextClaimDate) {
            nextClaimDate = claimDate;
          }
        }
      }
      
      return {
        totalClaimable,
        positions,
        canClaim,
        nextClaimDate
      };
    } catch (error) {
      console.error('Error getting claimable rewards:', error);
      return {
        totalClaimable: 0,
        positions: [],
        canClaim: false,
        nextClaimDate: null
      };
    }
  }

  /**
   * Get Top 100 ranking analytics for the entire program
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
    
    // If no liquidity exists, use conservative baseline estimates
    let estimatedAPR = {
      rank1: 0,
      rank50: 0,
      rank100: 0
    };
    
    if (totalTop100Liquidity > 0) {
      const liquidityShare = typicalPositionValue / totalTop100Liquidity;
      const timeFactor = Math.min(typicalDaysStaked / this.PROGRAM_DURATION_DAYS, 1);
      const baseComponent = (this.LIQUIDITY_WEIGHT * liquidityShare) + (this.TIME_WEIGHT * timeFactor);
      
      // Calculate APR for different ranks
      const rank1Multiplier = this.calculateRankMultiplier(1);
      const rank50Multiplier = this.calculateRankMultiplier(50);
      const rank100Multiplier = this.calculateRankMultiplier(100);
      
      const rank1DailyRewards = baseComponent * this.DAILY_BUDGET_PER_USER * rank1Multiplier;
      const rank50DailyRewards = baseComponent * this.DAILY_BUDGET_PER_USER * rank50Multiplier;
      const rank100DailyRewards = baseComponent * this.DAILY_BUDGET_PER_USER * rank100Multiplier;
      
      estimatedAPR = {
        rank1: Math.min(66, (rank1DailyRewards * 365 / typicalPositionValue) * 100),
        rank50: Math.min(33, (rank50DailyRewards * 365 / typicalPositionValue) * 100),
        rank100: Math.min(0.66, (rank100DailyRewards * 365 / typicalPositionValue) * 100)
      };
    } else {
      // Use theoretical maximum APR based on full treasury allocation
      estimatedAPR = {
        rank1: 66.0,  // Maximum 66% APR for rank 1
        rank50: 33.0, // Maximum 33% APR for rank 50
        rank100: 0.66 // Maximum 0.66% APR for rank 100
      };
    }
    
    // Calculate treasury metrics - fallback to default if smart contract fails
    let treasuryRemaining = this.TREASURY_ALLOCATION;
    let daysRemaining = this.PROGRAM_DURATION_DAYS;
    
    try {
      const rewardWalletBalance = await smartContractService.checkRewardWalletBalance();
      treasuryRemaining = rewardWalletBalance.balance || this.TREASURY_ALLOCATION;
      daysRemaining = Math.floor(treasuryRemaining / this.DAILY_BUDGET);
    } catch (error) {
      console.error('Error getting treasury balance:', error);
      // Use default values
    }
    
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

  /**
   * Get program analytics for open participation system
   */
  async getProgramAnalytics(): Promise<{
    totalLiquidity: number;
    activeParticipants: number;
    estimatedAPR: { low: number; average: number; high: number };
    treasuryRemaining: number;
    avgUserLiquidity: number;
  }> {
    try {
      const allParticipants = await this.getAllActiveParticipants();
      const totalLiquidity = await this.getTotalActiveLiquidity();
      
      // Calculate estimated APR ranges based on liquidity share
      const estimatedAPR = {
        low: 5,     // 5% APR for small positions
        average: 15, // 15% APR for average positions
        high: 50    // 50% APR for large positions
      };
      
      return {
        totalLiquidity,
        activeParticipants: allParticipants.length,
        estimatedAPR,
        treasuryRemaining: this.TREASURY_ALLOCATION,
        avgUserLiquidity: allParticipants.length > 0 ? totalLiquidity / allParticipants.length : 0
      };
    } catch (error) {
      console.error('Error getting program analytics:', error);
      return {
        totalLiquidity: 0,
        activeParticipants: 0,
        estimatedAPR: { low: 5, average: 15, high: 50 },
        treasuryRemaining: this.TREASURY_ALLOCATION,
        avgUserLiquidity: 0
      };
    }
  }
}

export const rewardService = new RewardService(db);