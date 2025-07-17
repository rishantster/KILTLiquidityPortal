// Ultra-fast instant cache for positions
class InstantCache {
  private cache = new Map<string, any>();
  private timestamps = new Map<string, number>();

  set(key: string, value: any, ttl: number = 15000) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  }

  get(key: string) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() < timestamp) {
      return this.cache.get(key);
    }
    // Expired
    this.cache.delete(key);
    this.timestamps.delete(key);
    return null;
  }

  getInstant(key: string) {
    // Return immediately without TTL check for blazing speed
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
}

export const instantCache = new InstantCache();