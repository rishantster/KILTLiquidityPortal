import { ethers } from 'ethers';
import { db } from './db';
import { rewards, users, adminOperations } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';

export interface ClaimResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  amount: number;
  recipient: string;
  lockExpired: boolean;
  daysRemaining?: number;
}

export interface RewardClaimability {
  canClaim: boolean;
  lockExpired: boolean;
  daysRemaining: number;
  totalClaimable: number;
  lockExpiryDate: Date;
}

export class ClaimBasedRewards {
  private provider: ethers.JsonRpcProvider;
  private readonly KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';
  private readonly LOCK_PERIOD_DAYS = 7;
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
   * Check if a user can claim their rewards (rolling 7-day lock per reward)
   */
  async checkClaimability(userAddress: string): Promise<RewardClaimability> {
    try {
      // Get user from database
      const [user] = await db.select().from(users).where(eq(users.walletAddress, userAddress));
      if (!user) {
        return {
          canClaim: false,
          lockExpired: false,
          daysRemaining: 7,
          totalClaimable: 0,
          lockExpiryDate: new Date()
        };
      }

      // Get all unclaimed rewards for this user
      const userRewards = await db.select()
        .from(rewards)
        .where(
          and(
            eq(rewards.userId, user.id),
            eq(rewards.claimed, false)
          )
        );

      if (userRewards.length === 0) {
        return {
          canClaim: false,
          lockExpired: false,
          daysRemaining: 0,
          totalClaimable: 0,
          lockExpiryDate: new Date()
        };
      }

      // Calculate claimable rewards (only those 90+ days old)
      const now = new Date();
      let totalClaimable = 0;
      let nearestUnlockDate: Date | null = null;
      let hasAnyUnlockedRewards = false;

      for (const reward of userRewards) {
        // Calculate when this specific reward unlocks (7 days from its creation)
        const rewardUnlockDate = new Date(reward.createdAt);
        rewardUnlockDate.setDate(rewardUnlockDate.getDate() + this.LOCK_PERIOD_DAYS);
        
        // Check if this reward is unlocked
        if (now >= rewardUnlockDate) {
          // This reward is unlocked and can be claimed
          totalClaimable += parseFloat(reward.dailyAmount || '0');
          hasAnyUnlockedRewards = true;
        } else {
          // This reward is still locked - track nearest unlock date
          if (!nearestUnlockDate || rewardUnlockDate < nearestUnlockDate) {
            nearestUnlockDate = rewardUnlockDate;
          }
        }
      }

      // Calculate days remaining until next unlock
      let daysRemaining = 0;
      let lockExpiryDate = new Date();
      
      if (nearestUnlockDate) {
        daysRemaining = Math.ceil((nearestUnlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        lockExpiryDate = nearestUnlockDate;
      }

      return {
        canClaim: hasAnyUnlockedRewards && totalClaimable > 0,
        lockExpired: hasAnyUnlockedRewards,
        daysRemaining: hasAnyUnlockedRewards ? 0 : daysRemaining,
        totalClaimable,
        lockExpiryDate
      };
    } catch (error) {
      console.error('Error checking claimability:', error);
      return {
        canClaim: false,
        lockExpired: false,
        daysRemaining: 7,
        totalClaimable: 0,
        lockExpiryDate: new Date()
      };
    }
  }

  /**
   * Process a user's claim request (only after 90-day lock expires)
   */
  async processClaimRequest(userAddress: string): Promise<ClaimResult> {
    try {
      // First check if user can claim
      const claimability = await this.checkClaimability(userAddress);
      
      if (!claimability.canClaim) {
        return {
          success: false,
          error: claimability.lockExpired ? 'No claimable rewards' : `Lock period active. ${claimability.daysRemaining} days remaining.`,
          amount: 0,
          recipient: userAddress,
          lockExpired: claimability.lockExpired,
          daysRemaining: claimability.daysRemaining
        };
      }

      // Get user from database
      const [user] = await db.select().from(users).where(eq(users.walletAddress, userAddress));
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          amount: 0,
          recipient: userAddress,
          lockExpired: false
        };
      }

      // Get all unclaimed rewards that are 90+ days old (claimable)
      const userRewards = await db.select()
        .from(rewards)
        .where(
          and(
            eq(rewards.userId, user.id),
            eq(rewards.claimed, false)
          )
        );

      if (userRewards.length === 0) {
        return {
          success: false,
          error: 'No unclaimed rewards found',
          amount: 0,
          recipient: userAddress,
          lockExpired: true
        };
      }

      // Filter rewards that are 7+ days old (claimable)
      const now = new Date();
      const claimableRewards = userRewards.filter(reward => {
        const rewardUnlockDate = new Date(reward.createdAt);
        rewardUnlockDate.setDate(rewardUnlockDate.getDate() + this.LOCK_PERIOD_DAYS);
        return now >= rewardUnlockDate;
      });

      if (claimableRewards.length === 0) {
        return {
          success: false,
          error: 'No rewards have reached 7-day unlock period yet',
          amount: 0,
          recipient: userAddress,
          lockExpired: false
        };
      }

      // Calculate total amount to claim (only unlocked rewards)
      const totalAmount = claimableRewards.reduce((sum, reward) => {
        return sum + (parseFloat(reward.dailyAmount || '0'));
      }, 0);

      // THIS IS WHERE THE SMART CONTRACT INTEGRATION WOULD HAPPEN
      // For now, we simulate the transaction
      // In production, this would:
      // 1. Use the treasury wallet private key (stored securely)
      // 2. Sign a transaction to transfer KILT tokens
      // 3. Send the transaction to the blockchain
      // 4. Wait for confirmation
      
      const simulatedTransactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      
      // Mark only claimable rewards as claimed
      for (const reward of claimableRewards) {
        await db.update(rewards)
          .set({
            claimed: true,
            claimedAt: new Date(),
            transactionHash: simulatedTransactionHash
          })
          .where(eq(rewards.id, reward.id));
      }

      // Log the claim operation
      await this.logClaimOperation(userAddress, totalAmount, simulatedTransactionHash);

      return {
        success: true,
        transactionHash: simulatedTransactionHash,
        amount: totalAmount,
        recipient: userAddress,
        lockExpired: true
      };
    } catch (error) {
      console.error('Error processing claim request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        amount: 0,
        recipient: userAddress,
        lockExpired: false
      };
    }
  }

