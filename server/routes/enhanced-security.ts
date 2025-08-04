import { Router } from 'express';
import { z } from 'zod';
import { SmartContractService } from '../smart-contract-service';

const router = Router();
const contractService = new SmartContractService();

// Enhanced signature generation endpoint
const generateSignatureSchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  amount: z.number().positive('Amount must be positive')
});

router.post('/generate-claim-signature', async (req, res) => {
  // Validate request body
  const validation = generateSignatureSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request parameters'
    });
  }
  try {
    const { userAddress, amount } = validation.data;
    
    console.log(`🔐 Generating secure signature for ${userAddress}: ${amount} KILT`);
    
    const result = await contractService.generateClaimSignature(userAddress, amount);
    
    if ('error' in result) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
    res.json({
      success: true,
      signature: result.signature,
      nonce: result.nonce,
      maxClaimLimit: result.maxClaimLimit,
      amount,
      userAddress
    });
  } catch (error: unknown) {
    console.error('Enhanced signature generation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Signature generation failed'
    });
  }
});

// Calculator authorization management
const calculatorAuthSchema = z.object({
  calculatorAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid calculator address')
});

router.post('/set-pending-calculator', async (req, res) => {
  // Validate request body
  const validation = calculatorAuthSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid calculator address'
    });
  }
  try {
    const { calculatorAddress } = validation.data;
    
    console.log(`🔐 Setting pending calculator: ${calculatorAddress}`);
    
    const result = await contractService.setPendingCalculatorAuthorization(calculatorAddress);
    
    res.json(result);
  } catch (error: unknown) {
    console.error('Set pending calculator failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set pending calculator'
    });
  }
});

router.post('/activate-calculator', async (req, res) => {
  // Validate request body
  const validation = calculatorAuthSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid calculator address'
    });
  }
  try {
    const { calculatorAddress } = validation.data;
    
    console.log(`🔐 Activating calculator: ${calculatorAddress}`);
    
    const result = await contractService.activatePendingCalculator(calculatorAddress);
    
    res.json(result);
  } catch (error: unknown) {
    console.error('Activate calculator failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to activate calculator'
    });
  }
});

// Security status endpoints
router.get('/user-security-status/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address'
      });
    }
    
    // This would typically call contract methods to get security status
    // For now, return a placeholder response
    res.json({
      success: true,
      userAddress,
      currentNonce: 0, // await contract.nonces(userAddress)
      maxClaimLimit: 0, // await contract.getMaxClaimLimit(userAddress)
      lastClaimTime: 0, // await contract.lastClaimTime(userAddress)
      canClaim: true // await contract.canUserClaim(userAddress)
    });
  } catch (error: unknown) {
    console.error('Get user security status failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get security status'
    });
  }
});

export default router;