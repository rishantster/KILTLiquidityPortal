import { Router } from 'express';
import { hybridRewardService } from './hybrid-reward-service';

const router = Router();

/**
 * Get hybrid reward calculation for a specific position
 */
router.get('/hybrid-rewards/:nftTokenId', async (req, res) => {
  try {
    const { nftTokenId } = req.params;
    
    const calculation = await hybridRewardService.calculateHybridRewards(nftTokenId);
    
    res.json({
      success: true,
      data: calculation,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error calculating hybrid rewards:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate hybrid rewards'
    });
  }
});

/**
 * Get hybrid reward breakdown for user's positions
 */
router.get('/hybrid-rewards/user/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    // Get user's positions
    const positions = await getUserPositions(userAddress);
    
    // Calculate hybrid rewards for each position
    const calculations = await Promise.all(
      positions.map(pos => hybridRewardService.calculateHybridRewards(pos.nftTokenId))
    );
    
    // Aggregate results
    const totalDailyReward = calculations.reduce((sum, calc) => sum + calc.totalDailyReward, 0);
    const weightedAPR = calculations.reduce((sum, calc) => sum + (calc.effectiveAPR * calc.currentValueUSD), 0) / 
                       calculations.reduce((sum, calc) => sum + calc.currentValueUSD, 0);
    
    res.json({
      success: true,
      data: {
        userAddress,
        totalPositions: calculations.length,
        totalDailyReward,
        weightedAPR: weightedAPR || 0,
        calculations,
        breakdown: {
          merklComponents: {
            totalFeeEarnings: calculations.reduce((sum, calc) => sum + calc.feeEarningsComponent, 0),
            totalToken0: calculations.reduce((sum, calc) => sum + calc.token0Component, 0),
            totalToken1: calculations.reduce((sum, calc) => sum + calc.token1Component, 0)
          },
          kiltComponents: {
            totalLiquidityShare: calculations.reduce((sum, calc) => sum + calc.liquidityShareComponent, 0),
            totalTimeProgression: calculations.reduce((sum, calc) => sum + calc.timeProgressionComponent, 0)
          }
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting user hybrid rewards:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user hybrid rewards'
    });
  }
});

/**
 * Get hybrid program analytics
 */
router.get('/hybrid-analytics', async (req, res) => {
  try {
    // Get program-wide hybrid reward analytics
    const analytics = await getHybridProgramAnalytics();
    
    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting hybrid analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get hybrid analytics'
    });
  }
});

// Helper functions (placeholders)
async function getUserPositions(userAddress: string): Promise<any[]> {
  // Implementation to get user positions
  return [];
}

async function getHybridProgramAnalytics(): Promise<any> {
  // Implementation to get program-wide analytics
  return {
    totalParticipants: 0,
    totalLiquidity: 0,
    averageAPR: 0,
    merklModeRatio: 0.6,
    componentBreakdown: {
      feesBased: 0.30,
      token0Based: 0.15,
      token1Based: 0.15,
      liquidityBased: 0.25,
      timeBased: 0.15
    }
  };
}

export default router;