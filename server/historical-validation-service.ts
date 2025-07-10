import { ethers } from 'ethers';

export interface HistoricalValidationResult {
  isValid: boolean;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  details: {
    creationPrice: number;
    rangeMin: number;
    rangeMax: number;
    isFullRange: boolean;
    priceAtCreation: number;
    balanceRatio: number;
    expectedRatio: number;
    tolerance: number;
  };
}

export interface PositionCreationData {
  nftTokenId: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  token0Amount: string;
  token1Amount: string;
  minPrice: number;
  maxPrice: number;
  poolAddress: string;
}

export class HistoricalValidationService {
  private readonly FULL_RANGE_MIN = 0.0001; // Effectively 0
  private readonly FULL_RANGE_MAX = 1000000; // Effectively infinite
  private readonly BALANCE_TOLERANCE = 0.05; // 5% tolerance for 50/50 ratio
  
  /**
   * Main validation function for position registration
   */
  async validateHistoricalPosition(
    nftTokenId: string,
    creationBlockNumber: number,
    transactionHash: string,
    token0Amount: string,
    token1Amount: string,
    minPrice: number,
    maxPrice: number,
    poolAddress: string
  ): Promise<HistoricalValidationResult> {
    try {
      // Step 1: Check if it's a full range position (auto-pass)
      const isFullRange = this.isFullRangePosition(minPrice, maxPrice);
      
      if (isFullRange) {
        return {
          isValid: true,
          reason: 'Full range position - automatically valid',
          confidence: 'high',
          details: {
            creationPrice: 0,
            rangeMin: minPrice,
            rangeMax: maxPrice,
            isFullRange: true,
            priceAtCreation: 0,
            balanceRatio: 0.5,
            expectedRatio: 0.5,
            tolerance: this.BALANCE_TOLERANCE
          }
        };
      }

      // Step 2: Get historical price at creation time
      const historicalPrice = await this.getHistoricalPrice(
        poolAddress,
        creationBlockNumber,
        transactionHash
      );

      if (!historicalPrice) {
        return {
          isValid: false,
          reason: 'Unable to retrieve historical price data',
          confidence: 'low',
          details: {
            creationPrice: 0,
            rangeMin: minPrice,
            rangeMax: maxPrice,
            isFullRange: false,
            priceAtCreation: 0,
            balanceRatio: 0,
            expectedRatio: 0.5,
            tolerance: this.BALANCE_TOLERANCE
          }
        };
      }

      // Step 3: Calculate expected vs actual token ratios
      const validation = this.validateTokenRatios(
        historicalPrice,
        token0Amount,
        token1Amount,
        minPrice,
        maxPrice
      );

      return {
        isValid: validation.isValid,
        reason: validation.reason,
        confidence: validation.confidence,
        details: {
          creationPrice: historicalPrice,
          rangeMin: minPrice,
          rangeMax: maxPrice,
          isFullRange: false,
          priceAtCreation: historicalPrice,
          balanceRatio: validation.actualRatio,
          expectedRatio: validation.expectedRatio,
          tolerance: this.BALANCE_TOLERANCE
        }
      };

    } catch (error) {
      console.error('Historical validation error:', error);
      return {
        isValid: false,
        reason: 'Validation service error',
        confidence: 'low',
        details: {
          creationPrice: 0,
          rangeMin: minPrice,
          rangeMax: maxPrice,
          isFullRange: false,
          priceAtCreation: 0,
          balanceRatio: 0,
          expectedRatio: 0.5,
          tolerance: this.BALANCE_TOLERANCE
        }
      };
    }
  }

  /**
   * Check if position is full range (auto-valid)
   */
  private isFullRangePosition(minPrice: number, maxPrice: number): boolean {
    return minPrice <= this.FULL_RANGE_MIN && maxPrice >= this.FULL_RANGE_MAX;
  }

  /**
   * Get historical price from multiple sources
   */
  private async getHistoricalPrice(
    poolAddress: string,
    blockNumber: number,
    transactionHash: string
  ): Promise<number | null> {
    try {
      // Method 1: Parse from transaction logs (most accurate)
      const priceFromLogs = await this.getPriceFromTransactionLogs(transactionHash);
      if (priceFromLogs) return priceFromLogs;

      // Method 2: Query pool state at specific block
      const priceFromPool = await this.getPriceFromPoolState(poolAddress, blockNumber);
      if (priceFromPool) return priceFromPool;

      // Method 3: Use external price APIs (fallback)
      const priceFromAPI = await this.getPriceFromExternalAPI(blockNumber);
      if (priceFromAPI) return priceFromAPI;

      return null;
    } catch (error) {
      console.error('Error getting historical price:', error);
      return null;
    }
  }

  /**
   * Extract price from transaction logs
   */
  private async getPriceFromTransactionLogs(transactionHash: string): Promise<number | null> {
    try {
      // This would connect to Base RPC and parse the transaction
      // For now, we'll simulate the logic
      
      // In production, this would:
      // 1. Get transaction receipt
      // 2. Parse Uniswap V3 Mint event logs
      // 3. Extract sqrtPriceX96 from the logs
      // 4. Convert to human-readable price
      
      console.log(`Would parse transaction logs for ${transactionHash}`);
      return null; // Placeholder - would return actual price
    } catch (error) {
      console.error('Error parsing transaction logs:', error);
      return null;
    }
  }

