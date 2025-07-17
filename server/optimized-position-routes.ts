import { Router } from 'express';
import { storage } from './storage';
import { UniswapIntegrationService } from './services/uniswap-integration';
import { BlockchainConfigService } from './services/blockchain-config';

const router = Router();

// Ultra-fast position endpoint with minimal queries
router.get('/positions/fast/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Get blockchain config
    const blockchainConfig = await BlockchainConfigService.getConfig();
    const uniswapService = new UniswapIntegrationService(blockchainConfig);
    
    // Single optimized call to get wallet positions
    const walletPositions = await uniswapService.getWalletPositions(address);
    
    // Filter for KILT positions only
    const kiltPositions = walletPositions.filter(position => {
      const token0 = position.token0?.toLowerCase();
      const token1 = position.token1?.toLowerCase();
      const kiltToken = blockchainConfig.kiltTokenAddress.toLowerCase();
      
      return token0 === kiltToken || token1 === kiltToken;
    });
    
    // Return minimal position data for instant display
    const fastPositions = kiltPositions.map(position => ({
      nftTokenId: position.tokenId,
      tokenAmountKilt: position.token0?.toLowerCase() === blockchainConfig.kiltTokenAddress.toLowerCase() 
        ? position.amount0 : position.amount1,
      tokenAmountEth: position.token0?.toLowerCase() === blockchainConfig.kiltTokenAddress.toLowerCase() 
        ? position.amount1 : position.amount0,
      currentValueUsd: position.currentValueUsd || 0,
      isActive: position.liquidity && position.liquidity !== '0',
      priceRangeLower: position.priceRangeLower || 0,
      priceRangeUpper: position.priceRangeUpper || 0,
      feeTier: position.feeTier || 3000
    }));
    
    res.json(fastPositions);
  } catch (error) {
    console.error('Fast position fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// Optimized position stats endpoint
router.get('/positions/stats/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Get user from database
    const user = await storage.getUserByAddress(address);
    if (!user) {
      return res.json({ 
        totalPositions: 0, 
        activePositions: 0, 
        totalValue: 0 
      });
    }
    
    // Get position count from database
    const positions = await storage.getPositionsByUserId(user.id);
    const activePositions = positions.filter(p => p.isActive);
    const totalValue = activePositions.reduce((sum, p) => sum + (p.currentValueUsd || 0), 0);
    
    res.json({
      totalPositions: positions.length,
      activePositions: activePositions.length,
      totalValue: totalValue
    });
  } catch (error) {
    console.error('Position stats fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch position stats' });
  }
});

export default router;