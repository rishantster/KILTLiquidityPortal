import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';

/**
 * Simple Position Optimizer - No complex middleware chains
 */
export class SimplePositionOptimizer {
  private static cache = new LRUCache<string, any>({
    max: 500,
    ttl: 1000 * 60 // 60 seconds
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

    console.log(`🔄 Fetching fresh positions for: ${userAddress}`);
    
    try {
      // Add timeout protection
      const positions = await Promise.race([
        fetcher(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Position fetch timeout')), 10000)
        )
      ]);

      this.cache.set(cacheKey, positions);
      console.log(`💾 Cached ${positions?.length || 0} positions for: ${userAddress}`);
      
      return positions;
    } catch (error) {
      console.error(`❌ Position fetch failed for ${userAddress}:`, error);
      // Return empty array to prevent UI breaking
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
      ttl: '60 seconds'
    };
  }
}