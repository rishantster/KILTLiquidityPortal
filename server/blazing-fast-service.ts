import { performance } from 'perf_hooks';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class BlazingFastService {
  private static instance: BlazingFastService;
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();

  static getInstance(): BlazingFastService {
    if (!BlazingFastService.instance) {
      BlazingFastService.instance = new BlazingFastService();
    }
    return BlazingFastService.instance;
  }

  /**
   * Lightning-fast cached query with request deduplication
   */
  async cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttlSeconds: number = 30
  ): Promise<T> {
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // Check if request is already in progress (prevent duplicate API calls)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Execute query and cache result
    const promise = queryFn().then(data => {
      this.cache.set(key, { data, timestamp: now, expiresAt });
      this.pendingRequests.delete(key);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Parallel execution of multiple queries
   */
  async parallelQuery<T extends Record<string, any>>(
    queries: { [K in keyof T]: () => Promise<T[K]> }
  ): Promise<T> {
    const keys = Object.keys(queries) as (keyof T)[];
    const promises = keys.map(key => queries[key]());
    
    const results = await Promise.all(promises);
    
    const response = {} as T;
    keys.forEach((key, index) => {
      response[key] = results[index];
    });
    
    return response;
  }

  /**
   * Background refresh for critical data
   */
  async backgroundRefresh(key: string, queryFn: () => Promise<any>, ttlSeconds: number = 30): Promise<void> {
    try {
      const data = await queryFn();
      const now = Date.now();
      this.cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + (ttlSeconds * 1000)
      });
    } catch (error) {
      // Silent fail for background refresh
    }
  }

  /**
   * Preload critical data on server startup
   */
  async preloadCriticalData(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Import services dynamically to avoid circular dependencies
      const [
        { kiltPriceService },
        { uniswapIntegrationService },
        { blockchainConfigService }
      ] = await Promise.all([
        import('./kilt-price-service.js'),
        import('./uniswap-integration-service.js'),
        import('./blockchain-config-service.js')
      ]);

      // Preload all critical data in parallel
      await Promise.all([
        this.cachedQuery('kilt-price', () => kiltPriceService.getCurrentPrice(), 30),
        this.cachedQuery('pool-data', async () => {
          const poolAddress = await blockchainConfigService.getPoolAddress();
          return uniswapIntegrationService.getPoolData(poolAddress);
        }, 60),
        this.cachedQuery('blockchain-config', () => blockchainConfigService.getConfig(), 300),
      ]);

      const endTime = performance.now();
      console.log(`✓ Critical data preloaded in ${(endTime - startTime).toFixed(2)}ms`);
    } catch (error) {
      console.error('Failed to preload critical data:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; keys: string[] } {
    return {
      size: this.cache.size,
      hitRate: 0, // Could implement hit rate tracking
      keys: Array.from(this.cache.keys())
    };
  }
}

export const blazingFastService = BlazingFastService.getInstance();