import { db } from './db';
import { treasuryConfig, programSettings } from '../shared/schema';

/**
 * Unified APR calculation service that ensures admin panel and main app use identical data sources
 * This eliminates the synchronization issues between different parts of the application
 */
class UnifiedAPRService {
  private static instance: UnifiedAPRService;
  private aprCache: { value: any; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30000; // 30 seconds cache to allow price updates

  static getInstance(): UnifiedAPRService {
    if (!UnifiedAPRService.instance) {
      UnifiedAPRService.instance = new UnifiedAPRService();
    }
    return UnifiedAPRService.instance;
  }

  /**
   * Get unified APR calculation used by both admin panel and main app
   * This is the single source of truth for all APR displays
   */
  async getUnifiedAPRCalculation(): Promise<{
    minAPR: number;
    maxAPR: number;
    aprRange: string;
    calculationDetails: {
      treasuryAllocation: number;
      programDuration: number;
      dailyBudget: number;
      timeBoost: number;
      fullRangeBonus: number;
      baseAPR: number;
      dataSource: string;
    };
  }> {
    // Check cache first
    if (this.aprCache && Date.now() - this.aprCache.timestamp < this.CACHE_DURATION) {
      return this.aprCache.value;
    }

    try {
      // Get admin-configured treasury values (single source of truth)
      const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
      const [settingsConf] = await db.select().from(programSettings).limit(1);

      // Use admin configuration as primary source
      const treasuryAllocation = treasuryConf ? parseFloat(treasuryConf.totalAllocation) : 500000;
      const programDuration = treasuryConf ? treasuryConf.programDurationDays : 90;
      const dailyBudget = treasuryConf ? parseFloat(treasuryConf.dailyRewardsCap) : 5555.56;
      const timeBoost = settingsConf ? parseFloat(settingsConf.timeBoostCoefficient) : 0.6;
      const fullRangeBonus = settingsConf ? parseFloat(settingsConf.fullRangeBonus) : 1.2;

      // Get REAL Uniswap pool data instead of assumptions
      let poolTVL = 100000; // Default fallback
      let actualPositionValue = 500; // Default fallback
      let usingRealData = false;
      
      try {
        const { uniswapIntegrationService } = await import('./uniswap-integration-service');
        const { blockchainConfigService } = await import('./blockchain-config-service');
        
        const poolAddress = await blockchainConfigService.getPoolAddress();
        const poolData = await uniswapIntegrationService.getPoolData(poolAddress);
        
        if (poolData.tvlUSD > 0) {
          poolTVL = poolData.tvlUSD;
          usingRealData = true;
        }
        
        // Get actual position data from APP-REGISTERED positions only
        const { db } = await import('./db');
        const { lpPositions, positionEligibility } = await import('../shared/schema');
        const { sql } = await import('drizzle-orm');
        
        // Only get positions that are registered through our app AND eligible for rewards
        const appRegisteredPositions = await db
          .select({
            positionId: lpPositions.id,
            positionValueUsd: lpPositions.positionValueUsd,
            isActive: lpPositions.isActive
          })
          .from(lpPositions)
          .innerJoin(positionEligibility, sql`${lpPositions.nftTokenId} = ${positionEligibility.nftTokenId}`)
          .where(
            sql`${lpPositions.positionValueUsd} > 0 AND ${lpPositions.isActive} = true AND ${positionEligibility.isEligible} = true`
          );
        
        if (appRegisteredPositions.length > 0) {
          const totalValue = appRegisteredPositions.reduce((sum, pos) => sum + parseFloat(pos.positionValueUsd || '0'), 0);
          actualPositionValue = totalValue / appRegisteredPositions.length;
        }
        
        console.log('Unified APR using real Uniswap data (App-Registered Only):', {
          poolTVL,
          actualPositionValue,
          usingRealData,
          appRegisteredPositions: appRegisteredPositions.length,
          liquidityShare: actualPositionValue / poolTVL,
          rewardEligibleOnly: true
        });
        
      } catch (error) {
        console.error('Error getting real Uniswap data:', error);
      }
      
      // Calculate base APR using REAL data
      const liquidityShare = actualPositionValue / poolTVL;
      const inRangeMultiplier = 1.0; // In-range positions
      
      // Use EXACT reward formula from FixedRewardService
      // Formula: R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)
      
      // Calculate for 30 days (minimum) and full program duration (maximum)
      const minDays = 30;
      const maxDays = programDuration;
      
      // Time progression component: (D_u/P) * b_time
      const minTimeProgression = (minDays / programDuration) * timeBoost;
      const maxTimeProgression = (maxDays / programDuration) * timeBoost;
      
      // Complete formula components
      const minTimeBoost = 1 + minTimeProgression;
      const maxTimeBoost = 1 + maxTimeProgression;
      
      // Daily reward per position using exact formula
      // dailyBudget is in KILT tokens, need to convert to USD for APR calculation
      const kiltPrice = await import('./kilt-price-service.js').then(m => m.kiltPriceService.getCurrentPrice());
      
      const dailyRewardBudgetUSD = dailyBudget * kiltPrice; // Convert KILT to USD
      const minDailyReward = liquidityShare * minTimeBoost * inRangeMultiplier * fullRangeBonus * dailyRewardBudgetUSD;
      const maxDailyReward = liquidityShare * maxTimeBoost * inRangeMultiplier * fullRangeBonus * dailyRewardBudgetUSD;
      
      // Annualized APR calculation
      const minAnnualReward = minDailyReward * 365;
      const maxAnnualReward = maxDailyReward * 365;
      
      const minAPR = Math.round((minAnnualReward / actualPositionValue) * 100);
      const maxAPR = Math.round((maxAnnualReward / actualPositionValue) * 100);

      const result = {
        minAPR,
        maxAPR,
        aprRange: `${minAPR}% - ${maxAPR}%`,
        calculationDetails: {
          treasuryAllocation,
          programDuration,
          dailyBudget,
          dailyBudgetUSD: dailyRewardBudgetUSD,
          kiltPrice,
          timeBoost,
          fullRangeBonus,
          baseAPR: minAPR,
          dataSource: usingRealData ? 'real-uniswap-data' : 'fallback-estimates',
          poolTVL,
          actualPositionValue,
          usingRealData
        }
      };

      // Cache the result
      this.aprCache = {
        value: result,
        timestamp: Date.now()
      };

      console.log('Unified APR Calculation:', result);
      return result;

    } catch (error) {
      console.error('Error in unified APR calculation:', error);
      
      // Return consistent fallback values with real KILT price
      const fallbackKiltPrice = await import('./kilt-price-service.js').then(m => m.kiltPriceService.getCurrentPrice());
      
      const fallbackResult = {
        minAPR: 31,
        maxAPR: 31,
        aprRange: '31%',
        calculationDetails: {
          treasuryAllocation: 500000,
          programDuration: 90,
          dailyBudget: 5555.56,
          dailyBudgetUSD: 5555.56 * fallbackKiltPrice,
          kiltPrice: fallbackKiltPrice,
          timeBoost: 0.6,
          fullRangeBonus: 1.2,
          baseAPR: 31,
          dataSource: 'fallback'
        }
      };

      this.aprCache = {
        value: fallbackResult,
        timestamp: Date.now()
      };

      return fallbackResult;
    }
  }

  /**
   * Clear cache to force recalculation (useful when admin changes settings)
   */
  clearCache(): void {
    this.aprCache = null;
  }
}

export const unifiedAPRService = UnifiedAPRService.getInstance();

// For TypeScript compilation
export default unifiedAPRService;