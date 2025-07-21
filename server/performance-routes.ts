import type { Express } from "express";
import { DatabaseOptimizer } from './database-optimizer';
import { PerformanceMiddleware, QueryOptimizer } from './performance-middleware';
import { ErrorHandler, asyncHandler, requestTimeout } from './error-handler';
import { PerformanceDashboard } from './performance-dashboard';

/**
 * Performance and health monitoring routes
 */
export function setupPerformanceRoutes(app: Express): void {
  // Apply global performance monitoring
  app.use(PerformanceMiddleware.monitor());
  app.use(PerformanceMiddleware.compression());
  app.use(PerformanceMiddleware.memoryGuard(400)); // 400MB limit
  app.use(requestTimeout(30000)); // 30 second timeout

  // Performance analytics endpoint
  app.get('/api/performance/analytics', asyncHandler(async (req, res) => {
    const analytics = PerformanceMiddleware.getAnalytics();
    const cacheStats = QueryOptimizer.getCacheStats();
    const dbHealth = await DatabaseOptimizer.getHealthStatus();

    res.json({
      success: true,
      data: {
        requests: analytics,
        cache: cacheStats,
        database: dbHealth,
        timestamp: new Date().toISOString()
      }
    });
  }));

  // Health check endpoint
  app.get('/api/health', asyncHandler(async (req, res) => {
    const healthStatus = PerformanceMiddleware.getHealthStatus();
    const dbHealth = await DatabaseOptimizer.getHealthStatus();

    const overallStatus = healthStatus.status === 'healthy' && 
                         dbHealth.connectionPool.total > 0 ? 'healthy' : 'degraded';

    res.json({
      success: true,
      status: overallStatus,
      checks: {
        api: healthStatus,
        database: {
          status: dbHealth.connectionPool.total > 0 ? 'healthy' : 'down',
          connections: dbHealth.connectionPool,
          performance: dbHealth.queryPerformance
        },
        timestamp: new Date().toISOString()
      }
    });
  }));

  // Database optimization endpoint (admin only)
  app.post('/api/admin/optimize-database', asyncHandler(async (req, res) => {
    // Add authentication check here in production
    
    const indexResults = await DatabaseOptimizer.optimizeIndexes();
    const cleanupResults = await DatabaseOptimizer.cleanupOldData();

    res.json({
      success: true,
      data: {
        indexes: indexResults,
        cleanup: cleanupResults,
        recommendations: await DatabaseOptimizer.getHealthStatus()
      }
    });
  }));

  // Cache management endpoint
  app.post('/api/admin/clear-cache', asyncHandler(async (req, res) => {
    const { pattern } = req.body;
    
    if (pattern) {
      QueryOptimizer.invalidateCache(pattern);
      res.json({ 
        success: true, 
        message: `Cache cleared for pattern: ${pattern}` 
      });
    } else {
      // Clear all cache
      QueryOptimizer.invalidateCache('');
      res.json({ 
        success: true, 
        message: 'All cache cleared' 
      });
    }
  }));

  // Performance dashboard endpoints
  app.get('/api/performance/overview', PerformanceDashboard.getOverview);
  app.get('/api/performance/endpoints', PerformanceDashboard.getEndpointPerformance);
  app.get('/api/performance/database', PerformanceDashboard.getDatabaseStatus);
  app.post('/api/performance/optimize', PerformanceDashboard.runOptimizations);

  // Apply query caching to performance-critical routes
  app.use('/api/rewards/program-analytics', QueryOptimizer.cache(120)); // 2 minute cache
  app.use('/api/rewards/maximum-apr', QueryOptimizer.cache(180)); // 3 minute cache
  app.use('/api/kilt-data', QueryOptimizer.cache(60)); // 1 minute cache
  app.use('/api/trading-fees/pool-apr', QueryOptimizer.cache(300)); // 5 minute cache
}