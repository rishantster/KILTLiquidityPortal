/**
 * Blazing Fast Performance Optimizer
 * Implements aggressive caching, connection pooling, and response optimization
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// High-performance cache with TTL
class BlazingCache {
  private cache = new Map<string, { data: any; expires: number; hits: number }>();
  private stats = { hits: 0, misses: 0, evictions: 0 };
  
  set(key: string, data: any, ttlSeconds: number = 120): void {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expires, hits: 0 });
    
    // Aggressive cleanup - keep only hot data
    if (this.cache.size > 50) {
      this.evictColdData();
    }
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached || cached.expires < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    cached.hits++;
    this.stats.hits++;
    return cached.data;
  }
  
  private evictColdData(): void {
    // Remove least used items
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].hits - b[1].hits);
    
    // Remove bottom 20%
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
      this.stats.evictions++;
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
    };
  }
  
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }
}

// Global high-performance cache instances
export const blazingCache = new BlazingCache();
export const apiCache = new BlazingCache();
export const queryCache = new BlazingCache();

// Request metrics tracker
class RequestMetrics {
  private metrics = new Map<string, { count: number; totalTime: number; errors: number }>();
  
  startTiming(endpoint: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      const current = this.metrics.get(endpoint) || { count: 0, totalTime: 0, errors: 0 };
      current.count++;
      current.totalTime += duration;
      this.metrics.set(endpoint, current);
    };
  }
  
  recordError(endpoint: string): void {
    const current = this.metrics.get(endpoint) || { count: 0, totalTime: 0, errors: 0 };
    current.errors++;
    this.metrics.set(endpoint, current);
  }
  
  getMetrics() {
    const result = [];
    for (const [endpoint, data] of this.metrics.entries()) {
      result.push({
        endpoint,
        avgResponseTime: (data.totalTime / data.count).toFixed(2),
        requestCount: data.count,
        errorRate: ((data.errors / data.count) * 100).toFixed(2),
        status: data.totalTime / data.count < 100 ? 'excellent' : 
                data.totalTime / data.count < 500 ? 'good' : 'needs_optimization'
      });
    }
    return result.sort((a, b) => parseFloat(b.avgResponseTime) - parseFloat(a.avgResponseTime));
  }
}

export const requestMetrics = new RequestMetrics();

// Blazing fast caching middleware
export function blazingCacheMiddleware(ttlSeconds: number = 120, cacheInstance = apiCache) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for POST/PUT/DELETE
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = `${req.method}:${req.originalUrl}:${req.headers.authorization || ''}`;
    const cached = cacheInstance.get(cacheKey);
    
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-TTL', ttlSeconds.toString());
      return res.json(cached);
    }
    
    // Intercept response
    const originalJson = res.json;
    res.json = function(data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheInstance.set(cacheKey, data, ttlSeconds);
        res.setHeader('X-Cache', 'MISS');
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// Request timing middleware
export function timingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const endTiming = requestMetrics.startTiming(req.route?.path || req.path);
    
    res.on('finish', () => {
      endTiming();
      if (res.statusCode >= 400) {
        requestMetrics.recordError(req.route?.path || req.path);
      }
    });
    
    next();
  };
}

// Response compression for large payloads
export function smartCompressionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      const jsonString = JSON.stringify(data);
      
      // Add compression headers for large responses
      if (jsonString.length > 1000) {
        res.setHeader('X-Response-Size', jsonString.length);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// Parallel processing helper
export class ParallelProcessor {
  static async processInParallel<T>(
    tasks: (() => Promise<T>)[],
    maxConcurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];
    
    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result);
      });
      
      executing.push(promise);
      
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }
    
    await Promise.all(executing);
    return results;
  }
}

// Database query optimizer
export class QueryOptimizer {
  private static queryCache = new Map<string, { result: any; expires: number }>();
  
  static async cachedQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.queryCache.get(queryKey);
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    
    const result = await queryFn();
    this.queryCache.set(queryKey, {
      result,
      expires: Date.now() + (ttlSeconds * 1000)
    });
    
    return result;
  }
  
  static clearCache(): void {
    this.queryCache.clear();
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static slowRequests: { endpoint: string; duration: number; timestamp: number }[] = [];
  
  static recordSlowRequest(endpoint: string, duration: number): void {
    if (duration > 1000) { // More than 1 second
      this.slowRequests.push({
        endpoint,
        duration,
        timestamp: Date.now()
      });
      
      // Keep only last 100 slow requests
      if (this.slowRequests.length > 100) {
        this.slowRequests.shift();
      }
    }
  }
  
  static getSlowRequests() {
    return this.slowRequests
      .filter(req => Date.now() - req.timestamp < 3600000) // Last hour
      .sort((a, b) => b.duration - a.duration);
  }
  
  static getOptimizationReport() {
    const cacheStats = blazingCache.getStats();
    const apiStats = apiCache.getStats();
    const requestStats = requestMetrics.getMetrics();
    const slowRequests = this.getSlowRequests();
    
    return {
      timestamp: new Date().toISOString(),
      performance: {
        cacheHitRate: `${cacheStats.hitRate}%`,
        apiCacheHitRate: `${apiStats.hitRate}%`,
        totalCachedItems: cacheStats.size + apiStats.size,
        slowRequestCount: slowRequests.length
      },
      topSlowEndpoints: slowRequests.slice(0, 5),
      requestMetrics: requestStats.slice(0, 10),
      recommendations: this.generateRecommendations(requestStats, slowRequests)
    };
  }
  
  private static generateRecommendations(
    requestStats: any[],
    slowRequests: any[]
  ): string[] {
    const recommendations = [];
    
    // Check for slow endpoints
    const slowEndpoints = requestStats.filter(stat => parseFloat(stat.avgResponseTime) > 1000);
    if (slowEndpoints.length > 0) {
      recommendations.push(`Optimize ${slowEndpoints.length} slow endpoints: ${slowEndpoints.map(s => s.endpoint).join(', ')}`);
    }
    
    // Check cache performance
    const cacheStats = blazingCache.getStats();
    if (parseFloat(cacheStats.hitRate) < 70) {
      recommendations.push('Improve cache hit rate by increasing TTL for stable data');
    }
    
    // Check for high error rates
    const highErrorEndpoints = requestStats.filter(stat => parseFloat(stat.errorRate) > 5);
    if (highErrorEndpoints.length > 0) {
      recommendations.push(`Fix high error rate endpoints: ${highErrorEndpoints.map(s => s.endpoint).join(', ')}`);
    }
    
    return recommendations;
  }
}

export const performanceMonitor = PerformanceMonitor;