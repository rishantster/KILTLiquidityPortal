/**
 * Performance cache to reduce API calls and improve loading speed
 */
class PerformanceCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static instance: PerformanceCache;

  static getInstance(): PerformanceCache {
    if (!PerformanceCache.instance) {
      PerformanceCache.instance = new PerformanceCache();
    }
    return PerformanceCache.instance;
  }

  set(key: string, data: any, ttl: number = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Preload critical data
  async preloadCriticalData(): Promise<void> {
    const criticalEndpoints = [
      '/api/kilt-data',
      '/api/rewards/maximum-apr',
      '/api/blockchain/config'
    ];

    try {
      const promises = criticalEndpoints.map(async (endpoint) => {
        const response = await fetch(endpoint);
        const data = await response.json();
        this.set(endpoint, data, 60000); // Cache for 1 minute
        return data;
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to preload critical data:', error);
    }
  }
}

export const performanceCache = PerformanceCache.getInstance();

// Enhanced fetch with caching
export async function cachedFetch(url: string, ttl: number = 30000): Promise<any> {
  const cached = performanceCache.get(url);
  if (cached) {
    return cached;
  }

  const response = await fetch(url);
  const data = await response.json();
  performanceCache.set(url, data, ttl);
  return data;
}