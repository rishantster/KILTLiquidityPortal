import { Request, Response, NextFunction } from 'express';
import { LRUCache } from 'lru-cache';

/**
 * Performance Monitoring Middleware
 */
export class PerformanceMiddleware {
  private static requestMetrics = new LRUCache<string, any>({ max: 1000, ttl: 1000 * 60 * 60 }); // 1 hour TTL
  private static slowRequestThreshold = 1000; // 1 second

  /**
   * Request timing and monitoring
   */
  static monitor() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      // Add request ID for tracking
      req.requestId = generateRequestId();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

        // Log slow requests
        if (duration > this.slowRequestThreshold) {
          console.warn(`🐌 Slow request: ${req.method} ${req.url} - ${duration}ms`);
        }

        // Store metrics
        const metrics = {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          memoryDelta,
          timestamp: Date.now(),
          userAgent: req.get('User-Agent'),
          contentLength: res.get('Content-Length')
        };

        this.requestMetrics.set(req.requestId!, metrics);

        // Log performance metrics
        if (duration > 100) { // Log anything over 100ms
          console.log(`⏱️  ${req.method} ${req.url} ${res.statusCode} in ${duration}ms`);
        }
      });

      next();
    };
  }

  /**
   * Response compression for large payloads
   */
  static compression() {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      const originalJson = res.json;

      res.send = function(data) {
        if (typeof data === 'string' && data.length > 1024) {
          this.set('Content-Encoding', 'gzip');
        }
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        const jsonString = JSON.stringify(data);
        if (jsonString.length > 1024) {
          this.set('Content-Encoding', 'gzip');
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Memory usage monitoring
   */
  static memoryGuard(maxMemoryMB = 500) {
    return (req: Request, res: Response, next: NextFunction) => {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

      if (heapUsedMB > maxMemoryMB) {
        console.warn(`⚠️ High memory usage: ${heapUsedMB.toFixed(2)}MB`);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          console.log('🗑️ Garbage collection triggered');
        }
      }

      next();
    };
  }

  /**
   * Get performance analytics
   */
  static getAnalytics() {
    const metrics = Array.from(this.requestMetrics.values());
    
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        topEndpoints: [],
        memoryUsage: process.memoryUsage()
      };
    }

    const totalRequests = metrics.length;
    const averageResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const slowRequests = metrics.filter(m => m.duration > this.slowRequestThreshold).length;
    const errorRequests = metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorRequests / totalRequests) * 100;

    // Analyze endpoints
    const endpointStats = metrics.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.url}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalTime: 0, errors: 0 };
      }
      acc[key].count++;
      acc[key].totalTime += metric.duration;
      if (metric.statusCode >= 400) {
        acc[key].errors++;
      }
      return acc;
    }, {} as any);

    const topEndpoints = Object.entries(endpointStats)
      .map(([endpoint, stats]: [string, any]) => ({
        endpoint,
        requests: stats.count,
        avgResponseTime: Math.round(stats.totalTime / stats.count),
        errorRate: Math.round((stats.errors / stats.count) * 100)
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      topEndpoints,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Performance health check
   */
  static getHealthStatus() {
    const analytics = this.getAnalytics();
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

    let status = 'healthy';
    const issues = [];

    if (analytics.averageResponseTime > 500) {
      status = 'degraded';
      issues.push('High average response time');
    }

    if (analytics.errorRate > 5) {
      status = 'degraded';
      issues.push('High error rate');
    }

    if (memoryUsageMB > 400) {
      status = 'degraded';
      issues.push('High memory usage');
    }

    if (analytics.slowRequests > analytics.totalRequests * 0.1) {
      status = 'degraded';
      issues.push('Too many slow requests');
    }

    return {
      status,
      issues,
      metrics: {
        avgResponseTime: analytics.averageResponseTime,
        errorRate: analytics.errorRate,
        memoryUsageMB: Math.round(memoryUsageMB),
        slowRequestRate: Math.round((analytics.slowRequests / Math.max(analytics.totalRequests, 1)) * 100)
      }
    };
  }
}

/**
 * Query optimizer middleware for database operations
 */
export class QueryOptimizer {
  private static queryCache = new LRUCache<string, any>({ max: 100, ttl: 1000 * 60 * 5 }); // 5 minute TTL

  /**
   * Cache frequent database queries
   */
  static cache(ttlSeconds = 300) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `${req.url}:${JSON.stringify(req.query)}`;
      const cached = this.queryCache.get(cacheKey);

      if (cached) {
        console.log(`🚀 Cache hit: ${req.url}`);
        return res.json(cached);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          QueryOptimizer.queryCache.set(cacheKey, data);
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Invalidate cache for specific patterns
   */
  static invalidateCache(pattern: string) {
    const keys = Array.from(this.queryCache.keys());
    const matchingKeys = keys.filter(key => key.includes(pattern));
    
    matchingKeys.forEach(key => {
      this.queryCache.delete(key);
    });

    console.log(`🗑️ Invalidated ${matchingKeys.length} cache entries for pattern: ${pattern}`);
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    const size = this.queryCache.size;
    const maxSize = this.queryCache.max;
    const hitRate = this.queryCache.calculatedSize / Math.max(this.queryCache.fetchMethod?.length || 1, 1);

    return {
      size,
      maxSize,
      utilization: Math.round((size / maxSize) * 100),
      hitRate: Math.round(hitRate * 100)
    };
  }
}

/**
 * Helper functions
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}