import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { adminOperations } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Get all admin operations (audit trail)
router.get('/history', async (req, res) => {
  try {
    const operations = await db
      .select()
      .from(adminOperations)
      .orderBy(desc(adminOperations.timestamp))
      .limit(100);

    res.json(operations);
  } catch (error) {
    console.error('Error fetching admin history:', error);
    res.status(500).json({ error: 'Failed to fetch admin history' });
  }
});

// Log a new admin operation
router.post('/log', async (req, res) => {
  try {
    const logData = req.body;
    
    const [operation] = await db
      .insert(adminOperations)
      .values({
        operationType: logData.operationType,
        operationDetails: JSON.stringify(logData.operationDetails),
        treasuryAddress: logData.treasuryAddress,
        amount: logData.amount,
        reason: logData.reason,
        performedBy: logData.performedBy,
        transactionHash: logData.transactionHash,
        success: logData.success,
        errorMessage: logData.errorMessage,
      })
      .returning();

    res.json(operation);
  } catch (error) {
    console.error('Error logging admin operation:', error);
    res.status(500).json({ error: 'Failed to log admin operation' });
  }
});

// Get operations by admin wallet
router.get('/by-admin/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const operations = await db
      .select()
      .from(adminOperations)
      .where(eq(adminOperations.performedBy, walletAddress))
      .orderBy(desc(adminOperations.timestamp))
      .limit(50);

    res.json(operations);
  } catch (error) {
    console.error('Error fetching admin operations by wallet:', error);
    res.status(500).json({ error: 'Failed to fetch admin operations' });
  }
});

export default router;