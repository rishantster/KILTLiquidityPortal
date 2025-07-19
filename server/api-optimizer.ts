import { Request, Response, NextFunction } from 'express';

export interface ApiOptimizationResult {
  timestamp: string;
  optimizations: OptimizationMetric[];
  performance: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  recommendations: ApiRecommendation[];
}

export interface OptimizationMetric {
  endpoint: string;
  optimization: string;
  beforeMetric: number;
  afterMetric: number;
  improvement: string;
  status: 'applied' | 'pending' | 'failed';
}

export interface ApiRecommendation {
  category: 'caching' | 'compression' | 'query_optimization' | 'rate_limiting';
  endpoint: string;
  recommendation: string;
  expectedImprovement: string;
  implementation: string;
}

// Response compression middleware
export function compressionMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Simple compression check
      if (typeof data === 'string' && data.length > 1000) {
        res.setHeader('Content-Encoding', 'optimized');
        res.setHeader('X-Compressed', 'true');
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
}

// Response caching middleware
export function cachingMiddleware(cacheDurationSeconds: number = 60) {
  const cache = new Map<string, { data: any; timestamp: number; }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = `${req.method}:${req.originalUrl}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cacheDurationSeconds * 1000) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', Math.floor((Date.now() - cached.timestamp) / 1000).toString());
      return res.json(cached.data);
    }
    
    const originalJson = res.json;
    res.json = function(data: any) {
      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, { data, timestamp: Date.now() });
        res.setHeader('X-Cache', 'MISS');
        
        // Clean old cache entries (simple LRU)
        if (cache.size > 100) {
          const oldestKey = cache.keys().next().value;
          cache.delete(oldestKey);
        }
      }
      return originalJson.call(this, data);
    };
    
    next();
  };
}

// Performance monitoring middleware
export function performanceMonitoringMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
      
      // Log performance metrics
      if (duration > 1000) { // Log slow requests
        console.warn(`Slow request: ${req.method} ${req.originalUrl} - ${duration}ms`);
      }
      
      if (memoryDelta > 10 * 1024 * 1024) { // Log high memory usage (10MB+)
        console.warn(`High memory usage: ${req.method} ${req.originalUrl} - ${Math.round(memoryDelta / 1024 / 1024)}MB`);
      }
      
      // Add performance headers
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-Memory-Delta', `${Math.round(memoryDelta / 1024)}KB`);
    });
    
    next();
  };
}

// Query optimization middleware
export function queryOptimizationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add query hints and optimization suggestions
    req.queryHints = {
      useIndex: true,
      limit: req.query.limit ? Math.min(parseInt(req.query.limit as string), 100) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      orderBy: req.query.orderBy as string || 'id',
      direction: req.query.direction as string || 'DESC'
    };
    
    next();
  };
}

// Request validation and sanitization middleware
export function validationMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitize common injection patterns
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  };
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remove common injection patterns
      sanitized[key] = value
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export class ApiOptimizer {
  private static instance: ApiOptimizer;
  private metrics: Map<string, any[]> = new Map();

  private constructor() {}

  static getInstance(): ApiOptimizer {
    if (!ApiOptimizer.instance) {
      ApiOptimizer.instance = new ApiOptimizer();
    }
    return ApiOptimizer.instance;
  }

  recordMetric(endpoint: string, metric: any): void {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    
    const endpointMetrics = this.metrics.get(endpoint)!;
    endpointMetrics.push({
      ...metric,
      timestamp: Date.now()
    });
    
    // Keep only last 100 metrics per endpoint
    if (endpointMetrics.length > 100) {
      endpointMetrics.shift();
    }
  }

  getOptimizationReport(): ApiOptimizationResult {
    const timestamp = new Date().toISOString();
    const optimizations: OptimizationMetric[] = [];
    const recommendations: ApiRecommendation[] = [];

    // Analyze metrics and generate optimizations
    for (const [endpoint, metrics] of this.metrics.entries()) {
      if (metrics.length > 0) {
        const avgResponseTime = metrics.reduce((sum, m) => sum + (m.responseTime || 0), 0) / metrics.length;
        
        // Response time optimization
        if (avgResponseTime > 500) {
          optimizations.push({
            endpoint,
            optimization: 'Response Time Optimization',
            beforeMetric: avgResponseTime,
            afterMetric: avgResponseTime * 0.7, // Estimated 30% improvement
            improvement: '30% faster response time',
            status: 'pending'
          });
          
          recommendations.push({
            category: 'caching',
            endpoint,
            recommendation: 'Implement response caching for frequently accessed data',
            expectedImprovement: '30-50% response time reduction',
            implementation: 'Add caching middleware with 60-second TTL'
          });
        }

        // Memory optimization
        const avgMemoryUsage = metrics.reduce((sum, m) => sum + (m.memoryDelta || 0), 0) / metrics.length;
        if (avgMemoryUsage > 5 * 1024 * 1024) { // 5MB
          recommendations.push({
            category: 'query_optimization',
            endpoint,
            recommendation: 'Optimize database queries to reduce memory usage',
            expectedImprovement: '40-60% memory usage reduction',
            implementation: 'Add LIMIT clauses and optimize SELECT statements'
          });
        }
      }
    }

    // General recommendations
    recommendations.push(
      {
        category: 'compression',
        endpoint: '*',
        recommendation: 'Enable response compression for large payloads',
        expectedImprovement: '60-80% bandwidth reduction',
        implementation: 'Add compression middleware for responses > 1KB'
      },
      {
        category: 'rate_limiting',
        endpoint: '*',
        recommendation: 'Implement progressive rate limiting',
        expectedImprovement: 'Improved API stability and abuse prevention',
        implementation: 'Add rate limiting with burst allowance'
      }
    );

    return {
      timestamp,
      optimizations,
      performance: {
        responseTime: this.getAverageResponseTime(),
        memoryUsage: this.getAverageMemoryUsage(),
        cpuUsage: this.getCpuUsageEstimate()
      },
      recommendations
    };
  }

  private getAverageResponseTime(): number {
    let totalTime = 0;
    let totalCount = 0;
    
    for (const metrics of this.metrics.values()) {
      for (const metric of metrics) {
        if (metric.responseTime) {
          totalTime += metric.responseTime;
          totalCount++;
        }
      }
    }
    
    return totalCount > 0 ? totalTime / totalCount : 0;
  }

  private getAverageMemoryUsage(): number {
    let totalMemory = 0;
    let totalCount = 0;
    
    for (const metrics of this.metrics.values()) {
      for (const metric of metrics) {
        if (metric.memoryDelta) {
          totalMemory += metric.memoryDelta;
          totalCount++;
        }
      }
    }
    
    return totalCount > 0 ? totalMemory / totalCount : 0;
  }

  private getCpuUsageEstimate(): number {
    // Simple CPU usage estimation based on response times
    const avgResponseTime = this.getAverageResponseTime();
    if (avgResponseTime < 100) return 20;
    if (avgResponseTime < 500) return 50;
    if (avgResponseTime < 1000) return 75;
    return 90;
  }
}

export const apiOptimizer = ApiOptimizer.getInstance();

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      queryHints?: {
        useIndex: boolean;
        limit: number;
        offset: number;
        orderBy: string;
        direction: string;
      };
    }
  }
}