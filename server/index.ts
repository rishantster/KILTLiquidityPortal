import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurity, errorHandler, validateEnvironment } from "./security-middleware";
import { kiltPriceService } from "./kilt-price-service.js";

// Validate environment variables first
validateEnvironment();

// Initialize KILT price service for background price fetching
kiltPriceService; // This will start the background price fetching

const app = express();

// Trust proxy for rate limiting (must be before security setup)
app.set('trust proxy', 1);

// Security middleware setup (must be first)
const securityMiddleware = setupSecurity(app);

// Cache busting middleware - Force browsers to reload on deployments
app.use((req: Request, res: Response, next: NextFunction) => {
  // Set cache headers for static assets and HTML
  if (req.path.endsWith('.html') || req.path === '/') {
    // Never cache HTML files
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Deployment-Version', '2025.01.19.002');
    res.setHeader('X-Build-Timestamp', Date.now().toString());
    res.setHeader('X-Cookie-Enabled', 'true');
  } else if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    // Cache static assets but with versioning
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.setHeader('X-Asset-Version', '2025.01.19.001');
  }
  
  // Add cache-busting headers for API responses
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
});

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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
  }, () => {
    log(`serving on port ${port}`);
  });
})();
