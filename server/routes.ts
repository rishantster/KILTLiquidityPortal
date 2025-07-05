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

  const httpServer = createServer(app);
  return httpServer;
}
