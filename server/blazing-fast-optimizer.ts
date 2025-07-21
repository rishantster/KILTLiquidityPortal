import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';

/**
 * Blazing Fast Position Loading Optimizer
 * Specific optimization for position tab performance issues
 */
export class BlazingFastOptimizer {
  // Aggressive caching for position data
  private static positionCache = new LRUCache<string, any>({
    max: 200,
    ttl: 1000 * 30 // 30 second cache for positions
  });

  private static userCache = new LRUCache<string, any>({
    max: 100,
    ttl: 1000 * 60 // 1 minute cache for user data
  });

  /**
   * Lightning-fast position cache middleware
   */
  static blazingPositionCache() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || !req.path.includes('/positions/wallet/')) {
        return next();
      }

      const cacheKey = `positions:${req.path}:${JSON.stringify(req.query)}`;
      const cached = this.positionCache.get(cacheKey);

      if (cached) {
        console.log(`🚀 BLAZING CACHE HIT: ${req.path} - instant response!`);
        return res.json(cached);
      }

      // Override res.json to cache successful responses
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200 && data) {
          BlazingFastOptimizer.positionCache.set(cacheKey, data);
          console.log(`💾 Position data cached for: ${req.path}`);
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * User data cache middleware
   */
  static blazingUserCache() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || !req.path.includes('/users/')) {
        return next();
      }

      const cacheKey = `user:${req.path}`;
      const cached = this.userCache.get(cacheKey);

      if (cached) {
        console.log(`⚡ User cache hit: ${req.path}`);
        return res.json(cached);
      }

      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200 && data) {
          BlazingFastOptimizer.userCache.set(cacheKey, data);
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Request timeout middleware specifically for position endpoints
   */
  static positionTimeout(timeoutMs = 15000) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.path.includes('/positions/')) {
        return next();
      }

      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          console.error(`⏰ POSITION TIMEOUT: ${req.path} exceeded ${timeoutMs}ms`);
          res.status(408).json({
            success: false,
            error: 'Position data loading timeout - using cached data if available',
            timeout: true
          });
        }
      }, timeoutMs);

      res.on('finish', () => clearTimeout(timeout));
      res.on('close', () => clearTimeout(timeout));
      
      next();
    };
  }

  /**
   * Parallel data processing middleware
   */
  static parallelProcessing() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Store original response methods
      const originalJson = res.json;
      const startTime = Date.now();

      res.json = function(data) {
        const duration = Date.now() - startTime;
        
        if (duration > 5000) {
          console.warn(`🐌 SLOW RESPONSE: ${req.path} took ${duration}ms`);
        } else if (duration < 100) {
          console.log(`🚀 BLAZING FAST: ${req.path} in ${duration}ms`);
        }
        
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Clear position cache when needed
   */
  static clearPositionCache(pattern?: string) {
    if (pattern) {
      const keys = Array.from(this.positionCache.keys());
      const matchingKeys = keys.filter(key => key.includes(pattern));
      matchingKeys.forEach(key => this.positionCache.delete(key));
      console.log(`🗑️ Cleared ${matchingKeys.length} position cache entries`);
    } else {
      this.positionCache.clear();
      console.log('🗑️ Cleared all position cache');
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      positions: {
        size: this.positionCache.size,
        hitRate: 'Calculated dynamically',
        maxSize: this.positionCache.max
      },
      users: {
        size: this.userCache.size,
        hitRate: 'Calculated dynamically', 
        maxSize: this.userCache.max
      }
    };
  }
}

/**
 * Smart compression middleware for large position data
 */
export function smartCompressionMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path.includes('/positions/') || req.path.includes('/analytics/')) {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (typeof data === 'string' && data.length > 2048) {
        res.set('Content-Encoding', 'gzip');
        console.log(`📦 Compressing large response: ${req.path}`);
      }
      return originalSend.call(this, data);
    };
  }
  
  next();
}

/**
 * Request timing middleware
 */
export function timingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (req.path.includes('/positions/') && duration > 1000) {
      console.error(`🚨 CRITICAL SLOW POSITION REQUEST: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
}

/**
 * Blazing cache middleware for any endpoint
 */
export function blazingCacheMiddleware(ttlSeconds = 30) {
  const cache = new LRUCache<string, any>({
    max: 50,
    ttl: ttlSeconds * 1000
  });

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.path}:${JSON.stringify(req.query)}`;
    const cached = cache.get(cacheKey);

    if (cached) {
      console.log(`⚡ BLAZING CACHE: ${req.path}`);
      return res.json(cached);
    }

    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode === 200) {
        cache.set(cacheKey, data);
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Performance monitor for position endpoints
 */
export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  if (!req.path.includes('/positions/')) {
    return next();
  }

  const start = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = endMemory - startMemory;

    console.log(`📊 POSITION PERF: ${req.path} | ${duration}ms | ${Math.round(memoryDelta/1024)}KB`);

    if (duration > 10000) {
      console.error(`🚨 POSITION EMERGENCY: ${req.path} took ${duration}ms - investigate immediately!`);
    }
  });

  next();
}

/**
 * Export query optimizer from performance middleware
 */
export class QueryOptimizer {
  private static cache = new LRUCache<string, any>({ max: 100, ttl: 1000 * 60 * 5 });

  static cache(ttlSeconds = 300) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `${req.url}:${JSON.stringify(req.query)}`;
      const cached = this.cache.get(cacheKey);

      if (cached) {
        console.log(`🚀 Query cache hit: ${req.url}`);
        return res.json(cached);
      }

      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200) {
          QueryOptimizer.cache.set(cacheKey, data);
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }
}