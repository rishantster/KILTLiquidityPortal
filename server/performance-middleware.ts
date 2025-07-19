import { Request, Response, NextFunction } from 'express';
import compression from 'compression';

// Ultra-fast response compression middleware
export const compressionMiddleware = compression({
  level: 6, // Good balance of speed vs compression
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
});

// Response time optimization middleware
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.set('X-Response-Time', `${duration}ms`);
    
    // Log slow requests for optimization
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
};

// Cache headers for static content
export const cacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/api/')) {
    // API responses - short cache with revalidation
    res.set({
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      'ETag': `"${Date.now()}"`,
    });
  } else if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    // Static assets - long cache
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  }
  
  next();
};