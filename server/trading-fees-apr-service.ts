import { uniswapIntegrationService } from './uniswap-integration-service';
import { blockchainConfigService } from './blockchain-config-service';

export interface TradingFeesAPRResult {
  tradingFeesAPR: number;
  positionSpecificAPR: number;
  poolVolume24hUSD: number;
  poolFees24hUSD: number;
  poolTVL: number;
  feeTier: number;
  dataSource: 'subgraph' | 'dexscreener' | 'blockchain' | 'fallback';
  userPositionShare: number;
  calculationMethod: 'position-based' | 'pool-average';
}

export class TradingFeesAPRService {
  private static instance: TradingFeesAPRService;
  private cache: { data: TradingFeesAPRResult | null; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): TradingFeesAPRService {
    // Force new instance to clear cache
    TradingFeesAPRService.instance = new TradingFeesAPRService();
    return TradingFeesAPRService.instance;
  }

  /**
   * Calculate trading fees APR for the pool (general calculation)
   */
  async calculatePoolTradingFeesAPR(): Promise<TradingFeesAPRResult> {
    // Skip cache to use authentic Uniswap values
    // if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
    //   return this.cache.data!;
    // }

    try {
      // Get pool address and authentic data from Uniswap
      const poolAddress = await blockchainConfigService.getPoolAddress();
      const poolData = await uniswapIntegrationService.getPoolData(poolAddress);

      // Calculate real-time APR from authentic Uniswap data
      const annualFeesRate = poolData.tvlUSD > 0 ? 
        (poolData.feesUSD24h * 365) / poolData.tvlUSD * 100 : 0.11;

      const result: TradingFeesAPRResult = {
        tradingFeesAPR: annualFeesRate,
        positionSpecificAPR: annualFeesRate,
        poolVolume24hUSD: poolData.volume24hUSD,
        poolFees24hUSD: poolData.feesUSD24h,
        poolTVL: poolData.tvlUSD,
        feeTier: poolData.feeTier,
        dataSource: poolData.volumeDataSource as any,
        userPositionShare: 0,
        calculationMethod: 'pool-average'
      };

      // Cache the result
      this.cache = { data: result, timestamp: Date.now() };
      return result;

    } catch (error) {
      console.error('Failed to fetch authentic Uniswap data, using fallback:', error);
      // Last resort fallback - should rarely be used
      const fallbackResult: TradingFeesAPRResult = {
        tradingFeesAPR: 0.11,
        positionSpecificAPR: 0.11,
        poolVolume24hUSD: 0, // Will trigger refetch
        poolFees24hUSD: 0,
        poolTVL: 0,
        feeTier: 3000,
        dataSource: 'fallback',
        userPositionShare: 0,
        calculationMethod: 'pool-average'
      };

      // Don't cache fallback results
      return fallbackResult;
    }
  }

  /**
   * Calculate position-specific trading fees APR based on user's actual position
   */
  async calculatePositionTradingFeesAPR(
    userAddress: string,
    positionValue: number,
    tickLower: number,
    tickUpper: number,
    liquidity: string
  ): Promise<TradingFeesAPRResult> {
    try {
      // Get pool data first
      const poolResult = await this.calculatePoolTradingFeesAPR();
      
      // Get pool address and current tick
      const poolAddress = await blockchainConfigService.getPoolAddress();
      const poolData = await uniswapIntegrationService.getPoolData(poolAddress);
      
      // Calculate position concentration factor
      const concentrationFactor = this.calculateConcentrationFactor(
        tickLower, 
        tickUpper, 
        poolData.tickCurrent
      );

      // Calculate user's share of pool liquidity
      const positionLiquidity = BigInt(liquidity);
      const totalLiquidity = BigInt(poolData.liquidity);
      const liquidityShare = totalLiquidity > 0n ? 
        Number(positionLiquidity) / Number(totalLiquidity) : 0;

      // Position-specific APR calculation:
      // 1. User gets fees proportional to their liquidity share
      // 2. Concentrated positions get more fees when in range
      // 3. Out-of-range positions get zero fees
      
      const isInRange = poolData.tickCurrent >= tickLower && poolData.tickCurrent < tickUpper;
      let positionSpecificAPR = 0;

      if (isInRange && positionValue > 0) {
        // Calculate effective fee capture based on concentration
        const effectiveFeeCapture = liquidityShare * concentrationFactor;
        const annualFeesEarned = poolResult.poolFees24hUSD * 365 * effectiveFeeCapture;
        positionSpecificAPR = (annualFeesEarned / positionValue) * 100;
      }

      return {
        ...poolResult,
        positionSpecificAPR,
        userPositionShare: liquidityShare,
        calculationMethod: 'position-based'
      };

    } catch (error) {
      throw new Error(`Failed to calculate position-specific trading fees APR: ${error}`);
    }
  }

  /**
   * Calculate concentration factor for a position
   * Higher concentration = more fees when in range
   */
  private calculateConcentrationFactor(
    tickLower: number, 
    tickUpper: number, 
    currentTick: number
  ): number {
    const tickRange = tickUpper - tickLower;
    
    // Full range positions (very wide) get factor ~1
    // Concentrated positions get higher factors
    
    if (tickRange >= 200000) {
      // Full range or very wide positions
      return 1.0;
    } else if (tickRange >= 20000) {
      // Wide positions
      return 1.5;
    } else if (tickRange >= 4000) {
      // Medium concentration
      return 3.0;
    } else {
      // Highly concentrated positions
      return 5.0;
    }
  }

  /**
   * Clear cache for fresh calculation
   */
  clearCache(): void {
    this.cache = null;
  }
}

export const tradingFeesAPRService = TradingFeesAPRService.getInstance();