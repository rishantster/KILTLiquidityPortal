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
import { rewardService } from "./reward-service";
import { smartContractService } from "./smart-contract-service";
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

  // Create position with automatic reward system integration
  app.post("/api/positions/create-with-rewards", async (req, res) => {
    try {
      const { 
        userId, 
        nftId, 
        poolAddress, 
        tokenIds, 
        minPrice, 
        maxPrice, 
        liquidity, 
        positionValueUSD,
        userAddress 
      } = req.body;
      
      if (!userId || !nftId || !poolAddress || !tokenIds || !positionValueUSD || !userAddress) {
        res.status(400).json({ error: "Missing required position parameters" });
        return;
      }
      
      // Create LP position in database
      const positionData = {
        userId,
        nftId,
        poolAddress,
        tokenIds,
        minPrice,
        maxPrice,
        liquidity,
        isActive: true
      };
      
      const position = await storage.createLpPosition(positionData);
      const liquidityAddedAt = new Date();
      
      // Add position to smart contract reward system
      const contractResult = await smartContractService.addLiquidityPosition(
        userAddress,
        nftId.toString(),
        positionValueUSD
      );
      
      // Create reward tracking entry
      const rewardResult = await rewardService.createPositionReward(
        userId,
        position.id,
        nftId.toString(),
        positionValueUSD,
        liquidityAddedAt,
        liquidityAddedAt // Both liquidity and staking start at same time
      );
      
      res.json({
        position,
        reward: rewardResult,
        smartContract: contractResult,
        liquidityAddedAt,
        lockPeriodDays: 90,
        lockEndDate: new Date(liquidityAddedAt.getTime() + (90 * 24 * 60 * 60 * 1000))
      });
    } catch (error) {
      console.error('Error creating position with rewards:', error);
      res.status(500).json({ error: "Failed to create position with rewards" });
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

  // Smart contract routes
  app.get('/api/contract/reward-wallet-balance', async (req, res) => {
    try {
      const balanceInfo = await smartContractService.checkRewardWalletBalance();
      res.json(balanceInfo);
    } catch (error) {
      console.error('Error checking reward wallet balance:', error);
      res.status(500).json({ error: 'Failed to check reward wallet balance' });
    }
  });

  app.get('/api/contract/program-info', async (req, res) => {
    try {
      const programInfo = await smartContractService.getProgramInfo();
      res.json(programInfo);
    } catch (error) {
      console.error('Error fetching program info:', error);
      res.status(500).json({ error: 'Failed to fetch program info' });
    }
  });

  // Reward System API Routes
  
  // Calculate rewards for a position
  app.post("/api/rewards/calculate", async (req, res) => {
    try {
      const { userId, nftTokenId, positionValueUSD, liquidityAddedAt, stakingStartDate } = req.body;
      
      if (!userId || !nftTokenId || !positionValueUSD) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }
      
      const calculation = await rewardService.calculatePositionRewards(
        userId,
        nftTokenId,
        positionValueUSD,
        liquidityAddedAt ? new Date(liquidityAddedAt) : undefined,
        stakingStartDate ? new Date(stakingStartDate) : undefined
      );
      
      res.json(calculation);
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate rewards" });
    }
  });

  // Create position reward tracking
  app.post("/api/rewards/position", async (req, res) => {
    try {
      const { userId, positionId, nftTokenId, positionValueUSD, liquidityAddedAt, stakingStartDate } = req.body;
      
      if (!userId || !positionId || !nftTokenId || !positionValueUSD || !liquidityAddedAt) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }
      
      const reward = await rewardService.createPositionReward(
        userId,
        positionId,
        nftTokenId,
        positionValueUSD,
        new Date(liquidityAddedAt),
        stakingStartDate ? new Date(stakingStartDate) : undefined
      );
      
      res.json(reward);
    } catch (error) {
      res.status(500).json({ error: "Failed to create position reward" });
    }
  });

  // Get user rewards
  app.get("/api/rewards/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const rewards = await rewardService.getUserRewards(userId);
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user rewards" });
    }
  });

  // Get claimable rewards
  app.get("/api/rewards/user/:userId/claimable", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const claimableRewards = await rewardService.getClaimableRewards(userId);
      res.json(claimableRewards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch claimable rewards" });
    }
  });

  // Claim rewards
  app.post("/api/rewards/claim/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { userAddress } = req.body;
      
      if (!userAddress) {
        res.status(400).json({ error: "User address is required" });
        return;
      }
      
      const result = await rewardService.claimRewards(userId, userAddress);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to claim rewards" });
    }
  });

  // Get user reward statistics
  app.get("/api/rewards/user/:userId/stats", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stats = await rewardService.getUserRewardStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reward statistics" });
    }
  });

  // Get position reward history
  app.get("/api/rewards/position/:userId/:positionId/history", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const positionId = parseInt(req.params.positionId);
      const days = parseInt(req.query.days as string) || 30;
      
      const history = await rewardService.getPositionRewardHistory(userId, positionId, days);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reward history" });
    }
  });

  // Update daily rewards (typically called by a cron job)
  app.post("/api/rewards/update-daily", async (req, res) => {
    try {
      await rewardService.updateDailyRewards();
      res.json({ success: true, message: "Daily rewards updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update daily rewards" });
    }
  });

  // Get Top 100 ranking analytics
  app.get("/api/rewards/top100-analytics", async (req, res) => {
    try {
      const analytics = await rewardService.getTop100RankingAnalytics();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Top 100 ranking analytics" });
    }
  });

  // Get user personal APR based on their wallet address
  app.get("/api/rewards/user-apr/:address", async (req, res) => {
    try {
      const userAddress = req.params.address;
      
      // Get user from database
      const user = await storage.getUserByAddress(userAddress);
      if (!user) {
        // User not found, return 0% APR with no ranking
        res.json({ effectiveAPR: 0, rank: null, totalParticipants: 100 });
        return;
      }
      
      // Get user's positions
      const positions = await storage.getLpPositionsByUserId(user.id);
      
      if (positions.length === 0) {
        // No positions, return 0% APR with no ranking
        res.json({ effectiveAPR: 0, rank: null, totalParticipants: 100 });
        return;
      }
      
      // Calculate average APR across all positions
      let totalAPR = 0;
      let totalValueUSD = 0;
      let bestRank = null;
      let totalParticipants = 100;
      
      for (const position of positions) {
        const positionValueUSD = position.amount0 * 0.01602203 + position.amount1 * 2500; // Rough calculation
        
        const rewardCalc = await rewardService.calculatePositionRewards(
          user.id,
          position.nftTokenId,
          positionValueUSD,
          new Date(position.createdAt),
          new Date(position.createdAt)
        );
        
        totalAPR += rewardCalc.effectiveAPR * positionValueUSD;
        totalValueUSD += positionValueUSD;
        
        // Track the best (lowest) rank across all positions
        if (rewardCalc.rank && (!bestRank || rewardCalc.rank < bestRank)) {
          bestRank = rewardCalc.rank;
        }
        
        totalParticipants = rewardCalc.totalParticipants;
      }
      
      const weightedAPR = totalValueUSD > 0 ? totalAPR / totalValueUSD : 0;
      
      res.json({ 
        effectiveAPR: weightedAPR, 
        rank: bestRank, 
        totalParticipants 
      });
    } catch (error) {
      console.error('Error calculating user APR:', error);
      res.status(500).json({ error: "Failed to calculate user APR" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
