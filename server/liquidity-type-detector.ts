import { ethers } from 'ethers';

export interface LiquidityTypeResult {
  type: 'double-sided' | 'single-sided' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  details: {
    token0Amount: string;
    token1Amount: string;
    token0AmountNormalized: number;
    token1AmountNormalized: number;
    balanceRatio: number;
    expectedRatio: number;
    deviation: number;
    isFullRange: boolean;
    currentPrice: number;
    rangeMin: number;
    rangeMax: number;
    isInRange: boolean;
    pricePosition: 'below' | 'within' | 'above';
  };
  reason: string;
}

export class LiquidityTypeDetector {
  private readonly BALANCE_TOLERANCE = 0.1; // 10% tolerance for double-sided detection
  private readonly SINGLE_SIDED_THRESHOLD = 0.05; // 5% threshold for single-sided detection
  private readonly FULL_RANGE_MIN = 0.0001;
  private readonly FULL_RANGE_MAX = 1000000;

  /**
   * Determine if a position is double-sided or single-sided liquidity
   */
  async detectLiquidityType(
    token0Amount: string,
    token1Amount: string,
    token0Decimals: number,
    token1Decimals: number,
    minPrice: number,
    maxPrice: number,
    currentPrice: number,
    poolAddress: string
  ): Promise<LiquidityTypeResult> {
    try {
      // Normalize token amounts to comparable values
      const token0AmountNormalized = parseFloat(ethers.formatUnits(token0Amount, token0Decimals));
      const token1AmountNormalized = parseFloat(ethers.formatUnits(token1Amount, token1Decimals));

      // Check if position is full range (always double-sided)
      const isFullRange = this.isFullRangePosition(minPrice, maxPrice);
      
      // Calculate balance ratio (token0 USD value / total USD value)
      const token0ValueUSD = token0AmountNormalized * currentPrice;
      const token1ValueUSD = token1AmountNormalized; // Assuming token1 is USD-pegged (ETH/USDC)
      const totalValueUSD = token0ValueUSD + token1ValueUSD;
      
      const balanceRatio = totalValueUSD > 0 ? token0ValueUSD / totalValueUSD : 0;

      // Determine current price position relative to range
      const pricePosition = this.determinePricePosition(currentPrice, minPrice, maxPrice);
      const isInRange = pricePosition === 'within';

      // Expected ratio for double-sided liquidity (around 0.5 for balanced)
      const expectedRatio = this.calculateExpectedRatio(currentPrice, minPrice, maxPrice);
      const deviation = Math.abs(balanceRatio - expectedRatio);

      // Detection logic
      let type: 'double-sided' | 'single-sided' | 'unknown';
      let confidence: 'high' | 'medium' | 'low';
      let reason: string;

      if (isFullRange) {
        // Full range positions are always double-sided
        type = 'double-sided';
        confidence = 'high';
        reason = 'Full range position - always double-sided liquidity';
      } else if (token0AmountNormalized === 0 || token1AmountNormalized === 0) {
        // One token is zero - definitely single-sided
        type = 'single-sided';
        confidence = 'high';
        reason = `Only ${token0AmountNormalized === 0 ? 'token1' : 'token0'} present - single-sided liquidity`;
      } else if (balanceRatio < this.SINGLE_SIDED_THRESHOLD) {
        // Almost all token1 - likely single-sided
        type = 'single-sided';
        confidence = 'high';
        reason = `${(balanceRatio * 100).toFixed(1)}% token0 - heavily single-sided toward token1`;
      } else if (balanceRatio > (1 - this.SINGLE_SIDED_THRESHOLD)) {
        // Almost all token0 - likely single-sided
        type = 'single-sided';
        confidence = 'high';
        reason = `${(balanceRatio * 100).toFixed(1)}% token0 - heavily single-sided toward token0`;
      } else if (deviation <= this.BALANCE_TOLERANCE) {
        // Close to expected ratio - double-sided
        type = 'double-sided';
        confidence = 'high';
        reason = `Balanced liquidity - ${(balanceRatio * 100).toFixed(1)}% token0, ${((1 - balanceRatio) * 100).toFixed(1)}% token1`;
      } else if (pricePosition === 'below') {
        // Price below range - mostly token1
        type = 'single-sided';
        confidence = 'medium';
        reason = `Price below range - position concentrated in token1 (${((1 - balanceRatio) * 100).toFixed(1)}%)`;
      } else if (pricePosition === 'above') {
        // Price above range - mostly token0
        type = 'single-sided';
        confidence = 'medium';
        reason = `Price above range - position concentrated in token0 (${(balanceRatio * 100).toFixed(1)}%)`;
      } else {
        // Moderate imbalance - could be either
        type = 'double-sided';
        confidence = 'medium';
        reason = `Moderate imbalance - ${(balanceRatio * 100).toFixed(1)}% token0, likely double-sided with price movement`;
      }

      return {
        type,
        confidence,
        details: {
          token0Amount,
          token1Amount,
          token0AmountNormalized,
          token1AmountNormalized,
          balanceRatio,
          expectedRatio,
          deviation,
          isFullRange,
          currentPrice,
          rangeMin: minPrice,
          rangeMax: maxPrice,
          isInRange,
          pricePosition
        },
        reason
      };
    } catch (error) {
      console.error('Error detecting liquidity type:', error);
      return {
        type: 'unknown',
        confidence: 'low',
        details: {
          token0Amount,
          token1Amount,
          token0AmountNormalized: 0,
          token1AmountNormalized: 0,
          balanceRatio: 0,
          expectedRatio: 0.5,
          deviation: 0,
          isFullRange: false,
          currentPrice: 0,
          rangeMin: minPrice,
          rangeMax: maxPrice,
          isInRange: false,
          pricePosition: 'unknown' as any
        },
        reason: 'Error analyzing liquidity type'
      };
    }
  }

