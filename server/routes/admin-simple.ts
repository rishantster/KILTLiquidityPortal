import { Router } from 'express';
import { db } from '../db';
import { treasuryConfig, programSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Simple admin configuration endpoint
router.get('/config', async (req, res) => {
  try {
    // Get treasury configuration
    const treasuryResult = await db.select().from(treasuryConfig).limit(1);
    const treasury = treasuryResult[0] || {
      treasuryWalletAddress: '0x0000000000000000000000000000000000000000',
      totalAllocation: 500000,
      programBudget: 500000,
      programDurationDays: 90,
      dailyRewardsCap: 5555.56,
      isActive: true
    };

    // Get program settings
    const settingsResult = await db.select().from(programSettings).limit(1);
    const settings = settingsResult[0] || {
      timeBoostCoefficient: 0.6,
      fullRangeBonus: 1.2,
      minimumPositionValue: 10,
      lockPeriod: 7,
      inRangeRequirement: true
    };

    // Calculate APR using the exact reward formula R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)
    let aprData;
    try {
      const { unifiedAPRService } = await import('../unified-apr-service.js');
      aprData = await unifiedAPRService.getUnifiedAPRCalculation();
      console.log('Admin Panel APR (Unified with Real Uniswap Data):', aprData);
    } catch (error) {
      console.error('Error loading unified APR service, using fallback calculation:', error);
      
      // Fallback calculation using the same formula
      const treasuryBudget = parseFloat(treasury.totalAllocation) || 500000;
      const programDuration = treasury.programDurationDays || 90;
      const dailyBudget = parseFloat(treasury.dailyRewardsCap) || 5555.56;
      const timeBoost = parseFloat(settings.timeBoostCoefficient) || 0.6;
      const fullRangeBonus = parseFloat(settings.fullRangeBonus) || 1.2;
      
      // Use realistic pool scenarios based on actual Uniswap data
      const assumedPositionValue = 2000; // Realistic position size for serious participants
      const assumedPoolTVL = 1000000; // Mature pool TVL (1M) for realistic APR
      const liquidityShare = assumedPositionValue / assumedPoolTVL;
      const inRangeMultiplier = 1.0;
      
      // Calculate APR using exact formula
      const minDays = 30;
      const maxDays = programDuration;
      const minTimeProgression = (minDays / programDuration) * timeBoost;
      const maxTimeProgression = (maxDays / programDuration) * timeBoost;
      const minTimeBoost = 1 + minTimeProgression;
      const maxTimeBoost = 1 + maxTimeProgression;
      
      // dailyBudget is in KILT tokens, need to convert to USD for APR calculation
      const { kiltPriceService } = await import('../kilt-price-service.js');
      const kiltPrice = kiltPriceService.getCurrentPrice();
      
      const dailyBudgetUSD = dailyBudget * kiltPrice; // Convert KILT to USD
      const minDailyReward = liquidityShare * minTimeBoost * inRangeMultiplier * fullRangeBonus * dailyBudgetUSD;
      const maxDailyReward = liquidityShare * maxTimeBoost * inRangeMultiplier * fullRangeBonus * dailyBudgetUSD;
      
      const minAPR = Math.round((minDailyReward * 365 / assumedPositionValue) * 100);
      const maxAPR = Math.round((maxDailyReward * 365 / assumedPositionValue) * 100);
      
      aprData = {
        minAPR,
        maxAPR,
        aprRange: `${minAPR}% - ${maxAPR}%`,
        calculationDetails: {
          treasuryAllocation: treasuryBudget,
          programDuration,
          dailyBudget,
          dailyBudgetUSD,
          kiltPrice,
          timeBoost,
          fullRangeBonus,
          baseAPR: minAPR,
          dataSource: 'fallback-formula-based',
          poolTVL: assumedPoolTVL,
          positionValue: assumedPositionValue,
          liquidityShare: liquidityShare
        }
      };
    }

    res.json({
      treasury,
      settings,
      aprRange: aprData.aprRange,
      aprDetails: aprData.calculationDetails,
      systemStatus: {
        totalUsers: 1,
        lpPositions: 0,
        rewardsPaid: 0,
        smartContracts: 'Simulation Mode'
      }
    });
  } catch (error) {
    console.error('Error fetching admin config:', error);
    res.status(500).json({ error: 'Failed to fetch admin configuration' });
  }
});

// Clear cache endpoint
router.post('/clear-cache', async (req, res) => {
  try {
    unifiedAPRService.clearCache();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Get current KILT price info
router.get('/kilt-price', async (req, res) => {
  try {
    const { kiltPriceService } = await import('../kilt-price-service.js');
    const priceInfo = kiltPriceService.getPriceInfo();
    res.json(priceInfo);
  } catch (error) {
    console.error('Error getting KILT price info:', error);
    res.status(500).json({ error: 'Failed to get KILT price info' });
  }
});

// Update treasury configuration
router.post('/treasury', async (req, res) => {
  try {
    const { treasuryBudget, programDuration, treasuryWalletAddress } = req.body;
    
    const dailyRewardsCap = treasuryBudget / programDuration;
    const programStartDate = new Date();
    const programEndDate = new Date(Date.now() + programDuration * 24 * 60 * 60 * 1000);

    // Check if configuration exists
    const existing = await db.select().from(treasuryConfig).limit(1);
    
    if (existing.length > 0) {
      // Update existing configuration
      await db.update(treasuryConfig)
        .set({
          treasuryWalletAddress: treasuryWalletAddress || existing[0].treasuryWalletAddress,
          totalAllocation: treasuryBudget || existing[0].totalAllocation,
          programDurationDays: programDuration || existing[0].programDurationDays,
          dailyRewardsCap: dailyRewardsCap || existing[0].dailyRewardsCap,
          programStartDate: programStartDate || existing[0].programStartDate,
          programEndDate: programEndDate || existing[0].programEndDate,
          isActive: true
        })
        .where(eq(treasuryConfig.id, existing[0].id));
    } else {
      // Create new configuration
      await db.insert(treasuryConfig).values({
        treasuryWalletAddress: treasuryWalletAddress || '0x0000000000000000000000000000000000000000',
        totalAllocation: treasuryBudget || 500000,
        programDurationDays: programDuration || 90,
        dailyRewardsCap: dailyRewardsCap || 5555.56,
        programStartDate,
        programEndDate,
        isActive: true,
        createdBy: 'admin-simple'
      });
    }

    // Clear unified APR cache when treasury config changes
    const { unifiedAPRService } = await import('../unified-apr-service.js');
    unifiedAPRService.clearCache();
    
    res.json({ success: true, message: 'Treasury configuration updated successfully' });
  } catch (error) {
    console.error('Error updating treasury config:', error);
    res.status(500).json({ error: 'Failed to update treasury configuration' });
  }
});

// Update program settings
router.post('/settings', async (req, res) => {
  try {
    const { timeBoost, fullRangeBonus, minPositionValue, lockPeriod } = req.body;
    
    // Check if settings exist
    const existing = await db.select().from(programSettings).limit(1);
    
    if (existing.length > 0) {
      // Update existing settings
      await db.update(programSettings)
        .set({
          timeBoostCoefficient: timeBoost || existing[0].timeBoostCoefficient,
          fullRangeBonus: fullRangeBonus || existing[0].fullRangeBonus,
          minimumPositionValue: minPositionValue || existing[0].minimumPositionValue,
          lockPeriod: lockPeriod || existing[0].lockPeriod,
          inRangeRequirement: true
        })
        .where(eq(programSettings.id, existing[0].id));
    } else {
      // Create new settings
      await db.insert(programSettings).values({
        timeBoostCoefficient: timeBoost || 0.6,
        fullRangeBonus: fullRangeBonus || 1.2,
        minimumPositionValue: minPositionValue || 10,
        lockPeriod: lockPeriod || 7,
        inRangeRequirement: true
      });
    }

    // Clear unified APR cache when program settings change
    const { unifiedAPRService } = await import('../unified-apr-service.js');
    unifiedAPRService.clearCache();
    
    res.json({ success: true, message: 'Program settings updated successfully' });
  } catch (error) {
    console.error('Error updating program settings:', error);
    res.status(500).json({ error: 'Failed to update program settings' });
  }
});

// Blockchain Configuration API
router.post('/blockchain', async (req, res) => {
  try {
    const { kiltTokenAddress, poolAddress, networkId, isActive } = req.body;
    
    // Update blockchain configuration
    const { blockchainConfigService } = await import('./blockchain-config-service');
    
    await blockchainConfigService.updateTokenPoolConfig({
      kiltTokenAddress,
      poolAddress,
      networkId,
      isActive: isActive || true
    });
    
    res.json({ success: true, message: 'Blockchain configuration updated successfully' });
  } catch (error) {
    console.error('Error updating blockchain configuration:', error);
    res.status(500).json({ error: 'Failed to update blockchain configuration' });
  }
});

export { router as adminSimpleRouter };