  /**
   * Get price from pool state at specific block
   */
  private async getPriceFromPoolState(poolAddress: string, blockNumber: number): Promise<number | null> {
    try {
      // This would query the Uniswap V3 pool contract at the specific block
      // For now, we'll simulate the logic
      
      console.log(`Would query pool ${poolAddress} at block ${blockNumber}`);
      return null; // Placeholder - would return actual price
    } catch (error) {
      console.error('Error querying pool state:', error);
      return null;
    }
  }

  /**
   * Get price from external APIs (fallback)
   */
  private async getPriceFromExternalAPI(blockNumber: number): Promise<number | null> {
    try {
      // This would use services like The Graph, Moralis, or similar
      // to get historical KILT price data
      
      console.log(`Would query external API for block ${blockNumber}`);
      return null; // Placeholder - would return actual price
    } catch (error) {
      console.error('Error querying external API:', error);
      return null;
    }
  }

  /**
   * Validate token ratios against expected 50/50 balance
   */
  private validateTokenRatios(
    historicalPrice: number,
    token0Amount: string,
    token1Amount: string,
    minPrice: number,
    maxPrice: number
  ): {
    isValid: boolean;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
    actualRatio: number;
    expectedRatio: number;
  } {
    try {
      // Convert amounts to numbers
      const amount0 = parseFloat(token0Amount);
      const amount1 = parseFloat(token1Amount);
      
      // Calculate USD values at creation time
      const value0USD = amount0 * historicalPrice; // KILT value
      const value1USD = amount1 * 2500; // ETH value (assuming ~$2500 ETH)
      
      const totalValue = value0USD + value1USD;
      const actualRatio = value0USD / totalValue;
      const expectedRatio = 0.5; // 50/50 balance

      // Check if price was within the range (concentrated liquidity)
      const priceInRange = historicalPrice >= minPrice && historicalPrice <= maxPrice;
      
      if (!priceInRange) {
        return {
          isValid: false,
          reason: 'Price was outside position range at creation - not providing liquidity',
          confidence: 'high',
          actualRatio,
          expectedRatio
        };
      }

      // Check if ratio is within tolerance
      const ratioDiff = Math.abs(actualRatio - expectedRatio);
      const isWithinTolerance = ratioDiff <= this.BALANCE_TOLERANCE;

      if (isWithinTolerance) {
        return {
          isValid: true,
          reason: `Balanced position: ${(actualRatio * 100).toFixed(1)}% / ${((1 - actualRatio) * 100).toFixed(1)}%`,
          confidence: 'high',
          actualRatio,
          expectedRatio
        };
      } else {
        return {
          isValid: false,
          reason: `Imbalanced position: ${(actualRatio * 100).toFixed(1)}% / ${((1 - actualRatio) * 100).toFixed(1)}% (>${this.BALANCE_TOLERANCE * 100}% tolerance)`,
          confidence: 'high',
          actualRatio,
          expectedRatio
        };
      }

    } catch (error) {
      console.error('Error validating token ratios:', error);
      return {
        isValid: false,
        reason: 'Error calculating token ratios',
        confidence: 'low',
        actualRatio: 0,
        expectedRatio: 0.5
      };
    }
  }

  /**
   * Batch validate multiple positions
   */
  async validateMultiplePositions(
    positions: PositionCreationData[]
  ): Promise<Map<string, HistoricalValidationResult>> {
    const results = new Map<string, HistoricalValidationResult>();
    
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (position) => {
        const result = await this.validateHistoricalPosition(
          position.nftTokenId,
          position.blockNumber,
          position.transactionHash,
          position.token0Amount,
          position.token1Amount,
          position.minPrice,
          position.maxPrice,
          position.poolAddress
        );
        return [position.nftTokenId, result] as const;
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(([nftTokenId, result]) => {
        results.set(nftTokenId, result);
      });
      
      // Small delay between batches
      if (i + batchSize < positions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Get validation summary for reporting
   */
  getValidationSummary(results: Map<string, HistoricalValidationResult>): {
    total: number;
    valid: number;
    invalid: number;
    fullRange: number;
    confidenceBreakdown: { high: number; medium: number; low: number };
  } {
    const total = results.size;
    let valid = 0;
    let invalid = 0;
    let fullRange = 0;
    const confidenceBreakdown = { high: 0, medium: 0, low: 0 };

    results.forEach((result) => {
      if (result.isValid) valid++;
      else invalid++;
      
      if (result.details.isFullRange) fullRange++;
      
      confidenceBreakdown[result.confidence]++;
    });

    return {
      total,
      valid,
      invalid,
      fullRange,
      confidenceBreakdown
    };
  }
}

export const historicalValidationService = new HistoricalValidationService();