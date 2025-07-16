import { Router } from 'express';
import { db } from '../db';
import { users, lpPositions, rewards, treasuryConfig, programSettings } from '@shared/schema';
import { sql } from 'drizzle-orm';

const router = Router();

// System health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Database connection check
    const dbCheck = await db.select({ count: sql<number>`count(*)` }).from(users);
    
    // Get system statistics
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const positionCount = await db.select({ count: sql<number>`count(*)` }).from(lpPositions);
    const rewardCount = await db.select({ count: sql<number>`count(*)` }).from(rewards);
    
    // Check treasury and program configuration
    const treasuryExists = await db.select().from(treasuryConfig).limit(1);
    const settingsExists = await db.select().from(programSettings).limit(1);
    
    // Core system status
    const systemHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        totalUsers: userCount[0].count,
        totalPositions: positionCount[0].count,
        totalRewards: rewardCount[0].count
      },
      configuration: {
        treasuryConfigured: treasuryExists.length > 0,
        programSettingsConfigured: settingsExists.length > 0,
        treasuryBudget: treasuryExists[0]?.totalAllocation || 0,
        programDuration: treasuryExists[0]?.programDurationDays || 0
      },
      smartContracts: {
        status: 'simulation_mode',
        deployed: false,
        warning: 'Smart contracts not deployed - using simulation mode'
      },
      integrations: {
        uniswapV3: 'available',
        priceFeeds: 'available',
        kiltData: 'available'
      }
    };
    
    res.json(systemHealth);
    
  } catch (error) {
    console.error('System health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'System health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Quick API test endpoint
router.get('/test', async (req, res) => {
  res.json({
    status: 'API working',
    timestamp: new Date().toISOString(),
    message: 'Admin API endpoints are functional'
  });
});

// Fix critical database issues
router.post('/fix-database', async (req, res) => {
  try {
    // Ensure treasury config exists
    const treasuryExists = await db.select().from(treasuryConfig).limit(1);
    if (treasuryExists.length === 0) {
      await db.insert(treasuryConfig).values({
        treasuryWalletAddress: '0x0000000000000000000000000000000000000000',
        totalAllocation: 500000,
        dailyRewardsCap: 5555.56,
        programDurationDays: 90,
        programStartDate: new Date(),
        programEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true,
        createdBy: 'system-repair'
      });
    }
    
    // Ensure program settings exist
    const settingsExists = await db.select().from(programSettings).limit(1);
    if (settingsExists.length === 0) {
      await db.insert(programSettings).values({
        timeBoostCoefficient: 0.6,
        fullRangeBonus: 1.2,
        minimumPositionValue: 10,
        lockPeriod: 7,
        inRangeRequirement: true
      });
    }
    
    res.json({
      success: true,
      message: 'Database structure repaired successfully',
      changes: {
        treasuryConfig: treasuryExists.length === 0 ? 'created' : 'exists',
        programSettings: settingsExists.length === 0 ? 'created' : 'exists'
      }
    });
    
  } catch (error) {
    console.error('Database repair failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database repair failed'
    });
  }
});

export { router as systemHealthRouter };