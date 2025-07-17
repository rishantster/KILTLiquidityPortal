/**
 * Ultra-fast position caching system
 * Provides instant position data with background updates
 */
class PositionCache {
  private cache = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private static instance: PositionCache;

  static getInstance(): PositionCache {
    if (!PositionCache.instance) {
      PositionCache.instance = new PositionCache();
    }
    return PositionCache.instance;
  }

  // Get cached data instantly
  getInstant(key: string): any | null {
    return this.cache.get(key) || null;
  }

  // Set cache data
  set(key: string, data: any): void {
    this.cache.set(key, data);
  }

  // Get with background loading
  async getWithBackground(key: string, fetcher: () => Promise<any>): Promise<any> {
    // Return cached data immediately if available
    const cached = this.cache.get(key);
    
    // Start background fetch if not already loading
    if (!this.loadingPromises.has(key)) {
      const promise = fetcher().then(data => {
        this.cache.set(key, data);
        this.loadingPromises.delete(key);
        return data;
      }).catch(error => {
        this.loadingPromises.delete(key);
        throw error;
      });
      
      this.loadingPromises.set(key, promise);
    }

    // Return cached data or wait for fresh data
    return cached || await this.loadingPromises.get(key);
  }

  // Batch fetch multiple keys
  async batchFetch(keys: string[], fetchers: (() => Promise<any>)[]): Promise<any[]> {
    const results = await Promise.allSettled(
      keys.map((key, index) => this.getWithBackground(key, fetchers[index]))
    );
    
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );
  }

  // Clear cache
  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

export const positionCache = PositionCache.getInstance();

// Fast position fetcher with parallel processing
export async function fetchPositionsBlazingFast(address: string) {
  const keys = [
    `wallet-${address}`,
    `user-${address}`,
    `user-positions-${address}`
  ];

  const fetchers = [
    () => fetch(`/api/positions/wallet/${address}`).then(r => r.json()),
    () => fetch(`/api/users/${address}`).then(r => r.json()),
    () => fetch(`/api/users/${address}`).then(r => r.json()).then(user => 
      user?.id ? fetch(`/api/positions/user/${user.id}`).then(r => r.json()) : []
    )
  ];

  const [walletPositions, userData, userPositions] = await positionCache.batchFetch(keys, fetchers);

  // Combine and deduplicate
  const allPositions = [...(walletPositions || []), ...(userPositions || [])];
  const uniquePositions = allPositions.filter((pos, index, self) => 
    index === self.findIndex(p => p.nftTokenId === pos.nftTokenId)
  );

  return uniquePositions;
}