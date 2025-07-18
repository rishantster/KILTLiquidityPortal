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
      // PARALLEL PROCESSING - Execute all database calls simultaneously
      const [treasuryConf, settingsConf, kiltPrice] = await Promise.all([
        db.select().from(treasuryConfig).limit(1).then(results => results[0]),
        db.select().from(programSettings).limit(1).then(results => results[0]),
        (async () => {
          const { kiltPriceService } = await import('./kilt-price-service.js');
          return kiltPriceService.getCurrentPrice();
        })()
      ]);

      // Admin panel is the ONLY source of truth - no fallbacks allowed
      if (!treasuryConf || treasuryConf.totalAllocation == null || treasuryConf.programDurationDays == null || treasuryConf.dailyRewardsCap == null) {
        throw new Error('Admin configuration required - no fallback values allowed');
      }
      
      if (!settingsConf || settingsConf.timeBoostCoefficient == null || settingsConf.fullRangeBonus == null) {
        throw new Error('Program settings required - no fallback values allowed');
      }
      
      const treasuryAllocation = parseFloat(treasuryConf.totalAllocation);
      const programDuration = treasuryConf.programDurationDays;
      const dailyBudget = parseFloat(treasuryConf.dailyRewardsCap);
      const timeBoost = parseFloat(settingsConf.timeBoostCoefficient);
      const fullRangeBonus = parseFloat(settingsConf.fullRangeBonus);
      
      // Clear cache to force recalculation
      this.aprCache = null;

      // Require REAL blockchain data - no hardcoded values
      let poolTVL = 0;
      let actualPositionValue = 0;
      let usingRealData = false;

      try {
        // Import and use real blockchain services
        const { uniswapIntegrationService } = await import('./uniswap-integration-service.js');
        const { fixedRewardService } = await import('./fixed-reward-service.js');
        
        // Get real pool data from blockchain
        const poolInfo = await uniswapIntegrationService.getPoolInfo();
        const activeParticipants = await fixedRewardService.getAllActiveParticipants();
        
        if (poolInfo && poolInfo.totalValueUSD > 0) {
          poolTVL = poolInfo.totalValueUSD;
          usingRealData = true;
        }
        
        if (activeParticipants.length > 0) {
          actualPositionValue = activeParticipants.reduce((sum, p) => sum + p.currentValueUsd, 0) / activeParticipants.length;
        }
      } catch (error) {
        console.error('Failed to fetch real blockchain data:', error);
        throw new Error('Real blockchain data required - no fallbacks allowed');
      }

      // Require actual blockchain data
      if (!usingRealData || poolTVL === 0) {
        throw new Error('Real pool data from blockchain required');
      }
      
      // Get actual position data from APP-REGISTERED positions only
      try {
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
        
        if (appRegisteredPositions.length === 0) {
          throw new Error('No app-registered positions found - real blockchain data required');
        }
        
        const totalValue = appRegisteredPositions.reduce((sum, pos) => sum + parseFloat(pos.positionValueUsd || '0'), 0);
        actualPositionValue = totalValue / appRegisteredPositions.length;
        
        // Get real pool TVL from Uniswap integration service
        const { uniswapIntegrationService } = await import('./uniswap-integration-service.js');
        const poolInfo = await uniswapIntegrationService.getPoolInfo();
        
        if (!poolInfo || poolInfo.totalValueUSD === 0) {
          throw new Error('Unable to fetch real pool TVL from Uniswap - blockchain data required');
        }
        
        poolTVL = poolInfo.totalValueUSD;
        usingRealData = true;
        
      } catch (error) {
        // No fallbacks allowed - throw error if real data unavailable
        throw new Error('Unable to fetch real blockchain data - admin configuration and blockchain integration required');
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
      // (kiltPrice already declared above)
      
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

      return result;

    } catch (error) {
      // No fallback values allowed - admin panel must be configured
      throw new Error('UnifiedAPRService requires admin configuration - no fallback values allowed');
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