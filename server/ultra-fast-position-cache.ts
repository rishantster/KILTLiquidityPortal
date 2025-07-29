// Ultra-fast position cache to eliminate database timeouts
import { LRUCache } from 'lru-cache';

interface CachedPositionData {
  positions: any[];
  userStats: any;
  eligibleCount: number;
  timestamp: number;
}

class UltraFastPositionCache {
  private positionCache = new LRUCache<string, CachedPositionData>({
    max: 1000,
    ttl: 2 * 60 * 1000, // 2 minutes cache
  });
  
  private userStatsCache = new LRUCache<string, any>({
    max: 500,
    ttl: 1 * 60 * 1000, // 1 minute cache for stats
  });

  getCachedPositions(address: string): CachedPositionData | null {
    const cached = this.positionCache.get(address.toLowerCase());
    if (cached && Date.now() - cached.timestamp < 120000) { // 2 minutes
      console.log(`⚡ ULTRA-FAST CACHE HIT: ${address} (${cached.positions.length} positions)`);
      return cached;
    }
    return null;
  }

  setCachedPositions(address: string, data: CachedPositionData) {
    data.timestamp = Date.now();
    this.positionCache.set(address.toLowerCase(), data);
    console.log(`💾 CACHED: ${address} with ${data.positions.length} positions`);
  }

  getCachedUserStats(userId: number): any | null {
    const cached = this.userStatsCache.get(`user_${userId}`);
    if (cached) {
      console.log(`⚡ STATS CACHE HIT: User ${userId}`);
      return cached;
    }
    return null;
  }

  setCachedUserStats(userId: number, stats: any) {
    this.userStatsCache.set(`user_${userId}`, stats);
    console.log(`💾 STATS CACHED: User ${userId}`);
  }

  clearUserCache(address: string) {
    this.positionCache.delete(address.toLowerCase());
    console.log(`🗑️ CLEARED CACHE: ${address}`);
  }

  clearAllCache() {
    this.positionCache.clear();
    this.userStatsCache.clear();
    console.log('🗑️ ALL CACHE CLEARED');
  }

  getStats() {
    return {
      positionCacheSize: this.positionCache.size,
      userStatsCacheSize: this.userStatsCache.size,
    };
  }
}

export const ultraFastCache = new UltraFastPositionCache();