  /**
   * Get user's reward history with claim status
   */
  async getUserRewardHistory(userAddress: string): Promise<any[]> {
    try {
      const [user] = await db.select().from(users).where(eq(users.walletAddress, userAddress));
      if (!user) return [];

      const userRewards = await db.select()
        .from(rewards)
        .where(eq(rewards.userId, user.id));

      return userRewards.map(reward => ({
        ...reward,
        amount: parseFloat(reward.dailyAmount || '0'),
        claimable: !reward.claimed
      }));
    } catch (error) {
      console.error('Error getting reward history:', error);
      return [];
    }
  }

  /**
   * Log claim operations for audit trail
   */
  private async logClaimOperation(userAddress: string, amount: number, transactionHash: string): Promise<void> {
    try {
      await db.insert(adminOperations).values({
        operationType: 'reward_claim',
        operationDetails: JSON.stringify({
          userAddress,
          amount,
          transactionHash,
          timestamp: new Date().toISOString()
        }),
        treasuryAddress: userAddress,
        amount: amount.toString(),
        reason: 'User claimed rewards after 90-day lock period',
        performedBy: userAddress,
        transactionHash,
        success: true
      });
    } catch (error) {
      console.error('Error logging claim operation:', error);
    }
  }

  /**
   * Get claim statistics for admin panel
   */
  async getClaimStatistics(): Promise<{
    totalClaimed: number;
    totalClaimTransactions: number;
    pendingClaims: number;
    lockedRewards: number;
  }> {
    try {
      // Get all rewards
      const allRewards = await db.select().from(rewards);
      
      const claimed = allRewards.filter(r => r.claimed);
      const pending = allRewards.filter(r => !r.claimed);
      
      const totalClaimed = claimed.reduce((sum, r) => sum + parseFloat(r.dailyAmount || '0'), 0);
      const lockedRewards = pending.reduce((sum, r) => sum + parseFloat(r.dailyAmount || '0'), 0);

      return {
        totalClaimed,
        totalClaimTransactions: claimed.length,
        pendingClaims: pending.length,
        lockedRewards
      };
    } catch (error) {
      console.error('Error getting claim statistics:', error);
      return {
        totalClaimed: 0,
        totalClaimTransactions: 0,
        pendingClaims: 0,
        lockedRewards: 0
      };
    }
  }
}

export const claimBasedRewards = new ClaimBasedRewards();