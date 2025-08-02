import express, { type Request, Response, NextFunction } from "express";
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

// Removed db-migration-optimizer - cleaned up during optimization

// Initialize reward service for background updates
let rewardService: FixedRewardService | null = null;
setTimeout(async () => {
  try {
    const { getDatabase } = await import('./storage');
    const db = getDatabase();
    rewardService = new FixedRewardService(db);
    console.log('🎯 Reward service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize reward service:', error);
  }
}, 2000);

// Background reward update system
const REWARD_UPDATE_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours in milliseconds (more frequent updates)
let rewardUpdateTimer: NodeJS.Timeout | null = null;

async function runDailyRewardUpdate() {
  if (!rewardService) {
    console.warn('⚠️ Reward service not initialized, skipping update');
    return;
  }
  
  try {
    console.log('🚀 Starting automatic reward update...');
    const result = await rewardService.updateDailyRewards();
    
    if (result.success) {
      console.log(`✅ Automatic reward update completed: ${result.updatedPositions} positions, ${result.totalRewardsDistributed.toFixed(2)} KILT distributed`);
    } else {
      console.error(`❌ Automatic reward update failed: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Critical error in automatic reward update:', error);
  }
}

// Schedule reward updates
function startRewardUpdateScheduler() {
  if (rewardUpdateTimer) {
    clearInterval(rewardUpdateTimer);
  }
  
  // Run every 4 hours for more frequent updates
  rewardUpdateTimer = setInterval(runDailyRewardUpdate, REWARD_UPDATE_INTERVAL);
  
  console.log('⏰ Reward update scheduler started (4-hour intervals)');
}

// Start scheduler after initialization
setTimeout(startRewardUpdateScheduler, 5000);

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
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});



// Application startup
(async () => {
  // Register API routes FIRST (before Vite middleware)
  const server = await registerRoutes(app, securityMiddleware);

  // Serve static files from attached_assets directory
  app.use('/attached_assets', express.static('attached_assets'));

  // Global error handler (must be last)
  app.use(errorHandler);

  // Setup Vite in development, serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

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
