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

    // Calculate APR as single representative value (early stage APR for clear communication)
    const budgetAmount = parseFloat(treasury.totalAllocation) || parseFloat(treasury.programBudget) || 500000;
    const programDuration = treasury.programDurationDays || 90;
    const aprMultiplier = budgetAmount / 500000;
    
    // APR Calculation Proof:
    // Base APR: 31% (for 500K KILT over 90 days with typical $500 position in $100K pool)
    // Current Budget: ${budgetAmount} KILT
    // Multiplier: ${aprMultiplier} (budget / 500K baseline)
    // Final APR: ${Math.round(31 * aprMultiplier)}%
    
    const representativeAPR = Math.round(31 * aprMultiplier);
    const aprRange = `${representativeAPR}%`;
    
    console.log('APR Calculation Details:', {
      budgetAmount,
      programDuration,
      aprMultiplier,
      baseAPR: 31,
      finalAPR: representativeAPR
    });

    res.json({
      treasury,
      settings,
      aprRange,
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

    res.json({ success: true, message: 'Program settings updated successfully' });
  } catch (error) {
    console.error('Error updating program settings:', error);
    res.status(500).json({ error: 'Failed to update program settings' });
  }
});

export { router as adminSimpleRouter };