  /**
   * Check if position is full range
   */
  private isFullRangePosition(minPrice: number, maxPrice: number): boolean {
    return minPrice <= this.FULL_RANGE_MIN && maxPrice >= this.FULL_RANGE_MAX;
  }

  /**
   * Determine price position relative to range
   */
  private determinePricePosition(
    currentPrice: number,
    minPrice: number,
    maxPrice: number
  ): 'below' | 'within' | 'above' {
    if (currentPrice < minPrice) return 'below';
    if (currentPrice > maxPrice) return 'above';
    return 'within';
  }

  /**
   * Calculate expected ratio for double-sided liquidity at current price
   */
  private calculateExpectedRatio(
    currentPrice: number,
    minPrice: number,
    maxPrice: number
  ): number {
    // For concentrated liquidity, the expected ratio depends on price position
    if (currentPrice <= minPrice) {
      // Price below range - expect mostly token1
      return 0.1; // 10% token0, 90% token1
    } else if (currentPrice >= maxPrice) {
      // Price above range - expect mostly token0
      return 0.9; // 90% token0, 10% token1
    } else {
      // Price within range - expect balanced liquidity
      // Calculate exact ratio based on price position within range
      const rangeSize = maxPrice - minPrice;
      const pricePosition = (currentPrice - minPrice) / rangeSize;
      
      // Linear interpolation from 0.1 to 0.9 based on price position
      return 0.1 + (pricePosition * 0.8);
    }
  }

  /**
   * Get recommendations for single-sided positions
   */
  getRecommendations(result: LiquidityTypeResult): string[] {
    const recommendations: string[] = [];

    if (result.type === 'single-sided') {
      recommendations.push('Single-sided positions may experience higher impermanent loss');
      recommendations.push('Consider rebalancing to double-sided liquidity for better risk management');
      
      if (result.details.pricePosition === 'below') {
        recommendations.push('Price is below your range - consider raising your price range');
      } else if (result.details.pricePosition === 'above') {
        recommendations.push('Price is above your range - consider lowering your price range');
      }
    } else if (result.type === 'double-sided') {
      recommendations.push('Well-balanced liquidity position');
      recommendations.push('Good risk management with diversified token exposure');
    }

    if (result.confidence === 'low') {
      recommendations.push('Consider manual verification of position composition');
    }

    return recommendations;
  }
}

export const liquidityTypeDetector = new LiquidityTypeDetector();