/**
 * Ultra-Fast Position Cache System
 * Aggressive caching to prevent slow position loading (77+ seconds)
 */

interface CachedPosition {
  data: any;
  timestamp: number;
}

interface CachedUserPositions {
  positions: any[];
  timestamp: number;
}

export class FastPositionCache {
  private static positionCache = new Map<string, CachedPosition>();
  private static userPositionsCache = new Map<string, CachedUserPositions>();
  
  // Ultra-aggressive cache duration for maximum speed
  private static readonly POSITION_CACHE_DURATION = 300000; // 5 minutes
  private static readonly USER_CACHE_DURATION = 180000; // 3 minutes
  
  // Cache individual position
  static cachePosition(tokenId: string, data: any): void {
    this.positionCache.set(tokenId, {
      data,
      timestamp: Date.now()
    });
  }
  
  // Get cached position
  static getCachedPosition(tokenId: string): any | null {
    const cached = this.positionCache.get(tokenId);
    if (cached && Date.now() - cached.timestamp < this.POSITION_CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }
  
  // Cache user positions
  static cacheUserPositions(userAddress: string, positions: any[]): void {
    this.userPositionsCache.set(userAddress.toLowerCase(), {
      positions,
      timestamp: Date.now()
    });
  }
  
  // Get cached user positions
  static getCachedUserPositions(userAddress: string): any[] | null {
    const cached = this.userPositionsCache.get(userAddress.toLowerCase());
    if (cached && Date.now() - cached.timestamp < this.USER_CACHE_DURATION) {
      console.log(`🚀 CACHE HIT: User positions for ${userAddress} (${cached.positions.length} positions)`);
      return cached.positions;
    }
    return null;
  }
  
  // Clear cache for user (for refresh button)
  static clearUserCache(userAddress: string): void {
    this.userPositionsCache.delete(userAddress.toLowerCase());
    
    // Clear all individual position caches for this user
    for (const [key] of this.positionCache.entries()) {
      if (key.includes(userAddress.toLowerCase())) {
        this.positionCache.delete(key);
      }
    }
    console.log(`🗑️ CACHE CLEARED: ${userAddress}`);
  }
  
  // Clear all caches
  static clearAllCaches(): void {
    this.positionCache.clear();
    this.userPositionsCache.clear();
    console.log('🗑️ ALL CACHES CLEARED');
  }
  
  // Get cache statistics
  static getCacheStats() {
    return {
      positionCount: this.positionCache.size,
      userCount: this.userPositionsCache.size,
      totalCacheSize: this.positionCache.size + this.userPositionsCache.size
    };
  }
}