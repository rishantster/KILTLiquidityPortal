import { db } from './db';
import { realTimePriceService } from './real-time-price-service';
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

export class FixedRewardService {
  constructor(private database: any) {}

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
   */
  private calculateProportionalMultiplier(userLiquidity: number, totalLiquidity: number): number {
    if (totalLiquidity === 0) return 0;
    return userLiquidity / totalLiquidity;
  }

  /**
   * Get in-range multiplier for position using correct column names
   */
  private async getInRangeMultiplier(nftTokenId: string): Promise<number> {
    try {
      // Get the position details to check if it's full range
      const [position] = await this.database
        .select()
        .from(lpPositions)
        .where(eq(lpPositions.nftTokenId, nftTokenId))
        .limit(1);

      if (!position) {
        return 0.0;
      }

      const minPrice = parseFloat(position.minPrice?.toString() || '0');
      const maxPrice = parseFloat(position.maxPrice?.toString() || '0');
      
      // Check if this is a full range position
      const FULL_RANGE_MIN = 0.0001; 
      const FULL_RANGE_MAX = 1000000;
      
      const isFullRange = minPrice <= FULL_RANGE_MIN && maxPrice >= FULL_RANGE_MAX;
      
      if (isFullRange) {
        return 1.0;
      }

      // For concentrated positions, check actual in-range performance
      const [performanceData] = await this.database
        .select()
        .from(performanceMetrics)
        .where(eq(performanceMetrics.positionId, position.id))
        .orderBy(desc(performanceMetrics.date))
        .limit(1);

      if (performanceData && performanceData.timeInRange) {
        const timeInRange = parseFloat(performanceData.timeInRange.toString());
        return Math.max(0.1, timeInRange); // Minimum 10% for concentrated positions
      }

      // Default to 50% for concentrated positions without performance data
      return 0.5;
    } catch (error) {
      console.error('Error calculating in-range multiplier:', error);
      return 0.5;
    }
  }

  /**
   * Get all active participants using correct column names
   */
  private async getAllActiveParticipants(): Promise<any[]> {
    try {
      const participants = await this.database
        .select({
          userId: lpPositions.userId,
          nftTokenId: lpPositions.nftTokenId,
          positionValueUSD: lpPositions.currentValueUSD,
          liquidity: lpPositions.liquidity,
          createdAt: lpPositions.createdAt,
        })
        .from(lpPositions)
        .where(
          and(
            eq(lpPositions.isActive, true),
            eq(lpPositions.rewardEligible, true)
          )
        );

      return participants;
    } catch (error) {
      console.error('Error getting active participants:', error);
      return [];
    }
  }

  /**
   * Get total active liquidity using correct column names
   */
  private async getTotalActiveLiquidity(): Promise<number> {
    try {
      const result = await this.database
        .select({
          totalLiquidity: sql<number>`COALESCE(SUM(CAST(${lpPositions.currentValueUSD} AS DECIMAL)), 0)`,
        })
        .from(lpPositions)
        .where(
          and(
            eq(lpPositions.isActive, true),
            eq(lpPositions.rewardEligible, true)
          )
        );

      return result[0]?.totalLiquidity || 0;
    } catch (error) {
      console.error('Error getting total active liquidity:', error);
      return 0;
    }
  }

