/**
 * BLAZING FAST Position Cache System
 * Implements aggressive caching for position data with sub-second response times
 */

interface CachedPositionData {
  positions: any[];
  registeredPositions: any[];
  timestamp: number;
  expiry: number;
}

export class BlazingPositionCache {
  private cache = new Map<string, CachedPositionData>();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds
  private readonly PREFETCH_DURATION = 25 * 1000; // Start prefetching at 25 seconds

  constructor() {
    // Start cleanup timer
    setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  /**
   * Get cached position data or fetch fresh if expired
   */
  async getCachedPositions(
    userAddress: string,
    fetchFn: () => Promise<any[]>,
    fetchRegisteredFn: () => Promise<any[]>
  ): Promise<{ positions: any[]; registeredPositions: any[] }> {
    const key = userAddress.toLowerCase();
    const now = Date.now();
    const cached = this.cache.get(key);

    // Return cached data if still valid
    if (cached && now < cached.expiry) {
      console.log(`⚡ BLAZING CACHE HIT: ${userAddress} (${Math.round((cached.expiry - now) / 1000)}s remaining)`);
      return {
        positions: cached.positions,
        registeredPositions: cached.registeredPositions
      };
    }

    console.log(`🔄 CACHE MISS: Fetching fresh data for ${userAddress}`);
    const start = Date.now();

    try {
      // Fetch both in parallel for blazing speed
      const [positions, registeredPositions] = await Promise.all([
        fetchFn(),
        fetchRegisteredFn()
      ]);

      // Cache the results
      this.cache.set(key, {
        positions,
        registeredPositions,
        timestamp: now,
        expiry: now + this.CACHE_DURATION
      });

      const duration = Date.now() - start;
      console.log(`💾 CACHED: ${userAddress} in ${duration}ms (${positions.length} positions, ${registeredPositions.length} registered)`);

      return { positions, registeredPositions };
    } catch (error) {
      console.error(`❌ CACHE FETCH FAILED: ${userAddress}`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific user
   */
  invalidateUser(userAddress: string): void {
    const key = userAddress.toLowerCase();
    this.cache.delete(key);
    console.log(`🗑️ CACHE INVALIDATED: ${userAddress}`);
  }

  /**
   * Clear all cached data
   */
  clearAll(): void {
    this.cache.clear();
    console.log('🗑️ ALL CACHE CLEARED');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      totalCached: this.cache.size,
      cacheEntries: Array.from(this.cache.entries()).map(([key, data]) => ({
        address: key,
        positionCount: data.positions.length,
        registeredCount: data.registeredPositions.length,
        age: Math.round((Date.now() - data.timestamp) / 1000),
        expiresIn: Math.round((data.expiry - Date.now()) / 1000)
      }))
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, data] of this.cache.entries()) {
      if (now > data.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 CACHE CLEANUP: Removed ${cleaned} expired entries`);
    }
  }
}

// Export singleton instance
export const blazingPositionCache = new BlazingPositionCache();