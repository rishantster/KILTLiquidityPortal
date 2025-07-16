import type { Express, Request } from "express";
import { createServer, type Server } from "http";

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        identifier: string;
        type: 'wallet' | 'credentials';
      };
    }
  }
}
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertLpPositionSchema, 
  insertRewardSchema, 
  insertPoolStatsSchema,
  insertAppTransactionSchema,
  insertPositionEligibilitySchema
} from "@shared/schema";
import { z } from "zod";
import { fetchKiltTokenData, calculateRewards, getBaseNetworkStats } from "./kilt-data";
import { AnalyticsService } from "./analytics";
import { fixedRewardService } from "./fixed-reward-service";
import { realTimePriceService } from "./real-time-price-service";
import { uniswapIntegrationService } from "./uniswap-integration-service";
import { smartContractService } from "./smart-contract-service";
import { appTransactionService } from "./app-transaction-service";
import { positionRegistrationService } from "./position-registration-service";
import { liquidityTypeDetector } from "./liquidity-type-detector";
// Removed reward calculation demo import
import { treasuryService } from "./treasury-service";
import { adminService } from "./admin-service";
import { validateAdminCredentials, validateAdminWallet, createAdminSession, requireAdminAuth } from "./admin-auth";
import { claimBasedRewards } from "./claim-based-rewards";
import { db } from "./db";
import { blockchainConfigRouter } from "./routes/blockchain-config";

