import { db } from './db';
import { realTimePriceService } from './real-time-price-service';
import { uniswapIntegrationService } from './uniswap-integration-service';
import { 
  rewards, 
  lpPositions, 
  positionSnapshots,
  performanceMetrics,
  type Reward,
  type LpPosition 
} from '@shared/schema';
import { eq, sql, and, gte, desc } from 'drizzle-orm';

export interface AccurateRewardCalculation {
  positionId: number;
  nftTokenId: string;
  currentValueUSD: number;
  liquidityWeight: number;
  timeWeight: number;
  inRangeMultiplier: number;
  dailyRewardAmount: number;
  effectiveAPR: number;
  accumulatedRewards: number;
  daysActive: number;
  totalLiquidityShare: number;
  lastUpdateTimestamp: number;
}

export interface ProgramMetrics {
  totalActiveLiquidity: number;
  totalActiveParticipants: number;
  dailyBudget: number;
  dailyDistributed: number;
  programDaysRemaining: number;
  averageAPR: number;
}

export class AccurateRewardCalculator {
  // Program constants
  private readonly TREASURY_ALLOCATION = 2905600; // 1% of 290.56M KILT supply
  private readonly PROGRAM_DURATION_DAYS = 365;
  private readonly DAILY_BUDGET = this.TREASURY_ALLOCATION / this.PROGRAM_DURATION_DAYS;
  private readonly LIQUIDITY_WEIGHT = 0.6; // w1
  private readonly TIME_WEIGHT = 0.4; // w2
  private readonly MIN_POSITION_VALUE = 100; // Minimum $100 position

  constructor(private database: any) {}