  /**
   * Calculate rewards using proportional distribution system with accurate real-time data
   */
  async calculatePositionRewards(
    userId: number,
    nftTokenId: string,
    liquidityAddedAt?: Date,
    stakingStartDate?: Date
  ): Promise<RewardCalculationResult> {
    try {
      // Get position data
      const [position] = await this.database
        .select()
        .from(lpPositions)
        .where(
          and(
            eq(lpPositions.userId, userId),
            eq(lpPositions.nftTokenId, nftTokenId)
          )
        )
        .limit(1);

      if (!position) {
        throw new Error('Position not found');
      }

      // Get real-time position value
      const currentValueUSD = await this.calculateRealTimePositionValue(position);
      
      // Get program metrics
      const totalActiveLiquidity = await this.getTotalActiveLiquidity();
      const activeParticipants = await this.getAllActiveParticipants();
      
      // Calculate days active
      const createdDate = liquidityAddedAt || position.createdAt;
      const now = new Date();
      const daysActive = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate weights
      const liquidityWeight = totalActiveLiquidity > 0 ? currentValueUSD / totalActiveLiquidity : 0;
      const timeWeight = Math.min(daysActive / this.PROGRAM_DURATION_DAYS, 1);
      
      // Get in-range multiplier
      const inRangeMultiplier = await this.getInRangeMultiplier(nftTokenId);
      
      // Calculate daily rewards using the formula:
      // R_u = (w1 * L_u/T_total + w2 * D_u/365) * R/365 * inRangeMultiplier
      const dailyRewards = (
        (this.LIQUIDITY_WEIGHT * liquidityWeight + this.TIME_WEIGHT * timeWeight) * 
        this.DAILY_BUDGET * 
        inRangeMultiplier
      );
      
      // Calculate effective APR
      const effectiveAPR = currentValueUSD > 0 ? (dailyRewards * 365) / currentValueUSD : 0;
      
      // Get accumulated rewards
      const accumulatedRewards = await this.getAccumulatedRewards(position.id);
      
      // Calculate claim eligibility
      const canClaim = daysActive >= this.LOCK_PERIOD_DAYS;
      const daysUntilClaim = Math.max(0, this.LOCK_PERIOD_DAYS - daysActive);
      
      return {
        baseAPR: effectiveAPR,
        timeMultiplier: timeWeight,
        sizeMultiplier: liquidityWeight,
        effectiveAPR,
        tradingFeeAPR: 0, // Placeholder - would need pool-specific calculation
        incentiveAPR: effectiveAPR,
        totalAPR: effectiveAPR,
        dailyRewards,
        liquidityAmount: parseFloat(position.liquidity?.toString() || '0'),
        daysStaked: daysActive,
        accumulatedRewards,
        canClaim,
        daysUntilClaim,
        rank: null, // No ranking in open participation system
        totalParticipants: activeParticipants.length,
        aprBreakdown: {
          poolVolume24h: 0,
          poolTVL: totalActiveLiquidity,
          feeRate: 0,
          liquidityShare: liquidityWeight,
          timeInRangeRatio: inRangeMultiplier,
          concentrationFactor: 1,
          dailyFeeEarnings: 0,
          dailyIncentiveRewards: dailyRewards,
          isInRange: inRangeMultiplier > 0,
        },
      };
    } catch (error) {
      console.error('Error calculating position rewards:', error);
      throw error;
    }
  }

  /**
   * Calculate real-time position value
   */
  private async calculateRealTimePositionValue(position: any): Promise<number> {
    try {
      // Use current stored value, enhanced with real-time price data when available
      const storedValue = parseFloat(position.currentValueUSD?.toString() || '0');
      
      // If we have token amounts, calculate with real-time prices
      if (position.token0Amount && position.token1Amount && position.token0Address && position.token1Address) {
        const realTimeValue = await realTimePriceService.calculatePositionValueUSD(
          position.token0Amount.toString(),
          position.token1Amount.toString(),
          position.token0Address,
          position.token1Address
        );
        
        // Update stored value
        await this.database
          .update(lpPositions)
          .set({ currentValueUSD: realTimeValue.toString() })
          .where(eq(lpPositions.id, position.id));
          
        return realTimeValue;
      }
      
      return storedValue;
    } catch (error) {
      console.error('Error calculating real-time position value:', error);
      return parseFloat(position.currentValueUSD?.toString() || '0');
    }
  }

  /**
   * Get accumulated rewards for a position
   */
  private async getAccumulatedRewards(positionId: number): Promise<number> {
    try {
      const result = await this.database
        .select({
          totalAccumulated: sql<number>`COALESCE(SUM(CAST(${rewards.accumulatedAmount} AS DECIMAL)), 0)`,
        })
        .from(rewards)
        .where(eq(rewards.positionId, positionId));

      return result[0]?.totalAccumulated || 0;
    } catch (error) {
      console.error('Error getting accumulated rewards:', error);
      return 0;
    }
  }

