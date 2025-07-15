import { db } from './db';
import { realTimePriceService } from './real-time-price-service';
import { 
  rewards, 
  dailyRewards, 
  lpPositions, 
  users,
  positionSnapshots,
  performanceMetrics,
  feeEvents,
  treasuryConfig,
  programSettings,
  type InsertReward,
  type InsertDailyReward,
  type Reward,
  type DailyReward,
  type LpPosition
} from '@shared/schema';
import { eq, and, gte, desc, sum, sql } from 'drizzle-orm';

export interface HybridRewardCalculation {
  positionId: number;
  nftTokenId: string;
  currentValueUSD: number;
  
  // Merkl-style components
  feeEarningsComponent: number;
  token0Component: number;
  token1Component: number;
  
  // KILT-style components
  liquidityShareComponent: number;
  timeProgressionComponent: number;
  
  // Hybrid result
  totalDailyReward: number;
  effectiveAPR: number;
  
  // Breakdown weights
  feeWeight: number;
  token0Weight: number;
  token1Weight: number;
  liquidityWeight: number;
  timeWeight: number;
  
  // Multipliers
  inRangeMultiplier: number;
  concentrationBonus: number;
  
  // Metrics
  accumulatedRewards: number;
  daysActive: number;
  feesEarned24h: number;
  totalLiquidityShare: number;
  
  // Meta
  calculationMethod: 'hybrid';
  lastUpdateTimestamp: number;
}

export interface HybridProgramSettings {
  // Merkl-style weights (must sum to 1.0)
  feeWeight: number;        // w_fees (0.0 - 1.0)
  token0Weight: number;     // w_token0 (0.0 - 1.0) 
  token1Weight: number;     // w_token1 (0.0 - 1.0)
  
  // KILT-style weights (applied to remaining allocation)
  liquidityWeight: number;  // w_liquidity (0.0 - 1.0)
  timeWeight: number;       // w_time (0.0 - 1.0)
  
  // Hybrid mode settings
  merklModeRatio: number;   // 0.0 = pure KILT, 1.0 = pure Merkl, 0.5 = balanced
  concentrationBonusEnabled: boolean;
  minimumPositionValue: number;
  lockPeriod: number;
  inRangeRequirement: boolean;
}

export class HybridRewardService {
  constructor(private database: any) {}

