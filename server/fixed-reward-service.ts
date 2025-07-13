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
  private readonly LOCK_PERIOD_DAYS = 7; // 7 days from liquidity addition
  private readonly MIN_POSITION_VALUE = 0; // No minimum position value - any position with value > $0 is eligible
  
  // Multiplicative Time Coefficient parameters
  private readonly MIN_TIME_COEFFICIENT = 0.6; // Minimum 60% liquidity recognition on day 1
  private readonly MAX_TIME_COEFFICIENT = 1.0; // Maximum 100% liquidity recognition on day 365

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
      
      // Calculate liquidity weight (proportional to total liquidity)
      const liquidityWeight = totalActiveLiquidity > 0 ? currentValueUSD / totalActiveLiquidity : 0;
      
      // Calculate time-weighted coefficient using improved formula:
      // R_u = (L_u/L_T) * (w1 + (D_u/365)*(1-w1)) * R/365 * IRM
      // Where w1 is minimum recognition (0.6) and grows to 1.0 over time
      const w1 = this.MIN_TIME_COEFFICIENT; // 0.6
      const timeRatio = Math.min(daysActive / this.PROGRAM_DURATION_DAYS, 1);
      const timeWeightedCoefficient = w1 + (timeRatio * (1 - w1));
      
      // Get in-range multiplier
      const inRangeMultiplier = await this.getInRangeMultiplier(nftTokenId);
      
      // Calculate daily rewards using improved formula:
      // R_u = (L_u/L_T) * (w1 + (D_u/365)*(1-w1)) * R/365 * IRM
      const dailyRewards = (
        liquidityWeight * 
        timeWeightedCoefficient * 
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
        baseAPR: Math.round(effectiveAPR * 10000) / 10000, // 4 decimal places for APR
        timeMultiplier: Math.round(timeWeightedCoefficient * 10000) / 10000, // 4 decimal places
        sizeMultiplier: Math.round(liquidityWeight * 10000) / 10000, // 4 decimal places
        effectiveAPR: Math.round(effectiveAPR * 10000) / 10000, // 4 decimal places for APR
        tradingFeeAPR: 0,
        incentiveAPR: Math.round(effectiveAPR * 10000) / 10000, // 4 decimal places for APR
        totalAPR: Math.round(effectiveAPR * 10000) / 10000, // 4 decimal places for APR
        dailyRewards: Math.round(dailyRewards * 10000) / 10000, // 4 decimal places
        liquidityAmount: Math.round(parseFloat(position.liquidity?.toString() || '0') * 100) / 100, // 2 decimal places
        daysStaked: daysActive,
        accumulatedRewards: Math.round(accumulatedRewards * 10000) / 10000, // 4 decimal places
        canClaim,
        daysUntilClaim,
        rank: null,
        totalParticipants: activeParticipants.length,
        aprBreakdown: {
          poolVolume24h: 0,
          poolTVL: Math.round(totalActiveLiquidity * 100) / 100, // 2 decimal places
          feeRate: 0,
          liquidityShare: Math.round(liquidityWeight * 10000) / 10000, // 4 decimal places
          timeInRangeRatio: Math.round(inRangeMultiplier * 10000) / 10000, // 4 decimal places
          concentrationFactor: 1,
          dailyFeeEarnings: 0,
          dailyIncentiveRewards: Math.round(dailyRewards * 10000) / 10000, // 4 decimal places
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
   * Calculate APR range showing both practical and theoretical maximums
   * Shows realistic range users can expect in actual market conditions
   */
  calculateMaximumTheoreticalAPR(): {
    maxAPR: number;
    minAPR: number;
    aprRange: string;
    scenario: string;
    formula: string;
    assumptions: string[];
  } {
    // APR calculation parameters
    const inRangeMultiplier = 1.0; // Always in-range
    const w1 = this.MIN_TIME_COEFFICIENT; // 0.6
    const realisticTotalPool = 100000; // $100K total liquidity (more realistic)
    const typicalPositionValue = 500; // $500 typical position
    const typicalLiquidityShare = typicalPositionValue / realisticTotalPool; // 0.5% of pool
    const kiltPrice = 0.01602; // Current KILT price
    
    // Calculate APR for 30-day position (short term)
    const shortTermDays = 30;
    const shortTermTimeRatio = Math.min(shortTermDays / this.PROGRAM_DURATION_DAYS, 1);
    const shortTermTimeCoefficient = w1 + (shortTermTimeRatio * (1 - w1)); // 0.6 + (30/365) * 0.4 = 0.633
    const shortTermDailyRewards = typicalLiquidityShare * shortTermTimeCoefficient * this.DAILY_BUDGET * inRangeMultiplier;
    const shortTermAnnualRewards = shortTermDailyRewards * 365;
    const shortTermAnnualRewardsUSD = shortTermAnnualRewards * kiltPrice;
    const shortTermAPR = (shortTermAnnualRewardsUSD / typicalPositionValue) * 100;
    
    // Calculate APR for 365-day position (long term)
    const longTermDays = 365;
    const longTermTimeRatio = Math.min(longTermDays / this.PROGRAM_DURATION_DAYS, 1);
    const longTermTimeCoefficient = w1 + (longTermTimeRatio * (1 - w1)); // 0.6 + (365/365) * 0.4 = 1.0
    const longTermDailyRewards = typicalLiquidityShare * longTermTimeCoefficient * this.DAILY_BUDGET * inRangeMultiplier;
    const longTermAnnualRewards = longTermDailyRewards * 365;
    const longTermAnnualRewardsUSD = longTermAnnualRewards * kiltPrice;
    const longTermAPR = (longTermAnnualRewardsUSD / typicalPositionValue) * 100;
    
    
    return {
      maxAPR: Math.round(longTermAPR * 100) / 100,
      minAPR: Math.round(shortTermAPR * 100) / 100,
      aprRange: `${Math.round(shortTermAPR)}% - ${Math.round(longTermAPR)}%`,
      scenario: "Typical liquidity provider positions",
      formula: "R_u = (L_u/L_T) * (w1 + (D_u/365)*(1-w1)) * R/365 * IRM",
      assumptions: [
        "Typical position size: $500 (0.5% of pool)",
        "Total pool: $100K (realistic market size)",
        "Time range: 30 days to 365 days",
        "Always in-range (IRM = 1.0)",
        "Current KILT price ($0.01602)",
        "APR increases with time commitment"
      ]
    };
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
    treasuryTotal: number;
    treasuryRemaining: number;
    estimatedAPR: {
      low: number;
      average: number;
      high: number;
    };
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

      // Get realistic APR range - use direct values if calculation fails
      let aprData;
      try {
        aprData = this.calculateMaximumTheoreticalAPR();
      } catch (error) {
        console.error('Error calculating APR data:', error);
        aprData = { minAPR: 29.46, maxAPR: 46.55 };
      }
      
      // Get admin-configured treasury values (admin panel has superior control)
      const { db } = await import('./db');
      const { treasuryConfig } = await import('../shared/schema');
      
      const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
      const treasuryTotal = treasuryConf ? parseFloat(treasuryConf.totalAllocation) : this.TREASURY_ALLOCATION;
      const dailyBudget = treasuryConf ? parseFloat(treasuryConf.dailyRewardsCap) : this.DAILY_BUDGET;
      
      return {
        totalLiquidity: Math.round(totalLiquidity * 100) / 100, // 2 decimal places
        activeParticipants: activeParticipants.length,
        dailyBudget: Math.round(dailyBudget * 100) / 100, // 2 decimal places
        averageAPR: Math.round(averageAPR * 10000) / 10000, // 4 decimal places for APR
        programDaysRemaining,
        totalDistributed: Math.round(totalDistributed * 100) / 100, // 2 decimal places
        treasuryTotal,
        treasuryRemaining: treasuryTotal - totalDistributed,
        estimatedAPR: {
          low: Math.round(aprData.minAPR),
          average: Math.round((aprData.minAPR + aprData.maxAPR) / 2),
          high: Math.round(aprData.maxAPR)
        }
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
        treasuryTotal: this.TREASURY_ALLOCATION,
        treasuryRemaining: this.TREASURY_ALLOCATION,
        estimatedAPR: {
          low: 29,
          average: 38,
          high: 47
        }
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

      const rawStats = stats[0] || {
        totalAccumulated: 0,
        totalClaimable: 0,
        totalClaimed: 0,
        activePositions: 0,
      };

      return {
        totalAccumulated: Math.round(rawStats.totalAccumulated * 10000) / 10000, // 4 decimal places
        totalClaimable: Math.round(rawStats.totalClaimable * 10000) / 10000, // 4 decimal places
        totalClaimed: Math.round(rawStats.totalClaimed * 10000) / 10000, // 4 decimal places
        activePositions: rawStats.activePositions,
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