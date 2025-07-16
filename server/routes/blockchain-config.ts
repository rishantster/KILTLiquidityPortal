import { Router } from 'express';
import { blockchainConfigService } from '../blockchain-config-service';
import { requireAdminAuth } from '../admin-auth';

const router = Router();

// Get current blockchain configuration
router.get('/config', async (req, res) => {
  try {
    const config = await blockchainConfigService.getConfiguration();
    res.json(config);
  } catch (error) {
    // Error fetching blockchain configuration
    res.status(500).json({ error: 'Failed to fetch blockchain configuration' });
  }
});

// Update blockchain configuration (admin only)
router.post('/config', requireAdminAuth, async (req, res) => {
  try {
    const { kiltTokenAddress, wethTokenAddress, poolAddress, poolFeeRate, networkId } = req.body;
    
    if (!kiltTokenAddress || !wethTokenAddress || !poolAddress) {
      return res.status(400).json({ error: 'Missing required configuration fields' });
    }

    await blockchainConfigService.updateTokenPoolConfig({
      kiltTokenAddress,
      wethTokenAddress,
      poolAddress,
      poolFeeRate: poolFeeRate || 3000,
      networkId: networkId || 8453,
      updatedBy: req.adminId || 'unknown',
    });

    res.json({ success: true, message: 'Blockchain configuration updated successfully' });
  } catch (error) {
    // Error updating blockchain configuration
    res.status(500).json({ error: 'Failed to update blockchain configuration' });
  }
});

export { router as blockchainConfigRouter };