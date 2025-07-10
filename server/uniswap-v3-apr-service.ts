import { db } from './db';
import { lpPositions, poolMetricsHistory, positionSnapshots, performanceMetrics } from '@shared/schema';
import { eq, desc, gte, and } from 'drizzle-orm';

export interface UniswapV3APRResult {
  tradingFeeAPR: number;
  incentiveAPR: number;
  totalAPR: number;
  breakdown: {
    // Trading Fee Components
    poolVolume24h: number;
    poolTVL: number;
    feeRate: number;
    liquidityShare: number;
    timeInRangeRatio: number;
    concentrationFactor: number;
    dailyFeeEarnings: number;
    
    // Incentive Components
    dailyIncentiveRewards: number;
    
    // Position Details
    positionValue: number;
    minPrice: number;
    maxPrice: number;
    currentPrice: number;
    isInRange: boolean;
    daysActive: number;
  };
}

export class UniswapV3APRService {
  constructor(private db: any) {}

  // Pool and network constants
  private readonly KILT_ETH_POOL = '0x...'; // KILT/ETH pool address
  private readonly BASE_CHAIN_ID = 8453;
  private readonly ETH_PRICE_USD = 3200; // Approximate ETH price
  
  // Fee tiers
  private readonly FEE_TIERS = {
    '0.0005': 0.0005, // 0.05%
    '0.003': 0.003,   // 0.3%
    '0.01': 0.01      // 1%
  };

  /**
   * Calculate concentration factor based on price range
   * Narrow ranges get higher multipliers when in-range
   */
  private calculateConcentrationFactor(minPrice: number, maxPrice: number, currentPrice: number): number {
    if (minPrice === 0 && maxPrice === Infinity) {
      return 1; // Full range
    }
    
    const priceRange = maxPrice - minPrice;
    const fullRangeEquivalent = currentPrice * 2; // Approximate full range
    
    // Concentration factor = full range liquidity / concentrated liquidity
    const concentrationFactor = Math.max(1, fullRangeEquivalent / priceRange);
    
    // Cap at reasonable maximum
    return Math.min(concentrationFactor, 10);
  }

  /**
   * Calculate time-in-range ratio for a position
   */
  private async calculateTimeInRangeRatio(
    positionId: number, 
    days: number = 30
  ): Promise<number> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get position snapshots for the period
      const snapshots = await this.db
        .select()
        .from(positionSnapshots)
        .where(
          and(
            eq(positionSnapshots.positionId, positionId),
            gte(positionSnapshots.snapshotAt, startDate)
          )
        )
        .orderBy(desc(positionSnapshots.snapshotAt));

      if (snapshots.length === 0) {
        // If no snapshots, assume in-range (new position)
        return 1.0;
      }

      // Calculate time-weighted in-range ratio
      let totalTime = 0;
      let inRangeTime = 0;
      
      for (let i = 0; i < snapshots.length - 1; i++) {
        const current = snapshots[i];
        const next = snapshots[i + 1];
        
        const timeDiff = new Date(current.snapshotAt).getTime() - new Date(next.snapshotAt).getTime();
        totalTime += timeDiff;
        
        if (current.inRange) {
          inRangeTime += timeDiff;
        }
      }

