import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertLpPositionSchema, 
  insertRewardSchema, 
  insertPoolStatsSchema 
} from "@shared/schema";
import { z } from "zod";
import { fetchKiltTokenData, calculateRewards, getBaseNetworkStats } from "./kilt-data";
import { AnalyticsService } from "./analytics";
import { db } from "./db";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByAddress(userData.address);
      
      if (existingUser) {
        res.json(existingUser);
        return;
      }
      
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.get("/api/users/:address", async (req, res) => {
    try {
      const user = await storage.getUserByAddress(req.params.address);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // LP Position routes
  app.post("/api/positions", async (req, res) => {
    try {
      const positionData = insertLpPositionSchema.parse(req.body);
      const position = await storage.createLpPosition(positionData);
      res.json(position);
    } catch (error) {
      res.status(400).json({ error: "Invalid position data" });
    }
  });

  app.get("/api/positions/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const positions = await storage.getLpPositionsByUserId(userId);
      res.json(positions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  });

  app.patch("/api/positions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const position = await storage.updateLpPosition(id, updates);
      
      if (!position) {
        res.status(404).json({ error: "Position not found" });
        return;
      }
      
      res.json(position);
    } catch (error) {
      res.status(500).json({ error: "Failed to update position" });
    }
  });

  // Reward routes
  app.post("/api/rewards", async (req, res) => {
    try {
      const rewardData = insertRewardSchema.parse(req.body);
      const reward = await storage.createReward(rewardData);
      res.json(reward);
    } catch (error) {
      res.status(400).json({ error: "Invalid reward data" });
    }
  });

  app.get("/api/rewards/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const rewards = await storage.getRewardsByUserId(userId);
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rewards" });
    }
  });

  app.post("/api/rewards/claim/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      await storage.claimRewards(userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to claim rewards" });
    }
  });

  // Pool stats routes
  app.get("/api/pool/:address", async (req, res) => {
    try {
      const poolAddress = req.params.address;
      const stats = await storage.getPoolStats(poolAddress);
      
      if (!stats) {
        res.status(404).json({ error: "Pool not found" });
        return;
      }
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pool stats" });
    }
  });

  app.put("/api/pool/:address", async (req, res) => {
    try {
      const poolAddress = req.params.address;
      const statsData = insertPoolStatsSchema.parse(req.body);
      const stats = await storage.updatePoolStats(poolAddress, statsData);
      res.json(stats);
    } catch (error) {
      res.status(400).json({ error: "Invalid pool stats data" });
    }
  });

  // Get real-time KILT token data
  app.get("/api/kilt-data", async (req, res) => {
    try {
      const kiltData = await fetchKiltTokenData();
      res.json(kiltData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch KILT token data" });
    }
  });

  // Calculate dynamic rewards based on real parameters
  app.post("/api/calculate-rewards", async (req, res) => {
    try {
      const { liquidityAmount, daysStaked, positionSize } = req.body;
      
      const rewardCalculation = calculateRewards(
        parseFloat(liquidityAmount) || 0,
        parseInt(daysStaked) || 0,
        parseFloat(positionSize) || 0
      );
      
      res.json(rewardCalculation);
    } catch (error) {
      res.status(400).json({ error: "Invalid calculation parameters" });
    }
  });

  // Get Base network statistics
  app.get("/api/network-stats", async (req, res) => {
    try {
      const networkStats = await getBaseNetworkStats();
      res.json(networkStats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch network stats" });
    }
  });

  // Initialize analytics service
  const analyticsService = new AnalyticsService(db);

  // Analytics API Routes
  
  // Get position performance history
  app.get("/api/analytics/position/:positionId/history", async (req, res) => {
    try {
      const positionId = parseInt(req.params.positionId);
      const days = parseInt(req.query.days as string) || 30;
      
      const history = await analyticsService.getPositionPerformanceHistory(positionId, days);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch position history" });
    }
  });

  // Get position snapshots
  app.get("/api/analytics/position/:positionId/snapshots", async (req, res) => {
    try {
      const positionId = parseInt(req.params.positionId);
      const limit = parseInt(req.query.limit as string) || 100;
      
      const snapshots = await analyticsService.getPositionSnapshots(positionId, limit);
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch position snapshots" });
    }
  });

  // Get position performance metrics
  app.get("/api/analytics/position/:positionId/performance", async (req, res) => {
    try {
      const positionId = parseInt(req.params.positionId);
      const days = parseInt(req.query.days as string) || 30;
      
      const metrics = await analyticsService.getPerformanceMetrics(positionId, days);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  // Get fee events for a position
  app.get("/api/analytics/position/:positionId/fees", async (req, res) => {
    try {
      const positionId = parseInt(req.params.positionId);
      const limit = parseInt(req.query.limit as string) || 50;
      
      const feeEvents = await analyticsService.getFeeEvents(positionId, limit);
      const totalFees = await analyticsService.getTotalFeesEarned(positionId);
      
      res.json({
        events: feeEvents,
        totals: totalFees
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fee events" });
    }
  });

  // Get pool price history
  app.get("/api/analytics/pool/:poolAddress/price-history", async (req, res) => {
    try {
      const poolAddress = req.params.poolAddress;
      const hours = parseInt(req.query.hours as string) || 24;
      
      const history = await analyticsService.getPoolPriceHistory(poolAddress, hours);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pool price history" });
    }
  });

  // Get pool TVL history
  app.get("/api/analytics/pool/:poolAddress/tvl-history", async (req, res) => {
    try {
      const poolAddress = req.params.poolAddress;
      const days = parseInt(req.query.days as string) || 7;
      
      const history = await analyticsService.getPoolTVLHistory(poolAddress, days);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pool TVL history" });
    }
  });

  // Get user analytics dashboard
  app.get("/api/analytics/user/:userId/dashboard", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const dashboardMetrics = await analyticsService.getDashboardMetrics(userId);
      const topPositions = await analyticsService.getTopPerformingPositions(userId);
      const analyticsHistory = await analyticsService.getUserAnalyticsHistory(userId, 30);
      
      res.json({
        metrics: dashboardMetrics,
        topPositions,
        history: analyticsHistory
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  // Get user analytics history
  app.get("/api/analytics/user/:userId/history", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const days = parseInt(req.query.days as string) || 30;
      
      const history = await analyticsService.getUserAnalyticsHistory(userId, days);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user analytics history" });
    }
  });

  // Record a position snapshot (for real-time data collection)
  app.post("/api/analytics/position/:positionId/snapshot", async (req, res) => {
    try {
      const positionId = parseInt(req.params.positionId);
      const snapshotData = req.body;
      
      const snapshot = await analyticsService.createPositionSnapshot({
        positionId,
        ...snapshotData
      });
      
      res.json(snapshot);
    } catch (error) {
      res.status(500).json({ error: "Failed to create position snapshot" });
    }
  });

  // Update user analytics (typically called daily)
  app.post("/api/analytics/user/:userId/update", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const analytics = await analyticsService.updateUserAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user analytics" });
    }
  });

  // Calculate performance metrics for a position
  app.post("/api/analytics/position/:positionId/calculate-performance", async (req, res) => {
    try {
      const positionId = parseInt(req.params.positionId);
      const date = req.body.date || new Date().toISOString().split('T')[0];
      
      const metrics = await analyticsService.calculatePerformanceMetrics(positionId, date);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate performance metrics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