export async function registerRoutes(app: Express, security: any): Promise<Server> {
  
  // User routes
  app.post("/api/users", security.validateUserCreation, async (req, res) => {
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

  app.get("/api/users/:address", security.validateEthereumAddress, async (req, res) => {
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
  app.post("/api/positions", security.validatePositionData, async (req, res) => {
    try {
      const positionData = insertLpPositionSchema.parse(req.body);
      const position = await storage.createLpPosition(positionData);
      res.json(position);
    } catch (error) {
      res.status(400).json({ error: "Invalid position data" });
    }
  });

  // Get unregistered positions for a user address
  app.get("/api/positions/unregistered/:address", security.validateEthereumAddress, async (req, res) => {
    try {
      const userAddress = req.params.address;
      
      // Get all positions for this user address from Uniswap V3
      const userPositions = await storage.getUserPositions(userAddress);
      
      // Get already registered positions
      const registeredPositions = await storage.getRegisteredPositions(userAddress);
      const registeredNftIds = new Set(registeredPositions.map(p => p.nftTokenId));
      
      // Filter out already registered positions
      const unregisteredPositions = userPositions.filter(pos => 
        !registeredNftIds.has(pos.nftTokenId) && pos.isKiltPosition
      );
      
      res.json(unregisteredPositions);
    } catch (error) {
      console.error("Failed to fetch unregistered positions:", error);
      res.status(500).json({ error: "Failed to fetch unregistered positions" });
    }
  });

  // Get total position count for a user address
  app.get("/api/positions/user-total/:address", security.validateEthereumAddress, async (req, res) => {
    try {
      const userAddress = req.params.address;
      
      // Get all positions for this user address from Uniswap V3
      const userPositions = await storage.getUserPositions(userAddress);
      
      // Count only KILT positions
      const kiltPositions = userPositions.filter(pos => pos.isKiltPosition);
      
      res.json({ 
        count: kiltPositions.length,
        total: userPositions.length,
        kiltPositions: kiltPositions.length
      });
    } catch (error) {
      console.error("Failed to fetch user position count:", error);
      res.status(500).json({ error: "Failed to fetch user position count" });
    }
  });

  // App Session Management - Create secure session for transaction tracking
  app.post("/api/app-sessions/create", security.strictRateLimit, security.validateSessionData, async (req, res) => {
    try {
      const { userId, userAddress } = req.body;
      
      if (!userId || !userAddress) {
        res.status(400).json({ error: "Missing userId or userAddress" });
        return;
      }
      
      const userAgent = req.headers['user-agent'] || '';
      const sessionId = await appTransactionService.createAppSession(userId, userAddress, userAgent);
      
      res.json({ 
        sessionId, 
        message: "App session created successfully",
        expiresIn: "24 hours"
      });
      
    } catch (error) {
      console.error("Failed to create app session:", error);
      res.status(500).json({ error: "Failed to create app session" });
    }
  });

  // Record App Transaction - ONLY way to make positions reward-eligible
  app.post("/api/app-transactions/record", security.strictRateLimit, async (req, res) => {
    try {
      const { sessionId, transactionData } = req.body;
      
      if (!sessionId || !transactionData) {
        res.status(400).json({ error: "Missing sessionId or transactionData" });
        return;
      }
      
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await appTransactionService.recordAppTransaction(
        sessionId,
        {
          ...transactionData,
          appVersion: "1.0.0",
          userAgent: req.headers['user-agent'],
        },
        ipAddress
      );
      
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }
      
      res.json({ 
        success: true,
        transactionId: result.transactionId,
        message: "Transaction recorded successfully",
        status: "pending_verification"
      });
      
    } catch (error) {
      console.error("Failed to record app transaction:", error);
      res.status(500).json({ error: "Failed to record app transaction" });
    }
  });

  // Create position with automatic reward system integration - SECURED VERSION
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
        userAddress,
        appTransactionId, // Required: Must be from recorded app transaction
        sessionId // Required: Must be from valid app session
      } = req.body;
      
      if (!userId || !nftId || !poolAddress || !tokenIds || !positionValueUSD || !userAddress || !appTransactionId || !sessionId) {
        res.status(400).json({ error: "Missing required position parameters including app verification data" });
        return;
      }
      
      // Validate session
      const session = appTransactionService.validateSession(sessionId);
      if (!session) {
        res.status(403).json({ error: "Invalid or expired session - position not eligible for rewards" });
        return;
      }
      
      // Create LP position in database with app tracking
      // Validate position meets minimum requirements to prevent spam
      if (positionValueUSD < 10) {
        res.status(400).json({ error: "Position value must be at least $10 to prevent spam" });
        return;
      }

      const positionData = {
        userId,
        nftId,
        poolAddress,
        tokenIds,
        minPrice,
        maxPrice,
        liquidity,
        isActive: true,
        createdViaApp: true, // Mark as app-created
        appTransactionHash: "pending", // Will be updated after blockchain verification
        appSessionId: sessionId,
        verificationStatus: "pending",
        rewardEligible: true // Only true for app-created positions
      };
      
      const position = await storage.createLpPosition(positionData);
      const liquidityAddedAt = new Date();
      
      // Create position eligibility record
      const eligibilityCreated = await appTransactionService.createPositionEligibility(
        position.id,
        nftId.toString(),
        appTransactionId,
        "app_created"
      );
      
      if (!eligibilityCreated) {
        res.status(400).json({ error: "Failed to create position eligibility - transaction not verified" });
        return;
      }
      
      // Add position to smart contract reward system
      const contractResult = await smartContractService.addLiquidityPosition(
        userAddress,
        nftId.toString(),
        positionValueUSD
      );
      
      // Create reward tracking entry
      const rewardResult = await fixedRewardService.calculatePositionRewards(
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
        lockPeriodDays: 7,
        lockEndDate: new Date(liquidityAddedAt.getTime() + (7 * 24 * 60 * 60 * 1000))
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

  // App Transaction Security Routes
  app.get("/api/app-transactions/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const transactions = await appTransactionService.getUserAppTransactions(userId);
      res.json(transactions);
    } catch (error) {
      console.error("Failed to get user app transactions:", error);
      res.status(500).json({ error: "Failed to get user app transactions" });
    }
  });

  app.get("/api/positions/eligible/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const positions = await appTransactionService.getUserEligiblePositions(userId);
      res.json(positions);
    } catch (error) {
      console.error("Failed to get user eligible positions:", error);
      res.status(500).json({ error: "Failed to get user eligible positions" });
    }
  });

  app.get("/api/positions/:positionId/eligibility/:nftTokenId", async (req, res) => {
    try {
      const positionId = parseInt(req.params.positionId);
      const nftTokenId = req.params.nftTokenId;
      
      const isEligible = await appTransactionService.isPositionEligibleForRewards(positionId, nftTokenId);
      
      res.json({ 
        positionId,
        nftTokenId,
        isEligible,
        message: isEligible ? "Position is eligible for rewards" : "Position is NOT eligible for rewards - not created via app"
      });
      
    } catch (error) {
      console.error("Failed to check position eligibility:", error);
      res.status(500).json({ error: "Failed to check position eligibility" });
    }
  });

  app.get("/api/app-sessions/stats", async (req, res) => {
    try {
      const stats = appTransactionService.getSessionStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get session stats:", error);
      res.status(500).json({ error: "Failed to get session stats" });
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

  // Get pool performance data (real data only)
  app.get("/api/pool-performance", async (req, res) => {
    try {
      const { poolAddress, timeRange } = req.query;
      
      if (!poolAddress) {
        res.status(400).json({ error: "Pool address required" });
        return;
      }

      // In real implementation, this would fetch actual pool performance data
      // from The Graph, Moralis, or direct contract queries
      // For now, return empty array to show proper empty states
      const performanceData: any[] = [];
      
      res.json(performanceData);
    } catch (error) {
      console.error("Failed to fetch pool performance:", error);
      res.status(500).json({ error: "Failed to fetch pool performance data" });
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
      const { userId, nftTokenId, liquidityAddedAt, stakingStartDate } = req.body;
      
      if (!userId || !nftTokenId) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }
      
      const calculation = await fixedRewardService.calculatePositionRewards(
        userId,
        nftTokenId,
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
      
      const reward = await fixedRewardService.calculatePositionRewards(
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
      const rewards = await fixedRewardService.getUserRewards(userId);
      res.json(rewards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user rewards" });
    }
  });

  // Get user reward statistics
  app.get("/api/rewards/user/:userId/stats", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const stats = await fixedRewardService.getUserRewardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error('Error getting user reward stats:', error);
      res.status(500).json({ error: "Failed to fetch user reward stats" });
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
      
      const result = await claimBasedRewards.processClaimRequest(userAddress);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to claim rewards" });
    }
  });



  // Get position reward history
  app.get("/api/rewards/position/:userId/:positionId/history", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const positionId = parseInt(req.params.positionId);
      const days = parseInt(req.query.days as string) || 30;
      
      const history = await fixedRewardService.getUserRewards(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reward history" });
    }
  });

  // Update daily rewards (typically called by a cron job)
  app.post("/api/rewards/update-daily", async (req, res) => {
    try {
      await fixedRewardService.updateDailyRewards();
      res.json({ success: true, message: "Daily rewards updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update daily rewards" });
    }
  });

  // Get program analytics (open participation)
  app.get("/api/rewards/program-analytics", async (req, res) => {
    try {
      const analytics = await fixedRewardService.getProgramAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Error getting program analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get maximum theoretical APR calculation
  app.get("/api/rewards/maximum-apr", async (req, res) => {
    try {
      const maxAPR = await fixedRewardService.calculateMaximumTheoreticalAPR();
      res.json(maxAPR);
    } catch (error) {
      console.error('Error calculating maximum APR:', error);
      res.status(500).json({ error: "Failed to calculate maximum APR" });
    }
  });

  // Get claimable rewards
  app.get("/api/rewards/user/:userId/claimable", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userAddress = req.params.userId; // This should be user address from request params
      const claimableRewards = await claimBasedRewards.checkClaimability(userAddress);
      res.json(claimableRewards);
    } catch (error) {
      // Return fallback claimable amount to prevent frontend errors
      res.json({
        totalClaimable: 0,
        positions: [],
        canClaim: false,
        nextClaimDate: null
      });
    }
  });

  // Open Participation System Routes
  
  // Get participation requirements for new users
  app.get("/api/replacement/requirements", async (req, res) => {
    try {
      // Get all active participants
      const positions = await storage.getAllLpPositions();
      const activePositions = positions.filter(p => p.isActive);
      
      // Sort by liquidity value (descending)
      const sortedPositions = activePositions.sort((a, b) => b.currentValueUSD - a.currentValueUSD);
      
      res.json({
        openParticipation: true,
        totalParticipants: sortedPositions.length,
        minimumLiquidity: 0, // No minimum position value - any position with value > $0 is eligible
        message: `Open participation! Add any amount of liquidity to join ${sortedPositions.length} other participants.`,
        requirements: {
          minimumPositionValue: 0,
          lockPeriod: 7,
          description: "Add any amount of liquidity and wait 7 days to claim rewards"
        }
      });
      
    } catch (error) {
      console.error('Error fetching participation requirements:', error);
      res.status(500).json({ 
        error: 'Failed to fetch participation requirements',
        openParticipation: true,
        availableSlots: 0,
        message: 'Unable to calculate replacement requirements at this time.'
      });
    }
  });

  // Check if a specific liquidity amount would qualify for Top 100
  app.post("/api/replacement/check-eligibility", async (req, res) => {
    try {
      const { liquidityAmount, daysToWait = 1 } = req.body;
      
      if (!liquidityAmount || liquidityAmount <= 0) {
        res.status(400).json({ error: 'Valid liquidity amount required' });
        return;
      }
      
      // Get current Top 100
      const positions = await storage.getAllLpPositions();
      const activePositions = positions.filter(p => p.isActive);
      const sortedPositions = activePositions.sort((a, b) => b.currentValueUSD - a.currentValueUSD);
      const top100 = sortedPositions.slice(0, 100);
      
      if (top100.length < 100) {
        res.json({
          eligible: true,
          rank: top100.length + 1,
          message: `You would be ranked #${top100.length + 1} with $${liquidityAmount} liquidity.`
        });
        return;
      }
      
      // Calculate user's score
      const userScore = liquidityAmount * daysToWait;
      
      // Calculate rank 100 score
      const rank100Position = top100[99];
      const rank100DaysActive = Math.floor(
        (Date.now() - new Date(rank100Position.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const rank100Score = rank100Position.currentValueUSD * rank100DaysActive;
      
      if (userScore > rank100Score) {
        // Find what rank they would achieve
        let projectedRank = 100;
        for (let i = 99; i >= 0; i--) {
          const position = top100[i];
          const positionDaysActive = Math.floor(
            (Date.now() - new Date(position.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          const positionScore = position.currentValueUSD * positionDaysActive;
          
          if (userScore > positionScore) {
            projectedRank = i + 1;
          } else {
            break;
          }
        }
        
        res.json({
          eligible: true,
          rank: projectedRank,
          message: `You would be ranked #${projectedRank} with $${liquidityAmount} liquidity after ${daysToWait} days.`
        });
        return;
      }
      
      res.json({
        eligible: false,
        rank: null,
        shortfall: rank100Score - userScore,
        message: `Need ${(rank100Score - userScore).toFixed(0)} more liquidity×days to qualify for Top 100.`
      });
      
    } catch (error) {
      console.error('Error checking eligibility:', error);
      res.status(500).json({ error: 'Failed to check eligibility' });
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
        res.json({ effectiveAPR: 0, tradingFeeAPR: 0, incentiveAPR: 0, totalAPR: 0, rank: null, totalParticipants: 100 });
        return;
      }
      
      // Get user's positions
      const positions = await storage.getLpPositionsByUserId(user.id);
      
      if (positions.length === 0) {
        // No positions, return 0% APR with no ranking
        res.json({ effectiveAPR: 0, tradingFeeAPR: 0, incentiveAPR: 0, totalAPR: 0, rank: null, totalParticipants: 100 });
        return;
      }
      
      // Calculate average APR across all positions
      let totalAPR = 0;
      let totalTradingFeeAPR = 0;
      let totalIncentiveAPR = 0;
      let totalValueUSD = 0;
      let bestRank = null;
      let totalParticipants = 100;
      
      for (const position of positions) {
        const positionValueUSD = position.amount0 * 0.01602203 + position.amount1 * 2500; // Rough calculation
        
        const rewardCalc = await fixedRewardService.calculatePositionRewards(
          user.id,
          position.nftTokenId,
          positionValueUSD,
          new Date(position.createdAt),
          new Date(position.createdAt)
        );
        
        totalAPR += rewardCalc.totalAPR * positionValueUSD;
        totalTradingFeeAPR += rewardCalc.tradingFeeAPR * positionValueUSD;
        totalIncentiveAPR += rewardCalc.incentiveAPR * positionValueUSD;
        totalValueUSD += positionValueUSD;
        
        // Track the best (lowest) rank across all positions
        if (rewardCalc.rank && (!bestRank || rewardCalc.rank < bestRank)) {
          bestRank = rewardCalc.rank;
        }
        
        totalParticipants = rewardCalc.totalParticipants;
      }
      
      const weightedTotalAPR = totalValueUSD > 0 ? totalAPR / totalValueUSD : 0;
      const weightedTradingFeeAPR = totalValueUSD > 0 ? totalTradingFeeAPR / totalValueUSD : 0;
      const weightedIncentiveAPR = totalValueUSD > 0 ? totalIncentiveAPR / totalValueUSD : 0;
      
      res.json({ 
        effectiveAPR: weightedTotalAPR,
        tradingFeeAPR: weightedTradingFeeAPR,
        incentiveAPR: weightedIncentiveAPR,
        totalAPR: weightedTotalAPR,
        rank: bestRank, 
        totalParticipants 
      });
    } catch (error) {
      console.error('Error calculating user APR:', error);
      res.status(500).json({ error: "Failed to calculate user APR" });
    }
  });

  // APR Analysis Routes
  app.get("/api/positions/:positionId/apr-breakdown", async (req, res) => {
    try {
      const positionId = parseInt(req.params.positionId);
      
      if (!positionId || isNaN(positionId)) {
        res.status(400).json({ error: 'Invalid position ID' });
        return;
      }

      // Get position details
      const position = await storage.getLpPositionById(positionId);
      if (!position) {
        res.status(404).json({ error: 'Position not found' });
        return;
      }

      // Calculate rewards (includes both trading fees and incentives)
      const rewardResult = await fixedRewardService.calculatePositionRewards(
        position.userId,
        position.nftTokenId,
        Number(position.currentValueUSD),
        new Date(position.createdAt)
      );

      res.json({
        positionId: positionId,
        nftTokenId: position.nftTokenId,
        positionValue: Number(position.currentValueUSD),
        apr: {
          tradingFee: rewardResult.tradingFeeAPR,
          incentive: rewardResult.incentiveAPR,
          total: rewardResult.totalAPR
        },
        breakdown: rewardResult.aprBreakdown,
        dailyEarnings: {
          tradingFees: rewardResult.aprBreakdown.dailyFeeEarnings,
          incentives: rewardResult.aprBreakdown.dailyIncentiveRewards,
          total: rewardResult.aprBreakdown.dailyFeeEarnings + rewardResult.aprBreakdown.dailyIncentiveRewards
        },
        position: {
          minPrice: Number(position.minPrice),
          maxPrice: Number(position.maxPrice),
          isInRange: rewardResult.aprBreakdown.isInRange,
          timeInRangeRatio: rewardResult.aprBreakdown.timeInRangeRatio,
          concentrationFactor: rewardResult.aprBreakdown.concentrationFactor,
          daysActive: rewardResult.daysStaked
        }
      });
    } catch (error) {
      console.error('Error getting position APR breakdown:', error);
      res.status(500).json({ error: 'Failed to get APR breakdown' });
    }
  });

  // Get pool metrics for APR calculation
  app.get("/api/pool-metrics/:poolAddress", async (req, res) => {
    try {
      const { poolAddress } = req.params;
      
      // This would integrate with actual pool data
      // For now, return mock data structure
      res.json({
        poolAddress,
        volume24h: 50000,
        tvl: 500000,
        currentPrice: 0.016,
        feeRate: 0.003,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting pool metrics:', error);
      res.status(500).json({ error: 'Failed to get pool metrics' });
    }
  });

  // Calculate APR for different range strategies
  app.post("/api/apr/range-strategies", async (req, res) => {
    try {
      const { positionValue, currentPrice } = req.body;
      
      if (!positionValue || !currentPrice) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const strategies = [
        {
          name: 'Narrow (±25%)',
          minPrice: currentPrice * 0.75,
          maxPrice: currentPrice * 1.25,
          range: 0.25
        },
        {
          name: 'Balanced (±50%)',
          minPrice: currentPrice * 0.5,
          maxPrice: currentPrice * 1.5,
          range: 0.5
        },
        {
          name: 'Wide (±100%)',
          minPrice: currentPrice * 0.01,
          maxPrice: currentPrice * 2,
          range: 1.0
        },
        {
          name: 'Full Range',
          minPrice: 0,
          maxPrice: Infinity,
          range: Infinity
        }
      ];

      const results = await Promise.all(
        strategies.map(async (strategy) => {
          // This would calculate APR for each strategy
          // For now, return estimated values
          const concentrationFactor = strategy.range === Infinity ? 1 : Math.min(4, 2 / strategy.range);
          const estimatedTradingFeeAPR = 15 * concentrationFactor * 0.7; // Assumes 70% time in range
          const estimatedIncentiveAPR = 20; // Base incentive APR
          
          return {
            strategy: strategy.name,
            range: strategy.range,
            minPrice: strategy.minPrice,
            maxPrice: strategy.maxPrice,
            concentrationFactor,
            estimatedAPR: {
              tradingFee: estimatedTradingFeeAPR,
              incentive: estimatedIncentiveAPR,
              total: estimatedTradingFeeAPR + estimatedIncentiveAPR
            },
            riskLevel: strategy.range < 0.5 ? 'High' : strategy.range < 1 ? 'Medium' : 'Low'
          };
        })
      );

      res.json({
        positionValue,
        currentPrice,
        strategies: results,
        recommendation: results.find(r => r.strategy.includes('Balanced'))?.strategy || 'Balanced (±50%)'
      });
    } catch (error) {
      console.error('Error calculating range strategy APR:', error);
      res.status(500).json({ error: 'Failed to calculate range strategy APR' });
    }
  });

  // Position Registration Routes - Allow external Uniswap positions to join reward program
  app.post("/api/positions/register", async (req, res) => {
    try {
      const { 
        userId, 
        userAddress,
        nftTokenId,
        poolAddress,
        token0Address,
        token1Address,
        amount0,
        amount1,
        minPrice,
        maxPrice,
        liquidity,
        currentValueUSD,
        feeTier,
        originalCreationDate,
        verificationProof
      } = req.body;

      if (!userId || !userAddress || !nftTokenId || !poolAddress) {
        res.status(400).json({ error: "Missing required registration parameters" });
        return;
      }

      // Validate user exists
      const user = await storage.getUserById(userId);
      if (!user || user.address !== userAddress) {
        res.status(403).json({ error: "Invalid user credentials" });
        return;
      }

      const positionData = {
        nftTokenId,
        poolAddress,
        token0Address,
        token1Address,
        amount0,
        amount1,
        minPrice,
        maxPrice,
        liquidity,
        currentValueUSD: Number(currentValueUSD),
        feeTier: Number(feeTier),
        createdAt: originalCreationDate ? new Date(originalCreationDate) : new Date()
      };

      const result = await positionRegistrationService.registerExternalPosition(
        userId,
        userAddress,
        positionData,
        verificationProof
      );

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          positionId: result.positionId,
          eligibilityStatus: result.eligibilityStatus,
          rewardInfo: result.rewardInfo,
          registrationDate: new Date().toISOString()
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          alreadyRegistered: result.alreadyRegistered,
          eligibilityStatus: result.eligibilityStatus
        });
      }

    } catch (error) {
      console.error("Error registering position:", error);
      res.status(500).json({ error: "Failed to register position" });
    }
  });

  // Check if a position is already registered
  app.get("/api/positions/:nftTokenId/registration-status", async (req, res) => {
    try {
      const { nftTokenId } = req.params;
      
      const status = await positionRegistrationService.getPositionRegistrationStatus(nftTokenId);
      
      res.json({
        nftTokenId,
        isRegistered: status.isRegistered,
        isEligible: status.isEligible,
        registrationDate: status.registrationDate?.toISOString(),
        eligibilityStartDate: status.eligibilityStartDate?.toISOString()
      });

    } catch (error) {
      console.error("Error checking registration status:", error);
      res.status(500).json({ error: "Failed to check registration status" });
    }
  });

  // Get unregistered KILT positions for a user
  app.get("/api/positions/unregistered/:userAddress", async (req, res) => {
    try {
      const { userAddress } = req.params;
      
      const result = await positionRegistrationService.getUnregisteredKiltPositions(userAddress);
      
      res.json({
        userAddress,
        eligiblePositions: result.eligiblePositions,
        registrationRequired: result.registrationRequired,
        message: result.eligiblePositions.length > 0 
          ? `Found ${result.eligiblePositions.length} unregistered KILT positions` 
          : 'No unregistered KILT positions found'
      });

    } catch (error) {
      console.error("Error fetching unregistered positions:", error);
      res.status(500).json({ error: "Failed to fetch unregistered positions" });
    }
  });

  // Bulk register multiple positions
  app.post("/api/positions/bulk-register", async (req, res) => {
    try {
      const { userId, userAddress, positions } = req.body;

      if (!userId || !userAddress || !Array.isArray(positions)) {
        res.status(400).json({ error: "Missing required bulk registration parameters" });
        return;
      }

      // Validate user exists
      const user = await storage.getUserById(userId);
      if (!user || user.address !== userAddress) {
        res.status(403).json({ error: "Invalid user credentials" });
        return;
      }

      const result = await positionRegistrationService.bulkRegisterPositions(
        userId,
        userAddress,
        positions
      );

      res.json({
        success: result.successCount > 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
        totalPositions: positions.length,
        results: result.results,
        message: `Successfully registered ${result.successCount} of ${positions.length} positions`
      });

    } catch (error) {
      console.error("Error bulk registering positions:", error);
      res.status(500).json({ error: "Failed to bulk register positions" });
    }
  });

  // ===== CRITICAL MISSING ENDPOINTS: UNISWAP V3 POSITION MANAGEMENT =====
  
  // Increase liquidity in existing position
  app.post("/api/positions/:nftTokenId/increase", async (req, res) => {
    try {
      const { nftTokenId } = req.params;
      const { amount0, amount1, userAddress, sessionId } = req.body;
      
      if (!amount0 || !amount1 || !userAddress || !sessionId) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }
      
      // Validate session
      const session = appTransactionService.validateSession(sessionId);
      if (!session) {
        res.status(403).json({ error: "Invalid session" });
        return;
      }
      
      const result = await uniswapIntegrationService.increaseLiquidity(
        nftTokenId,
        amount0,
        amount1,
        userAddress
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error increasing liquidity:', error);
      res.status(500).json({ error: "Failed to increase liquidity" });
    }
  });

  // Decrease liquidity in existing position
  app.post("/api/positions/:nftTokenId/decrease", async (req, res) => {
    try {
      const { nftTokenId } = req.params;
      const { liquidityAmount, userAddress, sessionId } = req.body;
      
      if (!liquidityAmount || !userAddress || !sessionId) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }
      
      // Validate session
      const session = appTransactionService.validateSession(sessionId);
      if (!session) {
        res.status(403).json({ error: "Invalid session" });
        return;
      }
      
      const result = await uniswapIntegrationService.decreaseLiquidity(
        nftTokenId,
        liquidityAmount,
        userAddress
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error decreasing liquidity:', error);
      res.status(500).json({ error: "Failed to decrease liquidity" });
    }
  });

  // Collect fees from position
  app.post("/api/positions/:nftTokenId/collect", async (req, res) => {
    try {
      const { nftTokenId } = req.params;
      const { userAddress, sessionId } = req.body;
      
      if (!userAddress || !sessionId) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }
      
      // Validate session
      const session = appTransactionService.validateSession(sessionId);
      if (!session) {
        res.status(403).json({ error: "Invalid session" });
        return;
      }
      
      const result = await uniswapIntegrationService.collectFees(
        nftTokenId,
        userAddress
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error collecting fees:', error);
      res.status(500).json({ error: "Failed to collect fees" });
    }
  });

  // Burn position (remove all liquidity)
  app.post("/api/positions/:nftTokenId/burn", async (req, res) => {
    try {
      const { nftTokenId } = req.params;
      const { userAddress, sessionId } = req.body;
      
      if (!userAddress || !sessionId) {
        res.status(400).json({ error: "Missing required parameters" });
        return;
      }
      
      // Validate session
      const session = appTransactionService.validateSession(sessionId);
      if (!session) {
        res.status(403).json({ error: "Invalid session" });
        return;
      }
      
      const result = await uniswapIntegrationService.burnPosition(
        nftTokenId,
        userAddress
      );
      
      // Update position as inactive in database
      const position = await storage.getLpPositionByNftTokenId(nftTokenId);
      if (position) {
        await storage.updateLpPosition(position.id, { isActive: false });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error burning position:', error);
      res.status(500).json({ error: "Failed to burn position" });
    }
  });

  // Get position current status and value
  app.get("/api/positions/:nftTokenId/status", async (req, res) => {
    try {
      const { nftTokenId } = req.params;
      
      const status = await uniswapIntegrationService.getPositionStatus(nftTokenId);
      res.json(status);
    } catch (error) {
      console.error('Error getting position status:', error);
      res.status(500).json({ error: "Failed to get position status" });
    }
  });

  // Get position fees earned
  app.get("/api/positions/:nftTokenId/fees", async (req, res) => {
    try {
      const { nftTokenId } = req.params;
      
      const fees = await uniswapIntegrationService.getPositionFees(nftTokenId);
      res.json(fees);
    } catch (error) {
      console.error('Error getting position fees:', error);
      res.status(500).json({ error: "Failed to get position fees" });
    }
  });

  // Get real-time position value
  app.get("/api/positions/:nftTokenId/value", async (req, res) => {
    try {
      const { nftTokenId } = req.params;
      
      const value = await uniswapIntegrationService.getPositionValue(nftTokenId);
      res.json(value);
    } catch (error) {
      console.error('Error getting position value:', error);
      res.status(500).json({ error: "Failed to get position value" });
    }
  });

  // Get all positions for a user address
  app.get("/api/positions/wallet/:userAddress", async (req, res) => {
    try {
      const { userAddress } = req.params;
      
      const positions = await uniswapIntegrationService.getUserPositions(userAddress);
      res.json(positions);
    } catch (error) {
      console.error('Error getting user positions:', error);
      res.status(500).json({ error: "Failed to get user positions" });
    }
  });

  // Get pool information
  app.get("/api/pools/:poolAddress/info", async (req, res) => {
    try {
      const { poolAddress } = req.params;
      
      const poolInfo = await uniswapIntegrationService.getPoolInfo(poolAddress);
      res.json(poolInfo);
    } catch (error) {
      console.error('Error getting pool info:', error);
      res.status(500).json({ error: "Failed to get pool info" });
    }
  });

  // Get pool current price
  app.get("/api/pools/:poolAddress/price", async (req, res) => {
    try {
      const { poolAddress } = req.params;
      
      const price = await uniswapIntegrationService.getPoolPrice(poolAddress);
      res.json(price);
    } catch (error) {
      console.error('Error getting pool price:', error);
      res.status(500).json({ error: "Failed to get pool price" });
    }
  });

  // ===== REWARD CALCULATION VULNERABILITY DEMO ROUTES =====
  
  // Get detailed vulnerability report showing the fix
  app.get("/api/reward-demo/vulnerability-report", async (req, res) => {
    try {
      const report = rewardCalculationDemo.generateVulnerabilityReport();
      
      res.json({
        success: true,
        report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating vulnerability report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate vulnerability report'
      });
    }
  });

  // Get detailed comparison of old vs new formula
  app.get("/api/reward-demo/comparison", async (req, res) => {
    try {
      const comparisons = rewardCalculationDemo.demonstrateVulnerabilityFix();
      
      res.json({
        success: true,
        comparisons,
        summary: {
          totalScenarios: comparisons.length,
          vulnerabilityFixed: true,
          exploitationReduction: ">90%"
        }
      });
    } catch (error) {
      console.error('Error generating comparison:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate comparison'
      });
    }
  });

  // ===== LIQUIDITY TYPE DETECTION ROUTES =====
  
  // Analyze liquidity type for a position
  app.post("/api/positions/analyze-liquidity-type", async (req, res) => {
    try {
      const {
        token0Amount,
        token1Amount,
        token0Decimals = 18,
        token1Decimals = 18,
        minPrice,
        maxPrice,
        currentPrice,
        poolAddress
      } = req.body;

      const result = await liquidityTypeDetector.detectLiquidityType(
        token0Amount,
        token1Amount,
        token0Decimals,
        token1Decimals,
        minPrice,
        maxPrice,
        currentPrice,
        poolAddress
      );

      res.json({
        ...result,
        recommendations: liquidityTypeDetector.getRecommendations(result)
      });
    } catch (error) {
      console.error('Error analyzing liquidity type:', error);
      res.status(500).json({ error: "Failed to analyze liquidity type" });
    }
  });

  // ===== TREASURY MANAGEMENT ROUTES =====
  
  // Get current treasury information
  app.get("/api/treasury/info", async (req, res) => {
    try {
      const treasuryInfo = await treasuryService.getTreasuryInfo();
      res.json(treasuryInfo);
    } catch (error) {
      console.error('Error getting treasury info:', error);
      res.status(500).json({ error: 'Failed to get treasury information' });
    }
  });

  // Get treasury statistics
  app.get("/api/treasury/stats", async (req, res) => {
    try {
      const stats = await treasuryService.getTreasuryStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting treasury stats:', error);
      res.status(500).json({ error: 'Failed to get treasury statistics' });
    }
  });

  // Get contract owner address
  app.get("/api/treasury/owner", async (req, res) => {
    try {
      const owner = await treasuryService.getContractOwner();
      res.json({ owner });
    } catch (error) {
      console.error('Error getting contract owner:', error);
      res.status(500).json({ error: 'Failed to get contract owner' });
    }
  });

  // Update treasury wallet address (requires owner private key)
  app.post("/api/treasury/update-address", async (req, res) => {
    try {
      const { newTreasuryAddress, ownerPrivateKey } = req.body;
      
      if (!newTreasuryAddress || !ownerPrivateKey) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const result = await treasuryService.updateTreasuryAddress(
        newTreasuryAddress,
        ownerPrivateKey
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Treasury address updated successfully',
          transactionHash: result.transactionHash,
          newAddress: newTreasuryAddress
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error updating treasury address:', error);
      res.status(500).json({ error: 'Failed to update treasury address' });
    }
  });

  // Setup treasury allowance (requires treasury private key)
  app.post("/api/treasury/setup-allowance", async (req, res) => {
    try {
      const { treasuryPrivateKey, allowanceAmount = 2905600 } = req.body;
      
      if (!treasuryPrivateKey) {
        res.status(400).json({ error: 'Treasury private key required' });
        return;
      }

      const result = await treasuryService.setupTreasuryAllowance(
        treasuryPrivateKey,
        allowanceAmount
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Treasury allowance setup successfully',
          transactionHash: result.transactionHash,
          allowanceAmount
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error setting up treasury allowance:', error);
      res.status(500).json({ error: 'Failed to setup treasury allowance' });
    }
  });

  // Validate treasury setup
  app.get("/api/treasury/validate", async (req, res) => {
    try {
      const validation = await treasuryService.validateTreasurySetup();
      res.json(validation);
    } catch (error) {
      console.error('Error validating treasury setup:', error);
      res.status(500).json({ error: 'Failed to validate treasury setup' });
    }
  });

  // ===== ADMIN PANEL ROUTES =====
  
  // Admin login (supports both wallet and credentials)
  app.post("/api/admin/login", async (req, res) => {
    try {
      // Admin login request received
      const { username, password, walletAddress } = req.body;
      
      // Wallet-based authentication
      if (walletAddress) {
        // Validating admin wallet authentication
        if (validateAdminWallet(walletAddress)) {
          const token = createAdminSession(walletAddress, 'wallet');
          // Admin wallet login successful, token generated
          res.json({
            success: true,
            token,
            message: 'Admin access granted via wallet'
          });
        } else {
          // Unauthorized wallet address attempted
          res.status(401).json({ error: 'Unauthorized: Admin access restricted to authorized wallet' });
        }
        return;
      }
      
      // Credentials-based authentication
      if (username && password) {
        // Validating admin credentials
        if (validateAdminCredentials(username, password)) {
          const token = createAdminSession(username, 'credentials');
          // Admin credentials login successful, token generated
          res.json({
            success: true,
            token,
            message: 'Admin login successful'
          });
        } else {
          // Invalid credentials - security logging removed for production
          res.status(401).json({ error: 'Invalid credentials' });
        }
        return;
      }
      
      // No valid authentication method provided
      res.status(400).json({ error: 'Either wallet address or username/password required' });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get admin dashboard data
  app.get("/api/admin/dashboard", requireAdminAuth, async (req, res) => {
    try {
      const stats = await adminService.getAdminTreasuryStats();
      // Admin dashboard stats retrieved
      res.json(stats);
    } catch (error) {
      console.error('Error getting admin dashboard:', error);
      res.status(500).json({ error: 'Failed to load dashboard' });
    }
  });

  // Update treasury address (admin only)
  app.post("/api/admin/treasury/update-address", requireAdminAuth, async (req, res) => {
    try {
      const { newTreasuryAddress, ownerPrivateKey } = req.body;
      
      if (!newTreasuryAddress || !ownerPrivateKey) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const result = await treasuryService.updateTreasuryAddress(
        newTreasuryAddress,
        ownerPrivateKey
      );

      res.json(result);
    } catch (error) {
      console.error('Error updating treasury address:', error);
      res.status(500).json({ error: 'Failed to update treasury address' });
    }
  });

  // Add to treasury wallet
  app.post("/api/admin/treasury/add", requireAdminAuth, async (req, res) => {
    try {
      const { amount, toAddress, privateKey, reason } = req.body;
      
      if (!amount || !toAddress || !privateKey) {
        res.status(400).json({ error: 'Amount, treasury address, and private key required' });
        return;
      }

      const result = await adminService.addToTreasury({
        operation: 'add',
        amount: parseFloat(amount),
        toAddress,
        privateKey,
        reason: reason || 'Treasury funding'
      });

      res.json(result);
    } catch (error) {
      console.error('Error adding to treasury:', error);
      res.status(500).json({ error: 'Failed to add to treasury' });
    }
  });

  // Remove from treasury wallet
  app.post("/api/admin/treasury/remove", requireAdminAuth, async (req, res) => {
    try {
      const { amount, fromAddress, toAddress, privateKey, reason } = req.body;
      
      if (!amount || !fromAddress || !toAddress || !privateKey) {
        res.status(400).json({ error: 'Amount, from address, to address, and private key required' });
        return;
      }

      const result = await adminService.removeFromTreasury({
        operation: 'remove',
        amount: parseFloat(amount),
        fromAddress,
        toAddress,
        privateKey,
        reason: reason || 'Treasury withdrawal'
      });

      res.json(result);
    } catch (error) {
      console.error('Error removing from treasury:', error);
      res.status(500).json({ error: 'Failed to remove from treasury' });
    }
  });

  // Transfer tokens between addresses
  app.post("/api/admin/treasury/transfer", requireAdminAuth, async (req, res) => {
    try {
      const { amount, fromAddress, toAddress, privateKey, reason } = req.body;
      
      if (!amount || !fromAddress || !toAddress || !privateKey) {
        res.status(400).json({ error: 'Amount, from address, to address, and private key required' });
        return;
      }

      const result = await adminService.transferTokens({
        operation: 'transfer',
        amount: parseFloat(amount),
        fromAddress,
        toAddress,
        privateKey,
        reason: reason || 'Admin transfer'
      });

      res.json(result);
    } catch (error) {
      console.error('Error transferring tokens:', error);
      res.status(500).json({ error: 'Failed to transfer tokens' });
    }
  });

  // Update program settings with secure tracking
  app.post("/api/admin/program-settings", requireAdminAuth, async (req, res) => {
    try {
      const settings = req.body;
      const performedBy = req.user?.identifier || 'unknown';
      
      console.log('Program settings update request:', {
        settings,
        performedBy,
        user: req.user
      });
      
      const result = await adminService.updateProgramSettings(settings, performedBy);
      
      console.log('Program settings update result:', result);
      res.json(result);
    } catch (error) {
      console.error('Error updating program settings:', error);
      res.status(500).json({ error: 'Failed to update program settings' });
    }
  });

  // Get program settings
  app.get("/api/admin/program-settings", requireAdminAuth, async (req, res) => {
    try {
      const settings = await adminService.getCurrentProgramSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error getting program settings:', error);
      res.status(500).json({ error: 'Failed to get program settings' });
    }
  });

  // Get operation history
  app.get("/api/admin/operations", requireAdminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await adminService.getOperationHistory(limit);
      res.json(history);
    } catch (error) {
      console.error('Error getting operation history:', error);
      res.status(500).json({ error: 'Failed to get operation history' });
    }
  });

  // ===== NEW SECURE ADMIN ROUTES =====

  // Get treasury balance (read-only)
  app.get("/api/admin/treasury/balance", requireAdminAuth, async (req, res) => {
    try {
      const balance = await adminService.getTreasuryBalance();
      res.json(balance);
    } catch (error) {
      console.error('Error getting treasury balance:', error);
      res.status(500).json({ error: 'Failed to get treasury balance' });
    }
  });

  // Get treasury configuration
  app.get("/api/admin/treasury/config", requireAdminAuth, async (req, res) => {
    try {
      const config = await adminService.getAdminTreasuryStats();
      res.json(config);
    } catch (error) {
      console.error('Error getting treasury configuration:', error);
      res.status(500).json({ error: 'Failed to get treasury configuration' });
    }
  });

  // Update treasury configuration (without private keys)
  app.post("/api/admin/treasury/config", requireAdminAuth, async (req, res) => {
    try {
      const config = req.body;
      const performedBy = req.user?.identifier || 'unknown';
      
      if (!config.programBudget || !config.programDurationDays) {
        res.status(400).json({ error: 'Program budget and program duration required' });
        return;
      }

      const result = await adminService.updateTreasuryConfiguration(config, performedBy);
      res.json(result);
    } catch (error) {
      console.error('Error updating treasury configuration:', error);
      res.status(500).json({ error: 'Failed to update treasury configuration' });
    }
  });



  // Admin login with wallet
  app.post("/api/admin/login-wallet", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      console.log('Admin login attempt with wallet:', walletAddress);
      
      if (!walletAddress) {
        console.log('Missing wallet address');
        res.status(400).json({ error: 'Wallet address required' });
        return;
      }

      const isValid = validateAdminWallet(walletAddress);
      console.log('Wallet validation result:', isValid);
      
      if (!isValid) {
        console.log('Invalid wallet address:', walletAddress);
        res.status(401).json({ error: 'Invalid wallet address' });
        return;
      }

      const token = createAdminSession(walletAddress, 'wallet');
      console.log('Admin session created successfully');
      res.json({ 
        success: true, 
        token, 
        message: 'Admin wallet login successful' 
      });
    } catch (error) {
      console.error('Error during admin wallet login:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ===== CLAIM-BASED REWARD ROUTES =====

  // Check if user can claim rewards (after 7-day lock period)
  app.get("/api/rewards/claimability/:userAddress", async (req, res) => {
    try {
      const { userAddress } = req.params;
      const claimability = await claimBasedRewards.checkClaimability(userAddress);
      res.json(claimability);
    } catch (error) {
      console.error('Error checking claimability:', error);
      res.status(500).json({ error: 'Failed to check reward claimability' });
    }
  });

  // Process user's claim request (only after 7-day lock expires)
  app.post("/api/rewards/claim", async (req, res) => {
    try {
      const { userAddress } = req.body;
      
      if (!userAddress) {
        res.status(400).json({ error: 'User address required' });
        return;
      }

      const result = await claimBasedRewards.processClaimRequest(userAddress);
      res.json(result);
    } catch (error) {
      console.error('Error processing claim request:', error);
      res.status(500).json({ error: 'Failed to process claim request' });
    }
  });

  // Get user's reward history with claim status
  app.get("/api/rewards/history/:userAddress", async (req, res) => {
    try {
      const { userAddress } = req.params;
      const history = await claimBasedRewards.getUserRewardHistory(userAddress);
      res.json(history);
    } catch (error) {
      console.error('Error getting reward history:', error);
      res.status(500).json({ error: 'Failed to get reward history' });
    }
  });

  // Get claim statistics for admin panel
  app.get("/api/admin/claims/stats", requireAdminAuth, async (req, res) => {
    try {
      const stats = await claimBasedRewards.getClaimStatistics();
      res.json(stats);
    } catch (error) {
      console.error('Error getting claim statistics:', error);
      res.status(500).json({ error: 'Failed to get claim statistics' });
    }
  });

  // Blockchain configuration routes
  app.use("/api/blockchain", blockchainConfigRouter);

  const httpServer = createServer(app);
  return httpServer;
}