      return totalTime > 0 ? inRangeTime / totalTime : 1.0;
    } catch (error) {
      console.error('Error calculating time-in-range ratio:', error);
      return 0.5; // Default to 50% if calculation fails
    }
  }

  /**
   * Get pool metrics (volume, TVL, current price)
   */
  private async getPoolMetrics(poolAddress: string): Promise<{
    volume24h: number;
    tvl: number;
    currentPrice: number;
  }> {
    try {
      // Get latest pool metrics
      const [latestMetrics] = await this.db
        .select()
        .from(poolMetricsHistory)
        .where(eq(poolMetricsHistory.poolAddress, poolAddress))
        .orderBy(desc(poolMetricsHistory.timestamp))
        .limit(1);

      if (latestMetrics) {
        return {
          volume24h: Number(latestMetrics.volume24h),
          tvl: Number(latestMetrics.tvl),
          currentPrice: Number(latestMetrics.price)
        };
      }

      // Fallback to external API or mock data for development
      return {
        volume24h: 50000, // $50K daily volume
        tvl: 500000,      // $500K TVL
        currentPrice: 0.016 // Current KILT price
      };
    } catch (error) {
      console.error('Error getting pool metrics:', error);
      return {
        volume24h: 50000,
        tvl: 500000,
        currentPrice: 0.016
      };
    }
  }

  /**
   * Calculate trading fee APR for a position
   */
  private async calculateTradingFeeAPR(
    positionId: number,
    positionValue: number,
    minPrice: number,
    maxPrice: number,
    feeRate: number
  ): Promise<{
    tradingFeeAPR: number;
    breakdown: {
      poolVolume24h: number;
      poolTVL: number;
      liquidityShare: number;
      timeInRangeRatio: number;
      concentrationFactor: number;
      dailyFeeEarnings: number;
    };
  }> {
    // Get pool metrics
    const poolMetrics = await this.getPoolMetrics(this.KILT_ETH_POOL);
    
    // Calculate liquidity share
    const liquidityShare = positionValue / poolMetrics.tvl;
    
    // Calculate time-in-range ratio
    const timeInRangeRatio = await this.calculateTimeInRangeRatio(positionId);
    
    // Calculate concentration factor
    const concentrationFactor = this.calculateConcentrationFactor(
      minPrice, 
      maxPrice, 
      poolMetrics.currentPrice
    );
    
    // Calculate daily fee earnings
    // Formula: (poolVolume24h * feeRate * liquidityShare * timeInRangeRatio * concentrationFactor)
    const dailyFeeEarnings = (
      poolMetrics.volume24h * 
      feeRate * 
      liquidityShare * 
      timeInRangeRatio * 
      concentrationFactor
    );
    
    // Calculate trading fee APR
    const tradingFeeAPR = (dailyFeeEarnings * 365) / positionValue * 100;
    
    return {
      tradingFeeAPR: Math.max(0, tradingFeeAPR),
      breakdown: {
        poolVolume24h: poolMetrics.volume24h,
        poolTVL: poolMetrics.tvl,
        liquidityShare,
        timeInRangeRatio,
        concentrationFactor,
        dailyFeeEarnings
      }
    };
  }

  /**
   * Calculate full Uniswap V3 APR (Trading Fees + Incentives)
   */
  async calculateFullUniswapV3APR(
    positionId: number,
    userId: number,
    nftTokenId: string,
    positionValue: number,
    minPrice: number,
    maxPrice: number,
    feeRate: number,
    incentiveAPR: number,
    dailyIncentiveRewards: number
  ): Promise<UniswapV3APRResult> {
    try {
      // Get position details
      const [position] = await this.db
        .select()
        .from(lpPositions)
        .where(eq(lpPositions.id, positionId))
        .limit(1);

      if (!position) {
        throw new Error('Position not found');
      }

      // Calculate trading fee APR
      const tradingFeeResult = await this.calculateTradingFeeAPR(
        positionId,
        positionValue,
        minPrice,
        maxPrice,
        feeRate
      );

      // Get pool metrics for additional context
      const poolMetrics = await this.getPoolMetrics(this.KILT_ETH_POOL);
      
      // Calculate days active
      const daysActive = Math.floor(
        (Date.now() - new Date(position.createdAt).getTime()) / (24 * 60 * 60 * 1000)
      );

      // Check if position is currently in range
      const isInRange = (
        poolMetrics.currentPrice >= minPrice && 
        poolMetrics.currentPrice <= maxPrice
      );

      // Calculate total APR
      const totalAPR = tradingFeeResult.tradingFeeAPR + incentiveAPR;

      return {
        tradingFeeAPR: tradingFeeResult.tradingFeeAPR,
        incentiveAPR,
        totalAPR,
        breakdown: {
          // Trading Fee Components
          poolVolume24h: tradingFeeResult.breakdown.poolVolume24h,
          poolTVL: tradingFeeResult.breakdown.poolTVL,
          feeRate,
          liquidityShare: tradingFeeResult.breakdown.liquidityShare,
          timeInRangeRatio: tradingFeeResult.breakdown.timeInRangeRatio,
          concentrationFactor: tradingFeeResult.breakdown.concentrationFactor,
          dailyFeeEarnings: tradingFeeResult.breakdown.dailyFeeEarnings,
          
          // Incentive Components
          dailyIncentiveRewards,
          
          // Position Details
          positionValue,
          minPrice,
          maxPrice,
          currentPrice: poolMetrics.currentPrice,
          isInRange,
          daysActive
        }
      };
    } catch (error) {
      console.error('Error calculating full Uniswap V3 APR:', error);
      
      // Return fallback values
      return {
        tradingFeeAPR: 0,
        incentiveAPR,
        totalAPR: incentiveAPR,
        breakdown: {
          poolVolume24h: 0,
          poolTVL: 0,
          feeRate,
          liquidityShare: 0,
          timeInRangeRatio: 0,
          concentrationFactor: 1,
          dailyFeeEarnings: 0,
          dailyIncentiveRewards,
          positionValue,
          minPrice,
          maxPrice,
          currentPrice: 0.016,
          isInRange: false,
          daysActive: 0
        }
      };
    }
  }

  /**
   * Get APR breakdown for analytics
   */
  async getAPRBreakdown(positionId: number): Promise<{
    tradingFees: number;
    incentives: number;
    total: number;
    components: {
      volume: number;
      tvl: number;
      timeInRange: number;
      concentration: number;
    };
  }> {
    try {
      const [position] = await this.db
        .select()
        .from(lpPositions)
        .where(eq(lpPositions.id, positionId))
        .limit(1);

      if (!position) {
        return {
          tradingFees: 0,
          incentives: 0,
          total: 0,
          components: {
            volume: 0,
            tvl: 0,
            timeInRange: 0,
            concentration: 1
          }
        };
      }

      // This would integrate with the reward service to get incentive APR
      // For now, return basic structure
      const poolMetrics = await this.getPoolMetrics(this.KILT_ETH_POOL);
      const timeInRange = await this.calculateTimeInRangeRatio(positionId);
      const concentration = this.calculateConcentrationFactor(
        Number(position.minPrice),
        Number(position.maxPrice),
        poolMetrics.currentPrice
      );

      return {
        tradingFees: 0, // Would be calculated
        incentives: 0,  // Would come from reward service
        total: 0,
        components: {
          volume: poolMetrics.volume24h,
          tvl: poolMetrics.tvl,
          timeInRange,
          concentration
        }
      };
    } catch (error) {
      console.error('Error getting APR breakdown:', error);
      return {
        tradingFees: 0,
        incentives: 0,
        total: 0,
        components: {
          volume: 0,
          tvl: 0,
          timeInRange: 0,
          concentration: 1
        }
      };
    }
  }
}

export const uniswapV3APRService = new UniswapV3APRService(db);