  /**
   * Get program analytics for open participation system
   */
  async getProgramAnalytics(): Promise<{
    totalLiquidity: number;
    activeParticipants: number;
    dailyBudget: number;
    averageAPR: number;
    programDaysRemaining: number;
    totalDistributed: number;
  }> {
    try {
      const totalLiquidity = await this.getTotalActiveLiquidity();
      const activeParticipants = await this.getAllActiveParticipants();
      
      // Calculate total distributed rewards
      const totalDistributedResult = await this.database
        .select({
          totalDistributed: sql<number>`COALESCE(SUM(CAST(${rewards.accumulatedAmount} AS DECIMAL)), 0)`,
        })
        .from(rewards);

      const totalDistributed = totalDistributedResult[0]?.totalDistributed || 0;
      
      // Calculate average APR
      const averageAPR = totalLiquidity > 0 ? (this.DAILY_BUDGET * 365) / totalLiquidity : 0;
      
      // Calculate program days remaining
      const programStartDate = new Date('2025-01-01'); // Adjust as needed
      const now = new Date();
      const daysElapsed = Math.floor((now.getTime() - programStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const programDaysRemaining = Math.max(0, this.PROGRAM_DURATION_DAYS - daysElapsed);

      return {
        totalLiquidity,
        activeParticipants: activeParticipants.length,
        dailyBudget: this.DAILY_BUDGET,
        averageAPR,
        programDaysRemaining,
        totalDistributed,
      };
    } catch (error) {
      console.error('Error getting program analytics:', error);
      return {
        totalLiquidity: 0,
        activeParticipants: 0,
        dailyBudget: this.DAILY_BUDGET,
        averageAPR: 0,
        programDaysRemaining: this.PROGRAM_DURATION_DAYS,
        totalDistributed: 0,
      };
    }
  }

  /**
   * Update daily rewards for all active positions
   */
  async updateDailyRewards(): Promise<void> {
    try {
      const activeParticipants = await this.getAllActiveParticipants();
      
      for (const participant of activeParticipants) {
        try {
          const rewardCalculation = await this.calculatePositionRewards(
            participant.userId,
            participant.nftTokenId
          );
          
          // Update or create reward record
          await this.updateRewardRecord(participant.userId, participant.nftTokenId, rewardCalculation);
        } catch (error) {
          console.error(`Error updating rewards for participant ${participant.userId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error updating daily rewards:', error);
    }
  }

  /**
   * Update reward record in database
   */
  private async updateRewardRecord(userId: number, nftTokenId: string, calculation: RewardCalculationResult): Promise<void> {
    try {
      // Get position ID
      const [position] = await this.database
        .select()
        .from(lpPositions)
        .where(
          and(
            eq(lpPositions.userId, userId),
            eq(lpPositions.nftTokenId, nftTokenId)
          )
        )
        .limit(1);

      if (!position) {
        throw new Error('Position not found');
      }

      // Check if reward record exists
      const existingReward = await this.database
        .select()
        .from(rewards)
        .where(eq(rewards.positionId, position.id))
        .limit(1);

      if (existingReward.length > 0) {
        // Update existing record
        await this.database
          .update(rewards)
          .set({
            dailyRewardAmount: calculation.dailyRewards.toString(),
            accumulatedAmount: calculation.accumulatedRewards.toString(),
            positionValueUSD: calculation.liquidityAmount.toString(),
            lastRewardCalculation: new Date(),
          })
          .where(eq(rewards.id, existingReward[0].id));
      } else {
        // Create new record
        await this.database
          .insert(rewards)
          .values({
            userId,
            positionId: position.id,
            nftTokenId,
            positionValueUSD: calculation.liquidityAmount.toString(),
            dailyRewardAmount: calculation.dailyRewards.toString(),
            accumulatedAmount: calculation.accumulatedRewards.toString(),
            liquidityAddedAt: new Date(),
            stakingStartDate: new Date(),
            lastRewardCalculation: new Date(),
          });
      }
    } catch (error) {
      console.error('Error updating reward record:', error);
    }
  }

  /**
   * Get user rewards
   */
  async getUserRewards(userId: number): Promise<Reward[]> {
    try {
      return await this.database
        .select()
        .from(rewards)
        .where(eq(rewards.userId, userId));
    } catch (error) {
      console.error('Error getting user rewards:', error);
      return [];
    }
  }

  /**
   * Get user reward statistics
   */
  async getUserRewardStats(userId: number): Promise<{
    totalAccumulated: number;
    totalClaimable: number;
    totalClaimed: number;
    activePositions: number;
  }> {
    try {
      const stats = await this.database
        .select({
          totalAccumulated: sql<number>`COALESCE(SUM(CAST(${rewards.accumulatedAmount} AS DECIMAL)), 0)`,
          totalClaimable: sql<number>`COALESCE(SUM(CASE WHEN ${rewards.isEligibleForClaim} = true THEN CAST(${rewards.accumulatedAmount} AS DECIMAL) - CAST(${rewards.claimedAmount} AS DECIMAL) ELSE 0 END), 0)`,
          totalClaimed: sql<number>`COALESCE(SUM(CAST(${rewards.claimedAmount} AS DECIMAL)), 0)`,
          activePositions: sql<number>`COUNT(*)`,
        })
        .from(rewards)
        .where(eq(rewards.userId, userId));

      return stats[0] || {
        totalAccumulated: 0,
        totalClaimable: 0,
        totalClaimed: 0,
        activePositions: 0,
      };
    } catch (error) {
      console.error('Error getting user reward stats:', error);
      return {
        totalAccumulated: 0,
        totalClaimable: 0,
        totalClaimed: 0,
        activePositions: 0,
      };
    }
  }
}

export const fixedRewardService = new FixedRewardService(db);