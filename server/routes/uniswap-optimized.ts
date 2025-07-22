/**
 * UNISWAP-OPTIMIZED Position Routes
 * Blazing fast endpoints matching Uniswap's performance standards
 */

import type { Express } from "express";
import { uniswapStyleOptimizer } from "../uniswap-style-optimizer";
import { storage } from "../storage";

export function registerUniswapOptimizedRoutes(app: Express) {
  /**
   * BLAZING FAST eligible positions endpoint
   * Matches Uniswap's sub-second response times
   */
  app.get("/api/positions/eligible/:userAddress", async (req, res) => {
    const start = Date.now();
    const { userAddress } = req.params;
    
    try {
      console.log(`⚡ UNISWAP-STYLE ELIGIBLE: ${userAddress}`);
      
      // CRITICAL FIX: Skip cache and fetch real-time unregistered positions directly
      const { uniswapIntegrationService } = await import('../uniswap-integration-service');
      const { blockchainConfigService } = await import('../blockchain-config-service');
      
      // Get all user positions from blockchain
      const allPositions = await uniswapIntegrationService.getUserPositions(userAddress);
      const kiltTokenAddress = await blockchainConfigService.getKiltTokenAddress();
      const kiltAddressLower = kiltTokenAddress.toLowerCase();
      
      // Filter for KILT positions only
      const kiltPositions = allPositions.filter(pos => {
        const token0Lower = pos.token0?.toLowerCase() || '';
        const token1Lower = pos.token1?.toLowerCase() || '';
        return token0Lower === kiltAddressLower || token1Lower === kiltAddressLower;
      });
      
      // Get already registered positions
      const user = await storage.getUserByAddress(userAddress);
      let registeredIds = new Set<string>();
      
      if (user) {
        // Get both registered positions and app-created transactions
        const [registeredPositions, appTransactions] = await Promise.all([
          storage.getLpPositionsByUserId(user.id),
          storage.getAppTransactionsByUserId(user.id)
        ]);
        
        // Combine registered positions with app-created NFT IDs
        registeredIds = new Set([
          ...registeredPositions.map(p => p.nftTokenId),
          ...appTransactions.filter(tx => tx.nftTokenId).map(tx => tx.nftTokenId)
        ]);
      }
      
      // Filter unregistered positions
      const eligiblePositions = kiltPositions.filter(pos => 
        !registeredIds.has(pos.tokenId) && pos.isActive
      );

      const duration = Date.now() - start;
      
      // Uniswap-style response headers
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-Cache-Status', 'fresh');
      res.setHeader('X-Optimization', 'uniswap-style');
      
      console.log(`⚡ UNISWAP-SPEED: ${userAddress} eligible in ${duration}ms (fresh)`);
      
      res.json({
        eligiblePositions,
        totalPositions: kiltPositions.length,
        registeredCount: registeredIds.size,
        cacheStatus: 'fresh',
        timing: duration,
        message: eligiblePositions.length > 0 
          ? `Found ${eligiblePositions.length} unregistered positions` 
          : 'All positions registered or no KILT positions found'
      });
      
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`❌ UNISWAP-STYLE FAILED: ${userAddress} in ${duration}ms`, error);
      
      res.status(500).json({
        error: "Failed to fetch eligible positions",
        timing: duration,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Batch position data endpoint (Uniswap multicall style)
   */
  app.get("/api/positions/batch/:userAddress", async (req, res) => {
    const start = Date.now();
    const { userAddress } = req.params;
    
    try {
      const result = await uniswapStyleOptimizer.getOptimizedPositions(
        userAddress,
        async () => {
          const { uniswapIntegrationService } = await import('../uniswap-integration-service');
          return await uniswapIntegrationService.getUserPositions(userAddress);
        },
        async () => {
          const user = await storage.getUserByAddress(userAddress);
          if (!user) return [];
          return await storage.getLpPositionsByUserId(user.id);
        }
      );

      const duration = Date.now() - start;
      
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-Cache-Status', result.source);
      
      res.json({
        allPositions: result.positions,
        eligiblePositions: result.eligiblePositions,
        registeredIds: Array.from(result.registeredIds),
        stats: {
          total: result.positions.length,
          eligible: result.eligiblePositions.length,
          registered: result.registeredIds.size,
          timing: duration,
          source: result.source
        }
      });
      
    } catch (error) {
      const duration = Date.now() - start;
      res.status(500).json({
        error: "Failed to fetch batch position data",
        timing: duration
      });
    }
  });

  /**
   * Cache management endpoints
   */
  app.post("/api/positions/cache/invalidate/:userAddress", async (req, res) => {
    const { userAddress } = req.params;
    uniswapStyleOptimizer.invalidateUser(userAddress);
    res.json({ success: true, message: `Cache invalidated for ${userAddress}` });
  });

  app.get("/api/positions/cache/stats", async (req, res) => {
    const stats = uniswapStyleOptimizer.getStats();
    res.json(stats);
  });

  /**
   * Preload endpoint for optimization
   */
  app.post("/api/positions/preload/:userAddress", async (req, res) => {
    const { userAddress } = req.params;
    
    // Fire and forget preload
    uniswapStyleOptimizer.preloadUser(
      userAddress,
      async () => {
        const { uniswapIntegrationService } = await import('../uniswap-integration-service');
        return await uniswapIntegrationService.getUserPositions(userAddress);
      },
      async () => {
        const user = await storage.getUserByAddress(userAddress);
        if (!user) return [];
        return await storage.getLpPositionsByUserId(user.id);
      }
    );
    
    res.json({ success: true, message: "Preload started" });
  });
}