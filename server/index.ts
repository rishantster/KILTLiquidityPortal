import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurity, errorHandler, validateEnvironment } from "./security-middleware";
// Removed performance-routes - cleaned up during optimization
import { enhancedErrorHandler } from "./error-handler";
// Removed database-optimizer - cleaned up during optimization
import { kiltPriceService } from "./kilt-price-service.js";
import { blockchainConfigService } from "./blockchain-config-service";
import { FixedRewardService } from "./fixed-reward-service";
import compression from "compression";
import cookieParser from "cookie-parser";

// Validate environment variables first
validateEnvironment();

// Initialize KILT price service for background price fetching
kiltPriceService; // This will start the background price fetching

// Initialize blockchain configuration with defaults
blockchainConfigService.initializeDefaults();

// Initialize position lifecycle service for automatic position management
import("./position-lifecycle-service");

// Initialize blockchain sync validator for data integrity at scale
setTimeout(async () => {
  try {
    const { blockchainSyncValidator } = await import("./blockchain-sync-validator");
    blockchainSyncValidator.start();
    console.log('🛡️ Blockchain Sync Validator started for production-scale data integrity');
  } catch (error) {
    console.error('❌ Failed to start Blockchain Sync Validator:', error);
  }
}, 5000); // Start after other services

// Removed db-migration-optimizer - cleaned up during optimization

// Initialize reward service for background updates
let rewardService: FixedRewardService | null = null;
setTimeout(async () => {
  try {
    const { getDatabase } = await import('./storage');
    const db = getDatabase();
    rewardService = new FixedRewardService();
    console.log('🎯 Reward service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize reward service:', error);
  }
}, 2000);

// Background service monitoring (simplified for deployment stability)
async function runHealthCheck() {
  try {
    if (rewardService) {
      console.log('🎯 Reward service is running and healthy');
    }
  } catch (error) {
    console.error('❌ Health check error:', error);
  }
}

// Initialize health monitoring for production deployment
setTimeout(() => {
  console.log('🔧 Production health monitoring initialized');
  // Run periodic health checks
  setInterval(runHealthCheck, 30 * 60 * 1000); // Every 30 minutes
}, 5000);

const app = express();

// Trust proxy for rate limiting (must be before security setup)
app.set('trust proxy', 1);

// Performance optimizations - compression and response time
app.use(compression({
  level: 6, // Good balance of speed vs compression
  threshold: 1024, // Only compress responses > 1KB
}));

// Response time tracking for optimization (must be before routes)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to track timing
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
    
    // Call original end function
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
});

// Cache headers for better performance
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/api/')) {
    // API responses - aggressive caching with revalidation
    res.set({
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
      'ETag': `"${Date.now()}"`,
    });
  } else if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    // Static assets - long cache
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
  }
  next();
});



// Security middleware setup
const securityMiddleware = setupSecurity(app);

// Body parsing middleware with size limits (AFTER security but BEFORE routes)
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Simple request logging for admin endpoints
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.includes('/api/admin/')) {
    console.log(`Admin ${req.method} ${req.path}`);
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    try {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          const responseStr = JSON.stringify(capturedJsonResponse);
          logLine += ` :: ${responseStr}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    } catch (error) {
      console.error('Logging middleware error:', error);
    }
  });

  next();
});



// Application startup
(async () => {
  // Health check endpoint for deployment (must be before all other routes)
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'kilt-liquidity-portal',
      environment: app.get("env")
    });
  });

  // Simple test endpoint to diagnose routing issues
  app.get('/test', (req: Request, res: Response) => {
    res.status(200).send(`
      <html>
        <body>
          <h1>Server Test</h1>
          <p>Environment: ${app.get("env")}</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>Path: ${req.path}</p>
          <p>URL: ${req.url}</p>
        </body>
      </html>
    `);
  });

  // Register API routes FIRST (before Vite middleware)
  const server = await registerRoutes(app, securityMiddleware);

  // Explicit root path handler for deployment compatibility (after API routes)
  app.get('/', async (req: Request, res: Response) => {
    try {
      // Force serve frontend for root path
      const path = await import('path');
      const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
      res.sendFile(path.resolve(distPath, "index.html"));
    } catch (error) {
      console.error('Error serving root path:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Serve static files from attached_assets directory
  app.use('/attached_assets', express.static('attached_assets'));

  // Setup Vite in development, serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Production mode: serve built static files
    const path = await import('path');
    const fs = await import('fs');
    
    const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
    
    // Ensure dist directory exists
    if (fs.existsSync(distPath)) {
      // Serve static assets with proper caching
      app.use(express.static(distPath, {
        maxAge: '1y',
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
          }
        }
      }));

      // SPA fallback for all non-API routes
      app.use("*", (req, res) => {
        if (req.originalUrl.startsWith('/api/') || req.originalUrl.startsWith('/health')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.resolve(distPath, "index.html"));
      });
    } else {
      console.warn('⚠️ Production build directory not found, falling back to serveStatic');
      serveStatic(app);
    }
  }

  // Enhanced global error handler (must be last)
  app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`❌ Global error handler - ${req.method} ${req.path}:`, error);
    
    // Prevent circular JSON serialization
    if (error && typeof error === 'object') {
      try {
        JSON.stringify(error);
      } catch (jsonError) {
        console.error('Error object contains circular references:', jsonError);
      }
    }
    
    enhancedErrorHandler(error, req, res, next);
  });

  // Start server on port 5000
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Server initialization complete
    console.log('✓ Server services initialized successfully');
  });
})();
