import { db } from './db';
import { sql, eq, desc, and, count, sum } from 'drizzle-orm';
import { 
  users, 
  lpPositions, 
  rewards, 
  dailyRewards,
  appTransactions,
  positionEligibility 
} from '@shared/schema';

/**
 * Optimized database queries for improved performance
 */
export class OptimizedQueries {
  
  /**
   * Get user positions with optimized join and indexing
   */
  static async getUserPositionsOptimized(userAddress: string) {
    try {
      // First get user ID with index
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.address, userAddress))
        .limit(1);

      if (!user.length) {
        return [];
      }

      const userId = user[0].id;

      // Optimized query with specific field selection
      const positions = await db
        .select({
          id: lpPositions.id,
          nftTokenId: lpPositions.nftTokenId,
          poolAddress: lpPositions.poolAddress,
          token0Amount: lpPositions.token0Amount,
          token1Amount: lpPositions.token1Amount,
          currentValueUSD: lpPositions.currentValueUSD,
          isActive: lpPositions.isActive,
          createdAt: lpPositions.createdAt,
          accumulatedAmount: rewards.accumulatedAmount,
          dailyRewardAmount: rewards.dailyRewardAmount
        })
        .from(lpPositions)
        .leftJoin(rewards, eq(lpPositions.id, rewards.positionId))
        .where(and(
          eq(lpPositions.userId, userId),
          eq(lpPositions.isActive, true)
        ))
        .orderBy(desc(lpPositions.createdAt))
        .limit(50);

      return positions;
    } catch (error) {
      console.error('Error in getUserPositionsOptimized:', error);
      throw error;
    }
  }

  /**
   * Get reward statistics with optimized aggregation
   */
  static async getRewardStatsOptimized(userAddress: string) {
    try {
      const user = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.address, userAddress))
        .limit(1);

      if (!user.length) {
        return {
          totalAccumulated: 0,
          totalClaimed: 0,
          positionCount: 0
        };
      }

      const userId = user[0].id;

      // Single optimized aggregation query
      const stats = await db
        .select({
          totalAccumulated: sum(rewards.accumulatedAmount),
          totalClaimed: sum(rewards.claimedAmount),
          positionCount: count(rewards.id)
        })
        .from(rewards)
        .innerJoin(lpPositions, eq(rewards.positionId, lpPositions.id))
        .where(and(
          eq(rewards.userId, userId),
          eq(lpPositions.isActive, true)
        ));

      return stats[0] || {
        totalAccumulated: 0,
        totalClaimed: 0,
        positionCount: 0
      };
    } catch (error) {
      console.error('Error in getRewardStatsOptimized:', error);
      throw error;
    }
  }

  /**
   * Get program analytics with optimized queries
   */
  static async getProgramAnalyticsOptimized() {
    try {
      // Use materialized view concept with specific field selection
      const analytics = await db
        .select({
          activeUsers: sql<number>`COUNT(DISTINCT ${lpPositions.userId})`,
          totalLiquidity: sql<number>`COALESCE(SUM(${lpPositions.currentValueUSD}), 0)`,
          totalPositions: sql<number>`COUNT(${lpPositions.id})`
        })
        .from(lpPositions)
        .where(and(
          eq(lpPositions.isActive, true),
          eq(lpPositions.rewardEligible, true)
        ));

      return analytics[0] || {
        activeUsers: 0,
        totalLiquidity: 0,
        totalPositions: 0
      };
    } catch (error) {
      console.error('Error in getProgramAnalyticsOptimized:', error);
      throw error;
    }
  }

  /**
   * Validate app transaction with optimized lookup
   */
  static async validateAppTransactionOptimized(
    transactionHash: string, 
    userAddress: string
  ) {
    try {
      const result = await db
        .select({
          id: appTransactions.id,
          verificationStatus: appTransactions.verificationStatus,
          isEligible: positionEligibility.isEligible
        })
        .from(appTransactions)
        .leftJoin(
          positionEligibility, 
          eq(appTransactions.id, positionEligibility.appTransactionId)
        )
        .where(and(
          eq(appTransactions.transactionHash, transactionHash),
          eq(appTransactions.userAddress, userAddress)
        ))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Error in validateAppTransactionOptimized:', error);
      throw error;
    }
  }

  /**
   * Get daily rewards summary with date optimization
   */
  static async getDailyRewardsSummary(
    userId: number, 
    startDate: Date, 
    endDate: Date
  ) {
    try {
      const summary = await db
        .select({
          date: dailyRewards.date,
          totalRewards: sum(dailyRewards.dailyRewardAmount),
          positionCount: count(dailyRewards.positionId),
          avgAPR: sql<number>`AVG(${dailyRewards.effectiveAPR})`
        })
        .from(dailyRewards)
        .where(and(
          eq(dailyRewards.userId, userId),
          sql`${dailyRewards.date} >= ${startDate.toISOString().split('T')[0]}`,
          sql`${dailyRewards.date} <= ${endDate.toISOString().split('T')[0]}`
        ))
        .groupBy(dailyRewards.date)
        .orderBy(desc(dailyRewards.date))
        .limit(30);

      return summary;
    } catch (error) {
      console.error('Error in getDailyRewardsSummary:', error);
      throw error;
    }
  }

  /**
   * Get active positions with reward eligibility
   */
  static async getActiveEligiblePositions() {
    try {
      const positions = await db
        .select({
          positionId: lpPositions.id,
          nftTokenId: lpPositions.nftTokenId,
          userId: lpPositions.userId,
          currentValueUSD: lpPositions.currentValueUSD,
          createdAt: lpPositions.createdAt
        })
        .from(lpPositions)
        .where(and(
          eq(lpPositions.isActive, true),
          eq(lpPositions.rewardEligible, true),
          eq(lpPositions.createdViaApp, true)
        ))
        .orderBy(desc(lpPositions.currentValueUSD))
        .limit(100);

      return positions;
    } catch (error) {
      console.error('Error in getActiveEligiblePositions:', error);
      throw error;
    }
  }

  /**
   * Batch update position values for performance
   */
  static async batchUpdatePositionValues(updates: Array<{
    id: number;
    currentValueUSD: string;
    liquidity: string;
  }>) {
    try {
      // Use transaction for batch updates
      await db.transaction(async (tx) => {
        for (const update of updates) {
          await tx
            .update(lpPositions)
            .set({
              currentValueUSD: update.currentValueUSD,
              liquidity: update.liquidity
            })
            .where(eq(lpPositions.id, update.id));
        }
      });

      return { updated: updates.length };
    } catch (error) {
      console.error('Error in batchUpdatePositionValues:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  static async getQueryPerformanceMetrics() {
    try {
      // Check table sizes and query performance
      const tableStats = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC
      `);

      const indexStats = await db.execute(sql`
        SELECT 
          indexrelname as index_name,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched,
          idx_scan as scans
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 10
      `);

      return {
        tableStats: tableStats.rows,
        indexStats: indexStats.rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {
        tableStats: [],
        indexStats: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}