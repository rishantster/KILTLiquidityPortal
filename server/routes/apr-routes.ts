import { Request, Response } from 'express';
import { uniswapV3APRService } from '../uniswap-v3-apr-service';
import { rewardService } from '../reward-service';
import { db } from '../db';
import { lpPositions } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Get full APR breakdown for a position
 */
export async function getPositionAPRBreakdown(req: Request, res: Response) {
  try {
    const { positionId } = req.params;
    const positionIdNum = parseInt(positionId);

    if (!positionIdNum || isNaN(positionIdNum)) {
      return res.status(400).json({ error: 'Invalid position ID' });
    }

    // Get position details
    const [position] = await db
      .select()
      .from(lpPositions)
      .where(eq(lpPositions.id, positionIdNum))
      .limit(1);

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    // Calculate rewards (includes both trading fees and incentives)
    const rewardResult = await rewardService.calculatePositionRewards(
      position.userId,
      position.nftTokenId,
      Number(position.currentValueUSD),
      new Date(position.createdAt)
    );

    // Get APR breakdown
    const aprBreakdown = await uniswapV3APRService.getAPRBreakdown(positionIdNum);

    res.json({
      positionId: positionIdNum,
      nftTokenId: position.nftTokenId,
      positionValue: Number(position.currentValueUSD),
      apr: {
        tradingFee: rewardResult.tradingFeeAPR,
        incentive: rewardResult.incentiveAPR,
        total: rewardResult.totalAPR
      },
      breakdown: rewardResult.aprBreakdown,
      components: aprBreakdown.components,
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
    // Error getting position APR breakdown
    res.status(500).json({ error: 'Failed to get APR breakdown' });
  }
}

/**
 * Get pool metrics for APR calculation
 */
export async function getPoolMetrics(req: Request, res: Response) {
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
    // Error getting pool metrics
    res.status(500).json({ error: 'Failed to get pool metrics' });
  }
}

/**
 * Calculate APR for different range strategies
 */
export async function calculateRangeStrategyAPR(req: Request, res: Response) {
  try {
    const { positionValue, currentPrice } = req.body;
    
    if (!positionValue || !currentPrice) {
      return res.status(400).json({ error: 'Missing required parameters' });
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
    // Error calculating range strategy APR
    res.status(500).json({ error: 'Failed to calculate range strategy APR' });
  }
}