  /**
   * Calculate hybrid rewards combining Merkl fee-based and KILT time-based approaches
   * 
   * Hybrid Formula:
   * R_u = [merklRatio * (w_fees*F_u/F_T + w_token0*T0_u/T0_T + w_token1*T1_u/T1_T) + 
   *        (1-merklRatio) * (w_liquidity*L_u/L_T + w_time*D_u/P)] * R * IRM * CB
   * 
   * Where:
   * - F_u/F_T = user fees earned vs total fees
   * - T0_u/T0_T = user token0 holdings vs total token0 during swaps
   * - T1_u/T1_T = user token1 holdings vs total token1 during swaps
   * - L_u/L_T = user liquidity vs total liquidity (KILT approach)
   * - D_u/P = days active vs program duration (KILT approach)
   * - IRM = in-range multiplier (1.0 if in-range, 0.0 if out-of-range)
   * - CB = concentration bonus (higher for tighter ranges)
   */
  async calculateHybridRewards(nftTokenId: string): Promise<HybridRewardCalculation> {
    try {
      // Get position data
      const [position] = await this.database
        .select()
        .from(lpPositions)
        .where(eq(lpPositions.nftTokenId, nftTokenId))
        .limit(1);

      if (!position) {
        throw new Error(`Position not found for NFT token ID: ${nftTokenId}`);
      }

      // Get hybrid program settings
      const settings = await this.getHybridProgramSettings();
      
      // Get treasury configuration
      const treasuryConf = await this.getTreasuryConfiguration();
      
      // Calculate real-time position value
      const currentValueUSD = await this.calculateRealTimePositionValue(position);
      
      // Calculate days active
      const daysActive = this.calculateDaysActive(position.createdAt);
      
      // Get in-range multiplier
      const inRangeMultiplier = await this.calculateInRangeMultiplier(position);
      
      // Calculate concentration bonus
      const concentrationBonus = await this.calculateConcentrationBonus(position);
      
      // === MERKL-STYLE COMPONENTS ===
      
      // 1. Fee earnings component
      const feeEarningsComponent = await this.calculateFeeEarningsComponent(position, settings.feeWeight);
      
      // 2. Token0 component (KILT holdings during swaps)
      const token0Component = await this.calculateToken0Component(position, settings.token0Weight);
      
      // 3. Token1 component (ETH holdings during swaps)
      const token1Component = await this.calculateToken1Component(position, settings.token1Weight);
      
      // === KILT-STYLE COMPONENTS ===
      
      // 4. Liquidity share component
      const liquidityShareComponent = await this.calculateLiquidityShareComponent(position, settings.liquidityWeight);
      
      // 5. Time progression component
      const timeProgressionComponent = this.calculateTimeProgressionComponent(daysActive, treasuryConf.programDurationDays, settings.timeWeight);
      
      // === HYBRID CALCULATION ===
      
      // Merkl portion
      const merklPortion = settings.merklModeRatio * (
        feeEarningsComponent + 
        token0Component + 
        token1Component
      );
      
      // KILT portion
      const kiltPortion = (1 - settings.merklModeRatio) * (
        liquidityShareComponent + 
        timeProgressionComponent
      );
      
      // Combined daily reward
      const dailyBudget = treasuryConf.totalAllocation / treasuryConf.programDurationDays;
      const totalDailyReward = (merklPortion + kiltPortion) * dailyBudget * inRangeMultiplier * concentrationBonus;
      
      // Calculate effective APR
      const effectiveAPR = this.calculateEffectiveAPR(totalDailyReward, currentValueUSD);
      
      // Get accumulated rewards
      const accumulatedRewards = await this.getAccumulatedRewards(position.id);
      
      // Get fees earned in last 24h
      const feesEarned24h = await this.getFeesEarned24h(position.id);
      
      // Get total liquidity share
      const totalLiquidityShare = await this.getTotalLiquidityShare(position);

      return {
        positionId: position.id,
        nftTokenId,
        currentValueUSD,
        
        // Merkl-style components
        feeEarningsComponent,
        token0Component,
        token1Component,
        
        // KILT-style components
        liquidityShareComponent,
        timeProgressionComponent,
        
        // Hybrid result
        totalDailyReward,
        effectiveAPR,
        
        // Breakdown weights
        feeWeight: settings.feeWeight,
        token0Weight: settings.token0Weight,
        token1Weight: settings.token1Weight,
        liquidityWeight: settings.liquidityWeight,
        timeWeight: settings.timeWeight,
        
        // Multipliers
        inRangeMultiplier,
        concentrationBonus,
        
        // Metrics
        accumulatedRewards,
        daysActive,
        feesEarned24h,
        totalLiquidityShare,
        
        // Meta
        calculationMethod: 'hybrid',
        lastUpdateTimestamp: Date.now()
      };
      
    } catch (error) {
      console.error('Error calculating hybrid rewards:', error);
      throw error;
    }
  }

