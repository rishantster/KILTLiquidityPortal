/**
 * Instant cache system for blazing fast position loading
 * Uses memory cache with background refresh
 */
class InstantCache {
  private static instance: InstantCache;
  private cache = new Map<string, any>();
  private loadingFlags = new Set<string>();
  private refreshTimers = new Map<string, NodeJS.Timeout>();

  static getInstance(): InstantCache {
    if (!InstantCache.instance) {
      InstantCache.instance = new InstantCache();
    }
    return InstantCache.instance;
  }

  // Get data instantly from cache or return null
  getInstant(key: string): any | null {
    return this.cache.get(key) || null;
  }

  // Set data in cache
  set(key: string, data: any): void {
    this.cache.set(key, data);
  }

  // Start background refresh for key
  startBackgroundRefresh(key: string, fetcher: () => Promise<any>, interval: number = 30000): void {
    // Clear existing timer
    if (this.refreshTimers.has(key)) {
      clearInterval(this.refreshTimers.get(key)!);
    }

    // Set new timer
    const timer = setInterval(async () => {
      if (!this.loadingFlags.has(key)) {
        this.loadingFlags.add(key);
        try {
          const data = await fetcher();
          this.cache.set(key, data);
        } catch (error) {
          console.error(`Background refresh failed for ${key}:`, error);
        } finally {
          this.loadingFlags.delete(key);
        }
      }
    }, interval);

    this.refreshTimers.set(key, timer);
  }

  // Load data with instant cache return
  async loadWithInstantReturn(key: string, fetcher: () => Promise<any>): Promise<any> {
    // Return cached data immediately if available
    const cached = this.cache.get(key);
    if (cached) {
      // Start background refresh if not already running
      if (!this.refreshTimers.has(key)) {
        this.startBackgroundRefresh(key, fetcher);
      }
      return cached;
    }

    // No cache, load data
    if (!this.loadingFlags.has(key)) {
      this.loadingFlags.add(key);
      try {
        const data = await fetcher();
        this.cache.set(key, data);
        this.startBackgroundRefresh(key, fetcher);
        return data;
      } catch (error) {
        console.error(`Initial load failed for ${key}:`, error);
        throw error;
      } finally {
        this.loadingFlags.delete(key);
      }
    }

    // Return empty array if loading in progress
    return [];
  }

  // Clear cache and timers
  clear(): void {
    this.cache.clear();
    this.loadingFlags.clear();
    this.refreshTimers.forEach(timer => clearInterval(timer));
    this.refreshTimers.clear();
  }
}

export const instantCache = InstantCache.getInstance();

// Fast position fetcher
export async function fetchPositionsInstantly(address: string) {
  const key = `positions-${address}`;
  
  const fetcher = async () => {
    const response = await fetch(`/api/positions/fast/${address}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch positions: ${response.status}`);
    }
    return response.json();
  };

  return instantCache.loadWithInstantReturn(key, fetcher);
}

// Preload positions
export function preloadPositionsInstantly(address: string) {
  const key = `positions-${address}`;
  
  // Silent background load
  fetch(`/api/positions/fast/${address}`)
    .then(response => response.json())
    .then(data => instantCache.set(key, data))
    .catch(error => console.error('Preload failed:', error));
}