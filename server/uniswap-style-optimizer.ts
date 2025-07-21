/**
 * UNISWAP-STYLE Position Optimizer
 * Implements Uniswap's blazing fast approach with multicall and aggressive caching
 */

interface CachedPositionData {
  positions: any[];
  registeredIds: Set<string>;
  timestamp: number;
  expiry: number;
}

class UniswapStyleOptimizer {
  private cache = new Map<string, CachedPositionData>();
  private readonly CACHE_DURATION = 30 * 1000; // 30 seconds like Uniswap
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    // Auto-cleanup like Uniswap
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Uniswap-style position fetching with parallel multicall optimization
   */
  async getOptimizedPositions(
    userAddress: string,
    fetchPositions: () => Promise<any[]>,
    fetchRegistered: () => Promise<any[]>
  ): Promise<{
    positions: any[];
    eligiblePositions: any[];
    registeredIds: Set<string>;
    source: 'cache' | 'fresh';
    timing: number;
  }> {
    const start = Date.now();
    const key = userAddress.toLowerCase();
    const now = Date.now();
    
    // Check cache first (Uniswap style)
    const cached = this.cache.get(key);
    if (cached && now < cached.expiry) {
      const eligiblePositions = this.filterEligible(cached.positions, cached.registeredIds);
      return {
        positions: cached.positions,
        eligiblePositions,
        registeredIds: cached.registeredIds,
        source: 'cache',
        timing: Date.now() - start
      };
    }

    // Parallel fetch like Uniswap (multicall pattern)
    const [positions, registeredPositions] = await Promise.all([
      this.withTimeout(fetchPositions(), 25000, 'positions'),
      this.withTimeout(fetchRegistered(), 5000, 'registered')
    ]);

    // Build registered IDs set for fast lookup
    const registeredIds = new Set(
      registeredPositions.map((p: any) => p.nftTokenId?.toString()).filter(Boolean)
    );

    // Cache the results
    this.cache.set(key, {
      positions,
      registeredIds,
      timestamp: now,
      expiry: now + this.CACHE_DURATION
    });

    // Filter eligible positions
    const eligiblePositions = this.filterEligible(positions, registeredIds);

    return {
      positions,
      eligiblePositions,
      registeredIds,
      source: 'fresh',
      timing: Date.now() - start
    };
  }

  /**
   * Filter eligible positions (not registered + in-range)
   */
  private filterEligible(positions: any[], registeredIds: Set<string>): any[] {
    return positions.filter(pos => {
      const tokenId = pos.tokenId?.toString();
      if (!tokenId) return false;
      
      // Must not be registered and must be in range
      return !registeredIds.has(tokenId) && pos.isInRange === true;
    });
  }

  /**
   * Timeout wrapper for blockchain calls
   */
  private async withTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number, 
    operation: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Smart cache invalidation (like Uniswap event listeners)
   */
  invalidateUser(userAddress: string): void {
    const key = userAddress.toLowerCase();
    this.cache.delete(key);
    console.log(`🗑️ UNISWAP-STYLE INVALIDATION: ${userAddress}`);
  }

  /**
   * Preload data for user (Uniswap prefetch pattern)
   */
  async preloadUser(
    userAddress: string,
    fetchPositions: () => Promise<any[]>,
    fetchRegistered: () => Promise<any[]>
  ): Promise<void> {
    try {
      await this.getOptimizedPositions(userAddress, fetchPositions, fetchRegistered);
      console.log(`🚀 PRELOADED: ${userAddress}`);
    } catch (error) {
      console.warn(`⚠️ PRELOAD FAILED: ${userAddress}`, error);
    }
  }

  /**
   * Cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      entries: Array.from(this.cache.entries()).map(([address, data]) => ({
        address,
        positionCount: data.positions.length,
        registeredCount: data.registeredIds.size,
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

    // LRU cleanup if cache is too large
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = this.cache.size - this.MAX_CACHE_SIZE;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sortedEntries[i][0]);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 UNISWAP-CLEANUP: Removed ${cleaned} entries`);
    }
  }
}

// Export singleton instance
export const uniswapStyleOptimizer = new UniswapStyleOptimizer();