  /**
   * Calculate fee earnings component (Merkl approach)
   * Rewards based on fees earned by the position vs total pool fees
   */
  private async calculateFeeEarningsComponent(position: LpPosition, feeWeight: number): Promise<number> {
    try {
      // Get position fees earned in last 24h
      const positionFees = await this.database
        .select({ totalFees: sql<number>`COALESCE(SUM(CAST(amount_usd AS DECIMAL)), 0)` })
        .from(feeEvents)
        .where(
          and(
            eq(feeEvents.positionId, position.id),
            gte(feeEvents.timestamp, sql`NOW() - INTERVAL '24 hours'`)
          )
        );

      // Get total pool fees earned in last 24h
      const totalPoolFees = await this.database
        .select({ totalFees: sql<number>`COALESCE(SUM(CAST(amount_usd AS DECIMAL)), 0)` })
        .from(feeEvents)
        .innerJoin(lpPositions, eq(feeEvents.positionId, lpPositions.id))
        .where(
          and(
            eq(lpPositions.poolAddress, position.poolAddress),
            gte(feeEvents.timestamp, sql`NOW() - INTERVAL '24 hours'`)
          )
        );

      const userFees = positionFees[0]?.totalFees || 0;
      const poolFees = totalPoolFees[0]?.totalFees || 0;
      
      // Calculate fee share (F_u/F_T)
      const feeShare = poolFees > 0 ? userFees / poolFees : 0;
      
      return feeWeight * feeShare;
      
    } catch (error) {
      console.error('Error calculating fee earnings component:', error);
      return 0;
    }
  }

  /**
   * Calculate token0 component (KILT holdings during swaps)
   */
  private async calculateToken0Component(position: LpPosition, token0Weight: number): Promise<number> {
    try {
      // Get average token0 holdings during swaps in last 24h
      const userToken0Holdings = await this.calculateAverageToken0Holdings(position);
      const totalToken0Holdings = await this.calculateTotalToken0Holdings(position.poolAddress);
      
      // Calculate token0 share (T0_u/T0_T)
      const token0Share = totalToken0Holdings > 0 ? userToken0Holdings / totalToken0Holdings : 0;
      
      return token0Weight * token0Share;
      
    } catch (error) {
      console.error('Error calculating token0 component:', error);
      return 0;
    }
  }

  /**
   * Calculate token1 component (ETH holdings during swaps)
   */
  private async calculateToken1Component(position: LpPosition, token1Weight: number): Promise<number> {
    try {
      // Get average token1 holdings during swaps in last 24h
      const userToken1Holdings = await this.calculateAverageToken1Holdings(position);
      const totalToken1Holdings = await this.calculateTotalToken1Holdings(position.poolAddress);
      
      // Calculate token1 share (T1_u/T1_T)
      const token1Share = totalToken1Holdings > 0 ? userToken1Holdings / totalToken1Holdings : 0;
      
      return token1Weight * token1Share;
      
    } catch (error) {
      console.error('Error calculating token1 component:', error);
      return 0;
    }
  }

  /**
   * Calculate liquidity share component (KILT approach)
   */
  private async calculateLiquidityShareComponent(position: LpPosition, liquidityWeight: number): Promise<number> {
    try {
      const currentValueUSD = await this.calculateRealTimePositionValue(position);
      const totalActiveLiquidity = await this.getTotalActiveLiquidity();
      
      // Calculate liquidity share (L_u/L_T)
      const liquidityShare = totalActiveLiquidity > 0 ? currentValueUSD / totalActiveLiquidity : 0;
      
      return liquidityWeight * liquidityShare;
      
    } catch (error) {
      console.error('Error calculating liquidity share component:', error);
      return 0;
    }
  }

  /**
   * Calculate time progression component (KILT approach)
   */
  private calculateTimeProgressionComponent(daysActive: number, programDuration: number, timeWeight: number): number {
    // Time progression (D_u/P) - normalized to program duration
    const timeProgression = Math.min(daysActive / programDuration, 1.0);
    
    return timeWeight * timeProgression;
  }

  /**
   * Calculate concentration bonus for tighter ranges
   */
  private async calculateConcentrationBonus(position: LpPosition): Promise<number> {
    try {
      // Calculate range width as percentage of current price
      const priceRange = position.maxPrice - position.minPrice;
      const currentPrice = await realTimePriceService.getCurrentPrice('KILT/ETH');
      
      const rangeWidth = priceRange / currentPrice;
      
      // Concentration bonus: tighter ranges get higher bonus
      // Full range (100%) = 1.0x, 50% range = 1.2x, 10% range = 1.5x, 1% range = 2.0x
      const concentrationBonus = Math.max(1.0, Math.min(2.0, 1.0 + (1.0 - rangeWidth)));
      
      return concentrationBonus;
      
    } catch (error) {
      console.error('Error calculating concentration bonus:', error);
      return 1.0;
    }
  }