  /**
   * Calculate accurate rewards for a position using real-time data
   */
  async calculateAccurateRewards(nftTokenId: string): Promise<AccurateRewardCalculation> {
    try {
      // Get position data from database
      const [position] = await this.database
        .select()
        .from(lpPositions)
        .where(eq(lpPositions.nftTokenId, nftTokenId))
        .limit(1);

      if (!position) {
        throw new Error(`Position not found for NFT token ID: ${nftTokenId}`);
      }

      // Get real-time position value
      const currentValueUSD = await this.calculateRealTimePositionValue(position);
      
      // Calculate days active
      const daysActive = this.calculateDaysActive(position.createdAt);
      
      // Get total active liquidity for proportional calculation
      const totalActiveLiquidity = await this.getTotalActiveLiquidity();
      
      // Calculate in-range multiplier
      const inRangeMultiplier = await this.calculateInRangeMultiplier(position);
      
      // Calculate liquidity weight (proportional to total liquidity)
      const liquidityWeight = currentValueUSD / totalActiveLiquidity;
      
      // Calculate time coefficient (60% to 100% liquidity recognition based on time)
      // Time coefficient ranges from 0.6 (day 1) to 1.0 (day 365)
      const timeCoefficient = 0.6 + (0.4 * Math.min(daysActive / this.PROGRAM_DURATION_DAYS, 1));
      
      // Calculate daily reward amount using MULTIPLICATIVE time factor:
      // R_u = (L_u/T_total) * timeCoefficient * R/365 * inRangeMultiplier
      // This prevents dust positions from dominating rewards
      const dailyRewardAmount = (
        liquidityWeight * 
        timeCoefficient * 
        this.DAILY_BUDGET * 
        inRangeMultiplier
      );
      
      // Calculate effective APR
      const effectiveAPR = currentValueUSD > 0 ? (dailyRewardAmount * 365) / currentValueUSD : 0;
      
      // Get accumulated rewards
      const accumulatedRewards = await this.getAccumulatedRewards(position.id);
      
      return {
        positionId: position.id,
        nftTokenId,
        currentValueUSD: Math.round(currentValueUSD * 100) / 100, // 2 decimal places
        liquidityWeight: Math.round(liquidityWeight * 10000) / 10000, // 4 decimal places
        timeWeight: Math.round(timeCoefficient * 10000) / 10000, // 4 decimal places
        inRangeMultiplier: Math.round(inRangeMultiplier * 10000) / 10000, // 4 decimal places
        dailyRewardAmount: Math.round(dailyRewardAmount * 10000) / 10000, // 4 decimal places
        effectiveAPR: Math.round(effectiveAPR * 10000) / 10000, // 4 decimal places
        accumulatedRewards: Math.round(accumulatedRewards * 10000) / 10000, // 4 decimal places
        daysActive,
        totalLiquidityShare: Math.round(liquidityWeight * 10000) / 10000, // 4 decimal places
        lastUpdateTimestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error calculating accurate rewards:', error);
      throw error;
    }
  }

  /**
   * Calculate real-time position value using live blockchain data
   */
  private async calculateRealTimePositionValue(position: LpPosition): Promise<number> {
    try {
      // Get live position data from Uniswap V3
      const livePosition = await uniswapIntegrationService.getPositionData(position.nftTokenId);
      
      if (!livePosition) {
        // Fallback to stored value if live data unavailable
        return parseFloat(position.currentValueUSD.toString());
      }

      // Calculate current value using real-time prices
      const currentValueUSD = await realTimePriceService.calculatePositionValueUSD(
        livePosition.token0Amount,
        livePosition.token1Amount,
        livePosition.token0,
        livePosition.token1
      );

      // Update stored value for future reference
      await this.database
        .update(lpPositions)
        .set({ currentValueUSD: currentValueUSD.toString() })
        .where(eq(lpPositions.id, position.id));

      return currentValueUSD;
    } catch (error) {
      console.error('Error calculating real-time position value:', error);
      // Return stored value as fallback
      return parseFloat(position.currentValueUSD.toString());
    }
  }

  /**
   * Calculate in-range multiplier using real-time pool data
   */
  private async calculateInRangeMultiplier(position: LpPosition): Promise<number> {
    try {
      // Check if position is full range
      const isFullRange = this.isFullRangePosition(
        parseFloat(position.minPrice.toString()),
        parseFloat(position.maxPrice.toString())
      );

      if (isFullRange) {
        return 1.0; // Full range positions always earn full rewards
      }

      // Get current pool state
      const poolData = await realTimePriceService.getPoolData(position.poolAddress);
      
      // Check if current tick is within position range
      const isInRange = poolData.tick >= position.tickLower && poolData.tick <= position.tickUpper;
      
      if (!isInRange) {
        return 0.0; // Out of range positions earn no rewards
      }

      // For in-range positions, check historical performance
      const timeInRangeRatio = await this.calculateTimeInRangeRatio(position.id);
      
      // Apply time-in-range multiplier
      return Math.max(0.1, timeInRangeRatio); // Minimum 10% for active positions
    } catch (error) {
      console.error('Error calculating in-range multiplier:', error);
      return 0.5; // Conservative fallback
    }
  }

  /**
   * Calculate time-in-range ratio from historical data
   */
  private async calculateTimeInRangeRatio(positionId: number): Promise<number> {
    try {
      // Get recent performance metrics (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const metrics = await this.database
        .select()
        .from(performanceMetrics)
        .where(
          and(
            eq(performanceMetrics.positionId, positionId),
            gte(performanceMetrics.date, thirtyDaysAgo.toISOString().split('T')[0])
          )
        )
        .orderBy(desc(performanceMetrics.date));

      if (metrics.length === 0) {
        return 1.0; // Assume full range if no data
      }

      // Calculate average time in range
      const totalTimeInRange = metrics.reduce((sum, metric) => {
        return sum + parseFloat(metric.timeInRange.toString());
      }, 0);

      return totalTimeInRange / metrics.length;
    } catch (error) {
      console.error('Error calculating time-in-range ratio:', error);
      return 1.0; // Conservative fallback
    }
  }

  /**
   * Get total active liquidity across all positions
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
      return 1; // Prevent division by zero
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
   * Calculate days active since position creation
   */
  private calculateDaysActive(createdAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Check if position is full range
   */
  private isFullRangePosition(minPrice: number, maxPrice: number): boolean {
    const FULL_RANGE_MIN = 0.0001;
    const FULL_RANGE_MAX = 1000000;
    return minPrice <= FULL_RANGE_MIN && maxPrice >= FULL_RANGE_MAX;
  }

  /**
   * Get program-wide metrics
   */
  async getProgramMetrics(): Promise<ProgramMetrics> {
    try {
      const totalActiveLiquidity = await this.getTotalActiveLiquidity();
      
      const totalActiveParticipants = await this.database
        .select({
          count: sql<number>`COUNT(DISTINCT ${lpPositions.userId})`,
        })
        .from(lpPositions)
        .where(
          and(
            eq(lpPositions.isActive, true),
            eq(lpPositions.rewardEligible, true)
          )
        );

      const dailyDistributed = await this.database
        .select({
          total: sql<number>`COALESCE(SUM(CAST(${rewards.dailyRewardAmount} AS DECIMAL)), 0)`,
        })
        .from(rewards)
        .where(
          sql`DATE(${rewards.lastRewardCalculation}) = CURRENT_DATE`
        );

      const programStartDate = new Date('2025-01-01'); // Adjust as needed
      const now = new Date();
      const daysElapsed = Math.floor((now.getTime() - programStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const programDaysRemaining = Math.max(0, this.PROGRAM_DURATION_DAYS - daysElapsed);

      const averageAPR = totalActiveLiquidity > 0 ? 
        (dailyDistributed[0]?.total || 0) * 365 / totalActiveLiquidity : 0;

      return {
        totalActiveLiquidity: Math.round(totalActiveLiquidity * 100) / 100, // 2 decimal places
        totalActiveParticipants: totalActiveParticipants[0]?.count || 0,
        dailyBudget: Math.round(this.DAILY_BUDGET * 100) / 100, // 2 decimal places
        dailyDistributed: Math.round((dailyDistributed[0]?.total || 0) * 10000) / 10000, // 4 decimal places
        programDaysRemaining,
        averageAPR: Math.round(averageAPR * 10000) / 10000, // 4 decimal places
      };
    } catch (error) {
      console.error('Error getting program metrics:', error);
      return {
        totalActiveLiquidity: 0,
        totalActiveParticipants: 0,
        dailyBudget: this.DAILY_BUDGET,
        dailyDistributed: 0,
        programDaysRemaining: this.PROGRAM_DURATION_DAYS,
        averageAPR: 0,
      };
    }
  }

  /**
   * Update all position rewards with accurate calculations
   */
  async updateAllPositionRewards(): Promise<void> {
    try {
      // Get all active positions
      const activePositions = await this.database
        .select()
        .from(lpPositions)
        .where(
          and(
            eq(lpPositions.isActive, true),
            eq(lpPositions.rewardEligible, true)
          )
        );

      // Process each position
      for (const position of activePositions) {
        try {
          const calculation = await this.calculateAccurateRewards(position.nftTokenId);
          
          // Update or create reward record
          await this.updateRewardRecord(position.id, calculation);
        } catch (error) {
          console.error(`Error updating rewards for position ${position.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error updating all position rewards:', error);
    }
  }

  /**
   * Update reward record in database
   */
  private async updateRewardRecord(positionId: number, calculation: AccurateRewardCalculation): Promise<void> {
    try {
      // Check if reward record exists
      const existingReward = await this.database
        .select()
        .from(rewards)
        .where(eq(rewards.positionId, positionId))
        .limit(1);

      if (existingReward.length > 0) {
        // Update existing record
        await this.database
          .update(rewards)
          .set({
            dailyRewardAmount: calculation.dailyRewardAmount.toString(),
            accumulatedAmount: calculation.accumulatedRewards.toString(),
            positionValueUSD: calculation.currentValueUSD.toString(),
            lastRewardCalculation: new Date(),
          })
          .where(eq(rewards.id, existingReward[0].id));
      } else {
        // Create new record
        await this.database
          .insert(rewards)
          .values({
            positionId,
            userId: existingReward[0]?.userId || 1, // This should be properly set
            nftTokenId: calculation.nftTokenId,
            positionValueUSD: calculation.currentValueUSD.toString(),
            dailyRewardAmount: calculation.dailyRewardAmount.toString(),
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
}

export const accurateRewardCalculator = new AccurateRewardCalculator(db);