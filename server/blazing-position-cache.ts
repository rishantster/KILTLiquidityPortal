import { LRUCache } from 'lru-cache';
import { Request, Response, NextFunction } from 'express';

/**
 * Blazing Fast Position Cache System
 * Specifically designed to eliminate 30+ second position loading times
 */
export class BlazingPositionCache {
  // Ultra-aggressive cache with 60 second TTL
  private static cache = new LRUCache<string, any>({
    max: 500, // Store up to 500 position queries
    ttl: 1000 * 60 // 60 seconds cache
  });

  private static hitCount = 0;
  private static missCount = 0;

  /**
   * Middleware for instant position responses
   */
  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Only cache position wallet endpoints
      if (req.method !== 'GET' || !req.path.includes('/positions/wallet/')) {
        return next();
      }

      const cacheKey = `wallet-positions:${req.params.userAddress}`;
      const cached = this.cache.get(cacheKey);

      if (cached) {
        this.hitCount++;
        const hitRate = ((this.hitCount / (this.hitCount + this.missCount)) * 100).toFixed(1);
        
        console.log(`🚀 INSTANT POSITION RESPONSE: ${req.path} (Cache hit rate: ${hitRate}%)`);
        
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Hit-Rate', `${hitRate}%`);
        res.setHeader('X-Response-Time', '0ms');
        
        return res.json(cached);
      }

      this.missCount++;
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200 && data) {
          BlazingPositionCache.cache.set(cacheKey, data);
          console.log(`💾 Position data cached for ${req.params.userAddress}`);
          
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-Status', 'STORED');
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Clear cache for specific user
   */
  static clearUserCache(userAddress: string) {
    const cacheKey = `wallet-positions:${userAddress}`;
    const deleted = this.cache.delete(cacheKey);
    console.log(`🗑️ Cleared position cache for ${userAddress}: ${deleted ? 'success' : 'not found'}`);
    return deleted;
  }

  /**
   * Get cache statistics
   */
  static getStats() {
    const hitRate = this.hitCount + this.missCount > 0 
      ? ((this.hitCount / (this.hitCount + this.missCount)) * 100).toFixed(1) 
      : '0.0';

    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: `${hitRate}%`,
      ttl: '60 seconds'
    };
  }

  /**
   * Preload positions for a user (background task)
   */
  static async preloadUserPositions(userAddress: string, fetcher: () => Promise<any>) {
    try {
      const cacheKey = `wallet-positions:${userAddress}`;
      
      if (!this.cache.has(cacheKey)) {
        console.log(`🔄 Preloading positions for ${userAddress}...`);
        const positions = await fetcher();
        this.cache.set(cacheKey, positions);
        console.log(`✅ Preloaded ${positions?.length || 0} positions for ${userAddress}`);
      }
    } catch (error) {
      console.error(`❌ Failed to preload positions for ${userAddress}:`, error);
    }
  }
}

/**
 * Timeout protection middleware for position endpoints
 */
export function positionTimeoutMiddleware(timeoutMs = 12000) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.includes('/positions/')) {
      return next();
    }

    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error(`⏰ POSITION TIMEOUT: ${req.path} exceeded ${timeoutMs}ms`);
        
        res.status(408).json({
          success: false,
          error: 'Position loading timed out',
          message: 'Request exceeded maximum time limit',
          timeout: true,
          timeoutMs
        });
      }
    }, timeoutMs);

    // Clean up timeout on response completion
    const cleanup = () => clearTimeout(timeout);
    res.on('finish', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);

    next();
  };
}

/**
 * Performance monitoring for position endpoints
 */
export function positionPerformanceMonitor() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.includes('/positions/wallet/')) {
      return next();
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed;
      const memoryDelta = Math.round((endMemory - startMemory) / 1024 / 1024 * 100) / 100;

      // Log performance metrics
      const perfLog = `📊 POSITION PERF: ${req.path} | ${duration}ms | ${memoryDelta}MB | Status: ${res.statusCode}`;
      
      if (duration > 15000) {
        console.error(`🚨 CRITICAL SLOW: ${perfLog}`);
      } else if (duration > 5000) {
        console.warn(`⚠️ SLOW: ${perfLog}`);
      } else if (duration < 1000) {
        console.log(`🚀 FAST: ${perfLog}`);
      } else {
        console.log(perfLog);
      }

      // Set performance headers
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-Memory-Delta', `${memoryDelta}MB`);
    });

    next();
  };
}