  /**
   * Get hybrid program settings with balanced defaults
   */
  private async getHybridProgramSettings(): Promise<HybridProgramSettings> {
    try {
      const [settings] = await this.database.select().from(programSettings).limit(1);
      
      return {
        // Merkl-style weights (60% of total allocation)
        feeWeight: 0.30,        // 30% based on fees earned
        token0Weight: 0.15,     // 15% based on KILT holdings
        token1Weight: 0.15,     // 15% based on ETH holdings
        
        // KILT-style weights (40% of total allocation)
        liquidityWeight: 0.25,  // 25% based on liquidity share
        timeWeight: 0.15,       // 15% based on time progression
        
        // Hybrid mode: 60% Merkl, 40% KILT
        merklModeRatio: 0.6,
        concentrationBonusEnabled: true,
        minimumPositionValue: settings?.minimumPositionValue || 0,
        lockPeriod: settings?.lockPeriod || 7,
        inRangeRequirement: settings?.inRangeRequirement ?? true
      };
      
    } catch (error) {
      console.error('Error getting hybrid program settings:', error);
      // Return balanced defaults
      return {
        feeWeight: 0.30,
        token0Weight: 0.15,
        token1Weight: 0.15,
        liquidityWeight: 0.25,
        timeWeight: 0.15,
        merklModeRatio: 0.6,
        concentrationBonusEnabled: true,
        minimumPositionValue: 0,
        lockPeriod: 7,
        inRangeRequirement: true
      };
    }
  }

  // Helper methods for treasury configuration, position values, etc.
  private async getTreasuryConfiguration(): Promise<any> {
    const [config] = await this.database.select().from(treasuryConfig).limit(1);
    return config || { totalAllocation: 500000, programDurationDays: 90 };
  }

  private async calculateRealTimePositionValue(position: LpPosition): Promise<number> {
    // Implementation from existing accurate-reward-calculator
    return 1000; // Placeholder
  }

  private calculateDaysActive(createdAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private async calculateInRangeMultiplier(position: LpPosition): Promise<number> {
    // Implementation from existing services
    return 1.0; // Placeholder
  }

  private async getAccumulatedRewards(positionId: number): Promise<number> {
    // Implementation from existing services
    return 0; // Placeholder
  }

  private async getFeesEarned24h(positionId: number): Promise<number> {
    // Implementation from existing services
    return 0; // Placeholder
  }

  private async getTotalLiquidityShare(position: LpPosition): Promise<number> {
    // Implementation from existing services
    return 0; // Placeholder
  }

  private async calculateAverageToken0Holdings(position: LpPosition): Promise<number> {
    // Calculate average KILT holdings during swaps
    return 0; // Placeholder
  }

  private async calculateTotalToken0Holdings(poolAddress: string): Promise<number> {
    // Calculate total KILT holdings in pool
    return 0; // Placeholder
  }

  private async calculateAverageToken1Holdings(position: LpPosition): Promise<number> {
    // Calculate average ETH holdings during swaps
    return 0; // Placeholder
  }

  private async calculateTotalToken1Holdings(poolAddress: string): Promise<number> {
    // Calculate total ETH holdings in pool
    return 0; // Placeholder
  }

  private async getTotalActiveLiquidity(): Promise<number> {
    // Implementation from existing services
    return 100000; // Placeholder
  }

  private calculateEffectiveAPR(dailyReward: number, positionValue: number): number {
    if (positionValue === 0) return 0;
    return (dailyReward * 365 / positionValue) * 100;
  }
}

export const hybridRewardService = new HybridRewardService(db);