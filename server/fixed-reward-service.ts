import { db } from './db';
import { lpPositions, users, treasuryConfig } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * PRODUCTION-GRADE Fixed Reward Service
 * Provides public method access for admin configuration
 */
export class FixedRewardService {
  private treasuryAllocation = 1500000; // Fixed treasury allocation
  private programDurationDays = 60; // Fixed program duration
  private dailyBudget = 25000; // Daily budget calculation

  /**
   * PUBLIC METHOD: Get admin configuration (made public for production use)
   */
  async getAdminConfiguration() {
    try {
      // Try to get from database first
      const [config] = await db.select().from(treasuryConfig).limit(1);
      
      if (config) {
        const allocation = config.totalAllocation || this.treasuryAllocation;
        return {
          treasuryAllocation: allocation,
          dailyBudget: allocation / this.programDurationDays,
          programDurationDays: this.programDurationDays
        };
      }
      
      // Fallback to hardcoded values
      return {
        treasuryAllocation: this.treasuryAllocation,
        dailyBudget: this.dailyBudget,
        programDurationDays: this.programDurationDays
      };
    } catch (error) {
      console.error('Failed to get admin configuration:', error);
      // Return production-safe fallback
      return {
        treasuryAllocation: this.treasuryAllocation,
        dailyBudget: this.dailyBudget,
        programDurationDays: this.programDurationDays
      };
    }
  }

  /**
   * Calculate position rewards based on real parameters
   */
  async calculatePositionRewards(userId: number, nftTokenId: string, createdAt: Date): Promise<{
    dailyRewards: number;
    accumulatedRewards: number;
  }> {
    try {
      // Get position data
      const [position] = await db.select()
        .from(lpPositions)
        .where(and(
          eq(lpPositions.userId, userId),
          eq(lpPositions.nftTokenId, nftTokenId)
        ))
        .limit(1);

      if (!position || !position.isActive) {
        return { dailyRewards: 0, accumulatedRewards: 0 };
      }

      // Calculate days active
      const now = new Date();
      const positionCreated = createdAt;
      const daysActive = Math.max(1, Math.floor((now.getTime() - positionCreated.getTime()) / (1000 * 60 * 60 * 24)));

      // Get current position value from database
      const currentValueUSD = parseFloat(position.currentValueUSD || '0');
      
      if (currentValueUSD <= 0) {
        return { dailyRewards: 0, accumulatedRewards: 0 };
      }

      // Get total active liquidity for calculation
      const totalActiveLiquidity = await this.getTotalActiveLiquidity();
      
      // Calculate liquidity share
      const liquidityShare = currentValueUSD / totalActiveLiquidity;
      
      // Calculate daily reward rate
      const adminConfig = await this.getAdminConfiguration();
      const dailyRewardPool = adminConfig.dailyBudget;
      
      // Simple proportional reward calculation
      const dailyRewards = dailyRewardPool * liquidityShare;
      const accumulatedRewards = dailyRewards * daysActive;

      return {
        dailyRewards: Math.max(0, dailyRewards),
        accumulatedRewards: Math.max(0, accumulatedRewards)
      };

    } catch (error) {
      console.error(`Failed to calculate rewards for position ${nftTokenId}:`, error);
      return { dailyRewards: 0, accumulatedRewards: 0 };
    }
  }

  /**
   * Get total active liquidity across all positions
   */
  private async getTotalActiveLiquidity(): Promise<number> {
    try {
      const activePositions = await db.select()
        .from(lpPositions)
        .where(eq(lpPositions.isActive, true));

      const totalLiquidity = activePositions.reduce((sum, pos) => {
        return sum + parseFloat(pos.currentValueUSD || '0');
      }, 0);

      // Ensure minimum total to avoid division by zero
      return Math.max(totalLiquidity, 1);
    } catch (error) {
      console.error('Failed to get total active liquidity:', error);
      return 100000; // Fallback value
    }
  }

  /**
   * Get user reward statistics
   */
  async getUserRewardStats(userId: number): Promise<{
    totalAccumulated: number;
    totalClaimable: number;
    totalClaimed: number;
    activePositions: number;
    avgDailyRewards: number;
  }> {
    try {
      // Get user's active positions
      const activePositions = await db.select()
        .from(lpPositions)
        .where(and(
          eq(lpPositions.userId, userId),
          eq(lpPositions.isActive, true)
        ));

      let totalDailyRewards = 0;
      let totalAccumulated = 0;

      // Calculate rewards for each active position
      for (const position of activePositions) {
        const positionReward = await this.calculatePositionRewards(
          userId, 
          position.nftTokenId,
          position.createdAt || new Date()
        );
        totalDailyRewards += positionReward.dailyRewards;
        totalAccumulated += positionReward.accumulatedRewards;
      }

      return {
        totalAccumulated: Math.max(0, totalAccumulated),
        totalClaimable: Math.max(0, totalAccumulated),
        totalClaimed: 0, // Not implemented yet
        activePositions: activePositions.length,
        avgDailyRewards: Math.max(0, totalDailyRewards)
      };

    } catch (error) {
      console.error(`Failed to get user reward stats for user ${userId}:`, error);
      return {
        totalAccumulated: 0,
        totalClaimable: 0,
        totalClaimed: 0,
        activePositions: 0,
        avgDailyRewards: 0
      };
    }
  }
}

export const fixedRewardService = new FixedRewardService();