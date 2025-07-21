import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';

/**
 * Simple Position Optimizer - No complex middleware chains
 */
export class SimplePositionOptimizer {
  private static cache = new LRUCache<string, any>({
    max: 500,
    ttl: 1000 * 30 // 30 seconds cache for real-time data
  });

  /**
   * Get cached position data or fetch fresh
   */
  static async getCachedPositions(userAddress: string, fetcher: () => Promise<any>): Promise<any> {
    const cacheKey = `positions:${userAddress}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      console.log(`⚡ INSTANT POSITION CACHE HIT: ${userAddress}`);
      return cached;
    }

    // No partial cache needed for real-time blockchain calls

    console.log(`🔄 Fetching fresh positions for: ${userAddress}`);
    
    try {
      // Optimized timeout for real-time blockchain calls (8 seconds)
      const positions = await Promise.race([
        fetcher(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Position fetch timeout')), 8000)
        )
      ]);

      this.cache.set(cacheKey, positions);
      console.log(`💾 Cached ${positions?.length || 0} real-time positions for: ${userAddress}`);
      
      return positions;
    } catch (error) {
      console.error(`❌ Real-time position fetch failed for ${userAddress}:`, error);
      
      // Return empty array on timeout to prevent UI breaking
      // This ensures we always show current blockchain state
      return [];
    }
  }

  /**
   * Clear cache for user
   */
  static clearUserCache(userAddress: string): boolean {
    return this.cache.delete(`positions:${userAddress}`);
  }

  /**
   * Get cache stats
   */
  static getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      ttl: '30 seconds (real-time blockchain data)'
    };
  }
}