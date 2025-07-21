import { LRUCache } from 'lru-cache';

/**
 * Position Cache Optimizer
 * Ultra-aggressive caching specifically for position data
 */
export class PositionCacheOptimizer {
  private static cache = new LRUCache<string, any>({
    max: 1000,
    ttl: 1000 * 45 // 45 second cache
  });

  private static backgroundRefreshRunning = false;

  /**
   * Get cached wallet positions with fallback to fresh fetch
   */
  static async getCachedWalletPositions(
    userAddress: string, 
    fetcher: () => Promise<any>
  ): Promise<any> {
    const cacheKey = `wallet-${userAddress}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      console.log(`⚡ Position cache hit for ${userAddress}`);
      
      // Background refresh if data is older than 30 seconds
      this.scheduleBackgroundRefresh(userAddress, fetcher);
      
      return cached;
    }

    console.log(`🔄 Fresh position fetch for ${userAddress}`);
    
    try {
      const positions = await Promise.race([
        fetcher(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Position fetch timeout')), 10000)
        )
      ]);

      this.cache.set(cacheKey, positions);
      return positions;
    } catch (error) {
      console.error(`Failed to fetch positions for ${userAddress}:`, error);
      
      // Return empty array on error to prevent UI breaking
      return [];
    }
  }

  /**
   * Background refresh to keep cache warm
   */
  private static scheduleBackgroundRefresh(userAddress: string, fetcher: () => Promise<any>) {
    if (this.backgroundRefreshRunning) return;

    this.backgroundRefreshRunning = true;
    
    setTimeout(async () => {
      try {
        console.log(`🔄 Background refresh for ${userAddress}`);
        const fresh = await fetcher();
        this.cache.set(`wallet-${userAddress}`, fresh);
        console.log(`✅ Background refresh completed for ${userAddress}`);
      } catch (error) {
        console.error(`Background refresh failed for ${userAddress}:`, error);
      } finally {
        this.backgroundRefreshRunning = false;
      }
    }, 30000); // 30 second delay
  }

  /**
   * Preload positions for active users
   */
  static async preloadActiveUsers(userAddresses: string[], fetcher: (addr: string) => Promise<any>) {
    console.log(`🚀 Preloading positions for ${userAddresses.length} users`);
    
    const promises = userAddresses.map(async (userAddress) => {
      try {
        const positions = await fetcher(userAddress);
        this.cache.set(`wallet-${userAddress}`, positions);
        console.log(`✅ Preloaded positions for ${userAddress}`);
      } catch (error) {
        console.error(`❌ Failed to preload ${userAddress}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log(`🎯 Preloading completed`);
  }

  /**
   * Clear cache for specific user
   */
  static clearUserCache(userAddress: string) {
    return this.cache.delete(`wallet-${userAddress}`);
  }

  /**
   * Get cache stats
   */
  static getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      ttl: '45 seconds'
    };
  }
}

export const positionCacheOptimizer = PositionCacheOptimizer;