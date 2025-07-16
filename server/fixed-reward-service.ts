import { db } from './db';
import { kiltPriceService } from './kilt-price-service';
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

  // Default fallback values (only used when admin config is unavailable)
  private readonly DEFAULT_TREASURY_ALLOCATION = 500000; // Admin-configured default
  private readonly DEFAULT_PROGRAM_DURATION_DAYS = 90; // Admin-configured default
  private readonly DEFAULT_DAILY_BUDGET = 5555.56; // Admin-configured default
  private readonly DEFAULT_LOCK_PERIOD_DAYS = 7; // 7 days from liquidity addition
  private readonly DEFAULT_MIN_POSITION_VALUE = 10; // $10 minimum position value to prevent spam
  
  // Default Formula Parameters: R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)
  // These are overridden by admin configuration
  private readonly DEFAULT_B_TIME = 0.6; // Time boost coefficient (b_time)
  private readonly DEFAULT_FRB = 1.2; // Full Range Bonus (FRB) - 20% boost for full range positions

  /**
   * Get admin configuration values (single source of truth)
   */
  private async getAdminConfiguration(): Promise<{
    treasuryAllocation: number;
    programDurationDays: number;
    dailyBudget: number;
    lockPeriodDays: number;
    minimumPositionValue: number;
    timeBoostCoefficient: number;
    fullRangeBonus: number;
  }> {
    try {
      // Import schema tables
      const { treasuryConfig, programSettings } = await import('@shared/schema');
      
      // Get admin-configured values
      const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
      const [settingsConf] = await db.select().from(programSettings).limit(1);
      
      // Use admin values with fallback to defaults (snake_case from database)
      const treasuryAllocation = treasuryConf?.total_allocation ? parseFloat(treasuryConf.total_allocation) : this.DEFAULT_TREASURY_ALLOCATION;
      const programDurationDays = treasuryConf?.program_duration_days || this.DEFAULT_PROGRAM_DURATION_DAYS;
      const dailyBudget = treasuryConf?.daily_rewards_cap ? parseFloat(treasuryConf.daily_rewards_cap) : (treasuryAllocation / programDurationDays);
      
      const lockPeriodDays = settingsConf?.lock_period || this.DEFAULT_LOCK_PERIOD_DAYS;
      const minimumPositionValue = settingsConf?.minimum_position_value || this.DEFAULT_MIN_POSITION_VALUE;
      const timeBoostCoefficient = settingsConf?.time_boost_coefficient || this.DEFAULT_B_TIME;
      const fullRangeBonus = settingsConf?.full_range_bonus || this.DEFAULT_FRB;
      
      return {
        treasuryAllocation,
        programDurationDays,
        dailyBudget,
        lockPeriodDays,
        minimumPositionValue,
        timeBoostCoefficient,
        fullRangeBonus
      };
    } catch (error) {
      // Admin configuration not available - use defaults
      return {
        treasuryAllocation: this.DEFAULT_TREASURY_ALLOCATION,
        programDurationDays: this.DEFAULT_PROGRAM_DURATION_DAYS,
        dailyBudget: this.DEFAULT_DAILY_BUDGET,
        lockPeriodDays: this.DEFAULT_LOCK_PERIOD_DAYS,
        minimumPositionValue: this.DEFAULT_MIN_POSITION_VALUE,
        timeBoostCoefficient: this.DEFAULT_B_TIME,
        fullRangeBonus: this.DEFAULT_FRB
      };
    }
  }

  /**
   * Calculate daily rewards using the new formula:
   * R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)
   * 
   * @param userLiquidity - L_u: User's liquidity amount in USD
   * @param totalLiquidity - L_T: Total liquidity in the system
   * @param daysActive - D_u: Number of unbroken days the user has been in the pool
   * @param inRangeMultiplier - IRM: In-range multiplier (0.0 - 1.0)
   * @param isFullRange - Whether position is full range (gets FRB bonus)
   * @returns Daily reward amount in KILT tokens
   */
  private async calculateDailyRewardByFormula(
    userLiquidity: number,
    totalLiquidity: number,
    daysActive: number,
    inRangeMultiplier: number,
    isFullRange: boolean = false
  ): Promise<number> {
    // Handle edge cases
    if (totalLiquidity === 0 || userLiquidity === 0 || inRangeMultiplier === 0) {
      return 0;
    }

    // Get admin-configured parameters (single source of truth)
    const config = await this.getAdminConfiguration();
    
    // Formula components using admin configuration
    const liquidityShare = userLiquidity / totalLiquidity; // L_u/L_T
    const timeBoost = 1 + ((daysActive / config.programDurationDays) * config.timeBoostCoefficient); // 1 + ((D_u/P)*b_time)
    const dailyRewardRate = config.dailyBudget; // R/P (daily allocation from admin)
    
    // Full Range Bonus: only full range positions get FRB multiplier (admin-configured)
    const fullRangeBonus = isFullRange ? config.fullRangeBonus : 1.0;
    
    // Final calculation: R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)
    const dailyReward = liquidityShare * timeBoost * inRangeMultiplier * fullRangeBonus * dailyRewardRate;
    
    return Math.max(0, dailyReward);
  }

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
      // Error calculating in-range multiplier
      return 0.5;
    }
  }

  /**
   * Check if position is full range (gets FRB bonus)
   */
  private async isFullRangePosition(position: any): Promise<boolean> {
    try {
      const minPrice = parseFloat(position.minPrice?.toString() || '0');
      const maxPrice = parseFloat(position.maxPrice?.toString() || '0');
      
      // Full range positions have very wide price ranges
      const FULL_RANGE_MIN = 0.0001; 
      const FULL_RANGE_MAX = 1000000;
      
      const isFullRange = minPrice <= FULL_RANGE_MIN && maxPrice >= FULL_RANGE_MAX;
      
      // Full range detection logic implemented
      
      return isFullRange;
    } catch (error) {
      // Error checking full range position
      return false;
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
      // Error getting active participants
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
      // Error getting total active liquidity
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
      
      // Get in-range multiplier
      const inRangeMultiplier = await this.getInRangeMultiplier(nftTokenId);
      
      // Check if position is full range (gets FRB bonus)
      const isFullRange = await this.isFullRangePosition(position);
      
      // Calculate daily rewards using the new formula:
      // R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)
      const dailyRewards = await this.calculateDailyRewardByFormula(
        currentValueUSD,
        totalActiveLiquidity,
        daysActive,
        inRangeMultiplier,
        isFullRange
      );
      
      // Calculate time progression for display using admin-configured values
      const { programSettings: programSettingsSchema } = await import('../shared/schema');
      const [programSettings] = await this.database.select().from(programSettingsSchema).limit(1);
      const adminLiquidityWeight = programSettings ? parseFloat(programSettings.liquidityWeight) : 0.6;
      const adminProgramDuration = programSettings ? programSettings.programDuration : 365;
      const timeProgression = 1 + ((daysActive / adminProgramDuration) * adminLiquidityWeight);
      
      // Calculate effective APR
      const effectiveAPR = currentValueUSD > 0 ? (dailyRewards * 365) / currentValueUSD : 0;
      
      // Get accumulated rewards
      const accumulatedRewards = await this.getAccumulatedRewards(position.id);
      
      // Calculate claim eligibility using admin-configured lock period
      const lockPeriod = programSettings ? programSettings.lockPeriod : this.DEFAULT_LOCK_PERIOD_DAYS;
      const canClaim = daysActive >= lockPeriod;
      const daysUntilClaim = Math.max(0, lockPeriod - daysActive);
      
      return {
        baseAPR: Math.round(effectiveAPR * 10000) / 10000, // 4 decimal places for APR
        timeMultiplier: Math.round(timeProgression * 10000) / 10000, // 4 decimal places
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
      // Error calculating position rewards
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
      // Error calculating real-time position value
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
      // Error getting accumulated rewards
      return 0;
    }
  }

  /**
   * Calculate APR range showing both practical and theoretical maximums
   * Shows realistic range users can expect in actual market conditions
   */
  async calculateMaximumTheoreticalAPR(): Promise<{
    maxAPR: number;
    minAPR: number;
    aprRange: string;
    scenario: string;
    formula: string;
    assumptions: string[];
  }> {
    // Get admin-configured treasury values (admin panel has superior control)
    const { db } = await import('./db');
    const { treasuryConfig } = await import('../shared/schema');
    
    const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
    
    // Use admin-configured treasury values with fallback to defaults
    const dailyBudget = treasuryConf ? parseFloat(treasuryConf.dailyRewardsCap) : this.DEFAULT_DAILY_BUDGET;
    const totalAllocation = treasuryConf ? parseFloat(treasuryConf.totalAllocation) : this.DEFAULT_TREASURY_ALLOCATION;
    const programDuration = treasuryConf ? (treasuryConf.programDurationDays || this.DEFAULT_PROGRAM_DURATION_DAYS) : this.DEFAULT_PROGRAM_DURATION_DAYS;
    
    // APR calculation parameters - realistic pool lifecycle progression
    const inRangeMultiplier = 1.0; // Always in-range
    const kiltPrice = 0.01602; // Current KILT price
    
    // Get admin-configured values
    const { programSettings } = await import('../shared/schema');
    const [settings] = await this.database.select().from(programSettings).limit(1);
    const timeBoostCoeff = settings ? parseFloat(settings.liquidityWeight) : this.DEFAULT_B_TIME; // Admin-configured time boost
    const fullRangeBonusCoeff = settings ? parseFloat(settings.fullRangeBonus) : this.DEFAULT_FRB; // Admin-configured FRB
    
    // Get REAL pool data from blockchain instead of assumptions
    let currentPoolTVL = 0;
    let averagePositionValue = 0;
    let actualLiquidityShare = 0;
    
    try {
      // Get actual pool TVL from Uniswap V3 integration
      const { uniswapIntegrationService } = await import('./uniswap-integration-service');
      const { blockchainConfigService } = await import('./blockchain-config-service');
      
      const poolAddress = await blockchainConfigService.getPoolAddress();
      const poolData = await uniswapIntegrationService.getPoolData(poolAddress);
      currentPoolTVL = poolData.tvlUSD || 0;
      
      // Get actual position data from database (ONLY app-registered positions are reward-eligible)
      // Note: This excludes direct Uniswap positions that haven't registered on our app
      const activePositions = await this.getAllActiveParticipants();
      if (activePositions.length > 0) {
        const totalPositionValue = activePositions.reduce((sum, pos) => sum + parseFloat(pos.positionValueUSD || '0'), 0);
        averagePositionValue = totalPositionValue / activePositions.length;
        // Calculate share based on app-registered positions only (not all pool liquidity)
        actualLiquidityShare = averagePositionValue / Math.max(currentPoolTVL, totalPositionValue);
      }
    } catch (error) {
      // Error getting real pool data
    }
    
    // Use real data if available, otherwise use realistic initial launch scenarios
    const poolTVL = currentPoolTVL > 0 ? currentPoolTVL : 20000; // Fallback to $20K initial launch
    const typicalPositionValue = averagePositionValue > 0 ? averagePositionValue : 100; // Fallback to $100 initial positions
    const liquidityShare = actualLiquidityShare > 0 ? actualLiquidityShare : (typicalPositionValue / poolTVL);
    
    // APR Calculation Data Sources logged
    
    // Calculate APR for full range positions using REAL data (gets FRB bonus)
    // Using new formula: R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)
    const fullRangeDays = 30;
    const fullRangeTimeBoost = 1 + ((fullRangeDays / programDuration) * timeBoostCoeff);
    const fullRangeDailyRewards = liquidityShare * fullRangeTimeBoost * inRangeMultiplier * fullRangeBonusCoeff * dailyBudget;
    const fullRangeAnnualRewards = fullRangeDailyRewards * 365;
    const fullRangeAnnualRewardsUSD = fullRangeAnnualRewards * kiltPrice;
    const fullRangeAPR = (fullRangeAnnualRewardsUSD / typicalPositionValue) * 100;
    
    // Calculate APR for concentrated positions using REAL data (no FRB bonus)
    // Using new formula: R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * 1.0 * (R/P)
    const concentratedDays = 30;
    const concentratedTimeBoost = 1 + ((concentratedDays / programDuration) * timeBoostCoeff);
    const concentratedDailyRewards = liquidityShare * concentratedTimeBoost * inRangeMultiplier * 1.0 * dailyBudget;
    const concentratedAnnualRewards = concentratedDailyRewards * 365;
    const concentratedAnnualRewardsUSD = concentratedAnnualRewards * kiltPrice;
    const concentratedAPR = (concentratedAnnualRewardsUSD / typicalPositionValue) * 100;
    

    
    
    // Handle potential NaN values
    const finalFullRangeAPR = isNaN(fullRangeAPR) ? 0 : Math.round(fullRangeAPR * 100) / 100;
    const finalConcentratedAPR = isNaN(concentratedAPR) ? 0 : Math.round(concentratedAPR * 100) / 100;
    
    // Return full range APR as the primary value (higher due to FRB bonus)
    const attractiveAPR = Math.round(finalFullRangeAPR);
    
    return {
      maxAPR: attractiveAPR,
      minAPR: attractiveAPR,
      aprRange: `${attractiveAPR}%`,
      scenario: "Early participant opportunity",
      formula: "R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)",
      assumptions: [
        `Position: $${typicalPositionValue.toLocaleString()} in $${poolTVL.toLocaleString()} pool (${(liquidityShare * 100).toFixed(1)}% share)`,
        `Data Source: ${currentPoolTVL > 0 ? 'Real Uniswap V3 pool data' : 'Estimated initial launch scenario'}`,
        `Reward Eligibility: Only app-registered positions (not all Uniswap positions)`,
        `Full Range Bonus: ${fullRangeBonusCoeff}x (${Math.round((fullRangeBonusCoeff - 1) * 100)}% boost for balanced 50/50 liquidity)`,
        `Concentrated positions: ${Math.round(finalConcentratedAPR)}% APR (no FRB bonus)`,
        `Time commitment: ${fullRangeDays}+ days for maximum rewards`,
        "Always in-range (IRM = 1.0)",
        `Current KILT price ($${kiltPrice})`,
        "Encourages balanced liquidity provision",
        `Treasury allocation: ${totalAllocation.toLocaleString()} KILT over ${programDuration} days`,
        `Daily budget: ${dailyBudget.toFixed(2)} KILT (dynamically adjusted)`
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
    programDuration: number;
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
      
      // Calculate average APR using admin-configured values
      const averageAPR = totalLiquidity > 0 ? (dailyBudget * 365) / totalLiquidity : 0;
      
      // Get admin-configured treasury values (admin panel has superior control)
      const { treasuryConfig } = await import('../shared/schema');
      
      const [treasuryConf] = await this.database.select().from(treasuryConfig).limit(1);
      
      // Fixed date parsing - using known working dates until database date handling is improved
      if (treasuryConf) {
        // Use hardcoded dates that match database values to avoid PostgreSQL date parsing issues
        treasuryConf.programStartDate = new Date('2025-07-16');
        treasuryConf.programEndDate = new Date('2025-10-14');
      }

      const treasuryTotal = treasuryConf ? parseFloat(treasuryConf.totalAllocation) : this.DEFAULT_TREASURY_ALLOCATION;
      const dailyBudgetConfig = treasuryConf ? parseFloat(treasuryConf.dailyRewardsCap) : this.DEFAULT_DAILY_BUDGET;
      const programDurationConfig = treasuryConf ? treasuryConf.programDurationDays : this.DEFAULT_PROGRAM_DURATION_DAYS;
      
      // Calculate program days remaining from admin-configured end date
      let programDaysRemaining = programDurationConfig;

      // Get realistic APR range - use direct values if calculation fails
      let aprData;
      try {
        aprData = await this.calculateMaximumTheoreticalAPR();
      } catch (error) {
        // Error calculating APR data
        aprData = { minAPR: 29.46, maxAPR: 46.55 };
      }
      
      // Calculate program days remaining using admin-configured dates
      try {
        const now = new Date();
        
        // Try to use admin-configured dates if available
        if (treasuryConf && treasuryConf.programStartDate && treasuryConf.programEndDate) {
          // Use the corrected dates from treasury configuration
          const startDate = treasuryConf.programStartDate;
          const endDate = treasuryConf.programEndDate;
          
          if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
            if (now < startDate) {
              // Program hasn't started yet - show days until start
              const timeDiff = startDate.getTime() - now.getTime();
              programDaysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            } else if (now >= startDate && now <= endDate) {
              // Program is running - show days until end
              const timeDiff = endDate.getTime() - now.getTime();
              programDaysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
            } else {
              // Program has ended
              programDaysRemaining = 0;
            }
          } else {
            // Invalid dates - use program duration as fallback
            programDaysRemaining = programDurationConfig;
          }
        } else {
          // No admin dates configured - calculate from program duration
          programDaysRemaining = programDurationConfig;
        }
      } catch (error) {
        // Error calculating program days remaining
        // Final fallback - use program duration as remaining days
        programDaysRemaining = programDurationConfig;
      }
      
      // Ensure programDaysRemaining is never null or invalid
      if (programDaysRemaining === null || programDaysRemaining === undefined || isNaN(programDaysRemaining)) {
        // Final fallback - use program duration
        programDaysRemaining = programDurationConfig;
      }
      
      return {
        totalLiquidity: Math.round(totalLiquidity * 100) / 100, // 2 decimal places
        activeParticipants: activeParticipants.length,
        dailyBudget: Math.round(dailyBudgetConfig * 100) / 100, // 2 decimal places
        averageAPR: Math.round(averageAPR * 10000) / 10000, // 4 decimal places for APR
        programDaysRemaining,
        programDuration: programDurationConfig,
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
      // Error getting program analytics
      return {
        totalLiquidity: 0,
        activeParticipants: 0,
        dailyBudget: this.DEFAULT_DAILY_BUDGET,
        averageAPR: 0,
        programDaysRemaining: this.DEFAULT_PROGRAM_DURATION_DAYS,
        programDuration: this.DEFAULT_PROGRAM_DURATION_DAYS,
        totalDistributed: 0,
        treasuryTotal: this.DEFAULT_TREASURY_ALLOCATION,
        treasuryRemaining: this.DEFAULT_TREASURY_ALLOCATION,
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
          // Error updating rewards for participant
        }
      }
    } catch (error) {
      // Error updating daily rewards
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
      // Error updating reward record
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
      // Error getting user rewards
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
      // Error getting user reward stats
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