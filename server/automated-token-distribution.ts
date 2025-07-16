import { ethers } from 'ethers';
import { db } from './db';
import { rewards, treasuryConfig, adminOperations } from '@shared/schema';
import { eq, and, isNotNull, isNull } from 'drizzle-orm';
import { blockchainConfigService } from './blockchain-config-service';

export interface TokenDistributionConfig {
  treasuryWalletAddress: string;
  treasuryPrivateKey: string;
  kiltTokenAddress: string;
  minimumClaimAmount: number;
  gasLimit: number;
  maxGasPrice: string;
}

export interface DistributionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  amount: number;
  recipient: string;
  gasUsed?: number;
}

export class AutomatedTokenDistribution {
  private provider: ethers.JsonRpcProvider;
  private readonly blockchainConfigService = blockchainConfigService;
  private readonly KILT_TOKEN_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)'
  ];

  constructor() {
    this.provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  }

  /**
   * Process all pending reward distributions
   */
  async processRewardDistributions(): Promise<DistributionResult[]> {
    try {
      // Starting automated token distribution process
      
      // Get treasury configuration
      const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
      if (!treasuryConf) {
        // No treasury configuration found
        return [];
      }

      // Get all claimable rewards (rewards that haven't been claimed yet)
      const claimableRewards = await db.select()
        .from(rewards)
        .where(
          and(
            isNull(rewards.claimedAt),
            isNotNull(rewards.dailyRewardAmount)
          )
        );

      if (claimableRewards.length === 0) {
        // No claimable rewards found
        return [];
      }

      // Found claimable rewards for processing
      
      const results: DistributionResult[] = [];

      // Process each claimable reward
      for (const reward of claimableRewards) {
        try {
          const result = await this.distributeReward(reward, treasuryConf);
          results.push(result);
          
          // If successful, mark as claimed
          if (result.success) {
            await db.update(rewards)
              .set({ 
                claimedAt: new Date()
              })
              .where(eq(rewards.id, reward.id));
          }
        } catch (error) {
          // Error processing reward
          results.push({
            success: false,
            error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
            amount: Number(reward.dailyRewardAmount),
            recipient: reward.userAddress || 'unknown'
          });
        }
      }

      return results;
    } catch (error) {
      // Error in automated token distribution
      return [];
    }
  }

  /**
   * Distribute a specific reward to a user
   */
  private async distributeReward(reward: any, treasuryConf: any): Promise<DistributionResult> {
    try {
      // This is a placeholder for the actual implementation
      // In a real system, you would need:
      // 1. Treasury wallet private key (securely stored)
      // 2. Smart contract for reward distribution
      // 3. Proper gas estimation and fee handling
      
      // Processing reward distribution
      
      // For now, we'll simulate the transaction
      // In production, this would be the actual blockchain transaction
      const simulatedResult: DistributionResult = {
        success: true,
        transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        amount: Number(reward.dailyRewardAmount),
        recipient: reward.userAddress || 'unknown',
        gasUsed: 21000
      };

      // Log the operation
      await this.logDistributionOperation(simulatedResult, 'automated_distribution');

      return simulatedResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
        amount: Number(reward.dailyRewardAmount),
        recipient: reward.userAddress || 'unknown'
      };
    }
  }

  /**
   * Get treasury wallet balance
   */
  async getTreasuryBalance(): Promise<{ balance: number; address: string }> {
    try {
      const [config] = await db.select().from(treasuryConfig).limit(1);
      if (!config) {
        return { balance: 0, address: '0x0000000000000000000000000000000000000000' };
      }

      const { kilt } = await this.blockchainConfigService.getTokenAddresses();
      const kiltContract = new ethers.Contract(kilt, this.KILT_TOKEN_ABI, this.provider);
      const balance = await kiltContract.balanceOf(config.treasuryWalletAddress);
      const balanceEther = parseFloat(ethers.formatEther(balance));

      return {
        balance: balanceEther,
        address: config.treasuryWalletAddress
      };
    } catch (error) {
      // Error getting treasury balance
      return { balance: 0, address: '0x0000000000000000000000000000000000000000' };
    }
  }

  /**
   * Manual reward distribution for admin panel
   */
  async manualDistribution(
    recipientAddress: string,
    amount: number,
    reason: string,
    performedBy: string
  ): Promise<DistributionResult> {
    try {
      // Get treasury configuration
      const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
      if (!treasuryConf) {
        throw new Error('Treasury configuration not found');
      }

      // Validate recipient address
      if (!ethers.isAddress(recipientAddress)) {
        throw new Error('Invalid recipient address');
      }

      // Validate amount
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Check treasury balance
      const treasuryBalance = await this.getTreasuryBalance();
      if (treasuryBalance.balance < amount) {
        throw new Error('Insufficient treasury balance');
      }

      // For now, simulate the transaction
      // In production, this would be the actual blockchain transaction
      const result: DistributionResult = {
        success: true,
        transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
        amount: amount,
        recipient: recipientAddress,
        gasUsed: 21000
      };

      // Log the operation
      await this.logDistributionOperation(result, 'manual_distribution', performedBy, reason);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
        amount: amount,
        recipient: recipientAddress
      };
    }
  }

  /**
   * Log distribution operations for audit trail
   */
  private async logDistributionOperation(
    result: DistributionResult,
    operationType: string,
    performedBy: string = 'system',
    reason: string = 'Automated reward distribution'
  ): Promise<void> {
    try {
      await db.insert(adminOperations).values({
        operationType,
        operationDetails: JSON.stringify({
          recipient: result.recipient,
          amount: result.amount,
          transactionHash: result.transactionHash,
          gasUsed: result.gasUsed,
          success: result.success,
          error: result.error
        }),
        treasuryAddress: result.recipient,
        amount: result.amount.toString(),
        reason,
        performedBy,
        transactionHash: result.transactionHash,
        success: result.success,
        errorMessage: result.error
      });
    } catch (error) {
      // Error logging distribution operation
    }
  }

  /**
   * Get distribution statistics
   */
  async getDistributionStats(): Promise<{
    totalDistributed: number;
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageGasUsed: number;
  }> {
    try {
      const operations = await db.select()
        .from(adminOperations)
        .where(eq(adminOperations.operationType, 'automated_distribution'));

      const stats = {
        totalDistributed: 0,
        totalTransactions: operations.length,
        successfulTransactions: 0,
        failedTransactions: 0,
        averageGasUsed: 0
      };

      let totalGasUsed = 0;
      let gasTransactions = 0;

      for (const op of operations) {
        if (op.success) {
          stats.successfulTransactions++;
          if (op.amount) {
            stats.totalDistributed += parseFloat(op.amount);
          }
        } else {
          stats.failedTransactions++;
        }

        // Parse operation details for gas usage
        try {
          const details = JSON.parse(op.operationDetails || '{}');
          if (details.gasUsed) {
            totalGasUsed += details.gasUsed;
            gasTransactions++;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      stats.averageGasUsed = gasTransactions > 0 ? totalGasUsed / gasTransactions : 0;

      return stats;
    } catch (error) {
      // Error getting distribution stats
      return {
        totalDistributed: 0,
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        averageGasUsed: 0
      };
    }
  }
}

export const automatedTokenDistribution = new AutomatedTokenDistribution();