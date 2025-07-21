import { Request, Response } from 'express';
import { BlazingPositionCache } from './blazing-position-cache';
import { PositionCacheOptimizer } from './position-cache-optimizer';

/**
 * Performance monitoring endpoint for caching system
 */
export function setupCachePerformanceEndpoint(app: any) {
  // Cache performance stats
  app.get('/api/cache/performance', (req: Request, res: Response) => {
    try {
      const blazingStats = BlazingPositionCache.getStats();
      const optimizerStats = PositionCacheOptimizer.getStats();
      
      const stats = {
        timestamp: new Date().toISOString(),
        blazingCache: blazingStats,
        optimizer: optimizerStats,
        summary: {
          totalCacheSize: blazingStats.size + optimizerStats.size,
          overallHitRate: blazingStats.hitRate,
          recommendation: blazingStats.hitRate.replace('%', '') > '80' 
            ? 'Cache performing excellently' 
            : 'Consider increasing cache TTL'
        }
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get cache performance stats'
      });
    }
  });

  // Clear cache endpoint for testing
  app.post('/api/cache/clear/:userAddress', (req: Request, res: Response) => {
    try {
      const { userAddress } = req.params;
      
      const blazingCleared = BlazingPositionCache.clearUserCache(userAddress);
      const optimizerCleared = PositionCacheOptimizer.clearUserCache(userAddress);
      
      res.json({
        success: true,
        cleared: {
          blazingCache: blazingCleared,
          optimizer: optimizerCleared
        },
        message: `Cache cleared for ${userAddress}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache'
      });
    }
  });
}