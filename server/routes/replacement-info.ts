import { Router } from 'express';
import { rewardService } from '../reward-service';
import { db } from '../db';
import { lpPositions } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Get replacement requirement information for new users
 * Shows what liquidity + time is needed to join Top 100
 */
router.get('/replacement-requirements', async (req, res) => {
  try {
    // Get current Top 100 participants
    const positions = await db.select().from(lpPositions).where(eq(lpPositions.isActive, true));
    
    // Sort by liquidity value (descending) and take top 100
    const sortedPositions = positions.sort((a, b) => b.currentValueUSD - a.currentValueUSD);
    const top100 = sortedPositions.slice(0, 100);
    
    if (top100.length < 100) {
      // Slots available - no replacement needed
      return res.json({
        slotsAvailable: true,
        availableSlots: 100 - top100.length,
        minimumLiquidity: 100, // Minimum $100 position
        message: `${100 - top100.length} slots available! Add liquidity to join the Top 100.`
      });
    }
    
    // Calculate rank 100 replacement requirements
    const rank100Position = top100[99];
    const rank100DaysActive = Math.floor(
      (Date.now() - new Date(rank100Position.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const rank100Score = rank100Position.currentValueUSD * rank100DaysActive;
    
    // Calculate minimum liquidity needed for immediate entry (assuming 1 day)
    const minimumLiquidityFor1Day = Math.ceil(rank100Score / 1);
    
    // Calculate minimum liquidity needed for 30-day strategy
    const minimumLiquidityFor30Days = Math.ceil(rank100Score / 30);
    
    // Calculate minimum liquidity needed for 90-day strategy
    const minimumLiquidityFor90Days = Math.ceil(rank100Score / 90);
    
    return res.json({
      slotsAvailable: false,
      availableSlots: 0,
      rank100Requirements: {
        currentLiquidity: rank100Position.currentValueUSD,
        daysActive: rank100DaysActive,
        liquidityScore: rank100Score
      },
      replacementStrategies: {
        immediate: {
          minimumLiquidity: minimumLiquidityFor1Day,
          days: 1,
          description: "Add this amount to immediately replace rank #100"
        },
        monthly: {
          minimumLiquidity: minimumLiquidityFor30Days,
          days: 30,
          description: "Add this amount and wait 30 days to replace rank #100"
        },
        quarterly: {
          minimumLiquidity: minimumLiquidityFor90Days,
          days: 90,
          description: "Add this amount and wait 90 days to replace rank #100"
        }
      },
      message: `Top 100 full. You need Liquidity × Days > ${rank100Score.toFixed(0)} to replace rank #100.`
    });
    
  } catch (error) {
    console.error('Error fetching replacement requirements:', error);
    res.status(500).json({ 
      error: 'Failed to fetch replacement requirements',
      slotsAvailable: false,
      availableSlots: 0,
      message: 'Unable to calculate replacement requirements at this time.'
    });
  }
});

/**
 * Check if a specific liquidity amount would qualify for Top 100
 * Used for real-time validation in the UI
 */
router.post('/check-eligibility', async (req, res) => {
  try {
    const { liquidityAmount, daysToWait = 1 } = req.body;
    
    if (!liquidityAmount || liquidityAmount <= 0) {
      return res.status(400).json({ error: 'Valid liquidity amount required' });
    }
    
    // Get current Top 100
    const positions = await db.select().from(lpPositions).where(eq(lpPositions.isActive, true));
    const sortedPositions = positions.sort((a, b) => b.currentValueUSD - a.currentValueUSD);
    const top100 = sortedPositions.slice(0, 100);
    
    if (top100.length < 100) {
      return res.json({
        eligible: true,
        rank: top100.length + 1,
        message: `You would be ranked #${top100.length + 1} with ${liquidityAmount} USD liquidity.`
      });
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
      
      return res.json({
        eligible: true,
        rank: projectedRank,
        message: `You would be ranked #${projectedRank} with ${liquidityAmount} USD liquidity after ${daysToWait} days.`
      });
    }
    
    return res.json({
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

export default router;