/**
 * Position Cache Optimizer
 * Specialized caching for the extremely slow wallet positions endpoint
 */

import { QueryOptimizer } from './blazing-fast-optimizer';

interface CachedPosition {
  tokenId: string;
  poolAddress: string;
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  amount0: string;
  amount1: string;
  currentValueUSD: number;
  fees: { token0: string; token1: string };
  poolType: string;
  isKiltPosition: boolean;
  isActive: boolean;
  isInRange: boolean;
  positionStatus: string;
  isRegistered: boolean;
  createdViaApp: boolean;
}

interface WalletPositionCache {
  positions: CachedPosition[];
  lastUpdated: number;
  userAddress: string;
}

class PositionCacheOptimizer {
  private cache = new Map<string, WalletPositionCache>();
  private readonly CACHE_TTL = 30000; // 30 seconds for wallet positions
  private readonly MAX_CACHE_SIZE = 100;

  async getCachedWalletPositions(
    userAddress: string,
    fetchFunction: () => Promise<CachedPosition[]>
  ): Promise<CachedPosition[]> {
    const cacheKey = userAddress.toLowerCase();
    const cached = this.cache.get(cacheKey);
    
    // Return cached if fresh
    if (cached && Date.now() - cached.lastUpdated < this.CACHE_TTL) {
      return cached.positions;
    }
    
    // Fetch fresh data with heavy caching
    const cacheKeyDetailed = `wallet-positions-${userAddress}`;
    const positions = await QueryOptimizer.cachedQuery(
      cacheKeyDetailed,
      fetchFunction,
      60 // 1 minute cache in QueryOptimizer
    );
    
    // Update local cache
    this.cache.set(cacheKey, {
      positions,
      lastUpdated: Date.now(),
      userAddress
    });
    
    // Cleanup old cache entries
    this.cleanupCache();
    
    return positions;
  }

  private cleanupCache(): void {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return;
    
    // Remove oldest entries
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);
    
    const toRemove = entries.length - this.MAX_CACHE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  clearUserCache(userAddress: string): void {
    this.cache.delete(userAddress.toLowerCase());
  }

  clearAllCache(): void {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([address, data]) => ({
        address,
        positionCount: data.positions.length,
        age: Date.now() - data.lastUpdated,
        fresh: Date.now() - data.lastUpdated < this.CACHE_TTL
      }))
    };
  }
}

export const positionCacheOptimizer = new PositionCacheOptimizer();

// Parallel position fetching for multiple NFTs
export class ParallelPositionProcessor {
  static async processPositionsInParallel<T>(
    tokenIds: string[],
    processor: (tokenId: string) => Promise<T>,
    maxConcurrency: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];
    
    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i];
      
      const promise = processor(tokenId)
        .then(result => {
          results[i] = result;
        })
        .catch(error => {
          console.warn(`Position processing failed for token ${tokenId}:`, error.message);
          results[i] = null;
        });
      
      executing.push(promise);
      
      // Limit concurrency
      if (executing.length >= maxConcurrency || i === tokenIds.length - 1) {
        await Promise.allSettled(executing);
        executing.length = 0;
      }
    }
    
    return results.filter(r => r !== null);
  }
}

// Position status cache for rapid status checks
export class PositionStatusCache {
  private statusCache = new Map<string, { 
    isActive: boolean; 
    isInRange: boolean; 
    lastChecked: number 
  }>();
  
  private readonly STATUS_CACHE_TTL = 60000; // 1 minute for status
  
  async getPositionStatus(
    tokenId: string,
    statusChecker: () => Promise<{ isActive: boolean; isInRange: boolean }>
  ): Promise<{ isActive: boolean; isInRange: boolean }> {
    const cached = this.statusCache.get(tokenId);
    
    if (cached && Date.now() - cached.lastChecked < this.STATUS_CACHE_TTL) {
      return { isActive: cached.isActive, isInRange: cached.isInRange };
    }
    
    const status = await statusChecker();
    
    this.statusCache.set(tokenId, {
      ...status,
      lastChecked: Date.now()
    });
    
    return status;
  }
  
  clearCache(): void {
    this.statusCache.clear();
  }
}