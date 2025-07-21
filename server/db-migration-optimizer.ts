/**
 * Database Migration and Performance Optimizer
 * Runs essential database improvements for production readiness
 */
import { db } from './db';
import { sql } from 'drizzle-orm';

export class DbMigrationOptimizer {
  /**
   * Run all essential optimizations for production
   */
  static async runEssentialOptimizations(): Promise<void> {
    console.log('🚀 Starting essential database optimizations...');
    
    try {
      // 1. Create critical indexes for performance
      await this.createCriticalIndexes();
      
      // 2. Update database statistics
      await this.updateTableStatistics();
      
      // 3. Set optimal connection settings
      await this.optimizeConnectionSettings();
      
      console.log('✅ Database optimizations completed successfully');
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
    }
  }

  /**
   * Create only the most critical indexes
   */
  private static async createCriticalIndexes(): Promise<void> {
    const criticalIndexes = [
      // User lookups (most frequent)
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_address ON users(address)',
      
      // Position queries (second most frequent)
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lp_positions_user_active ON lp_positions(user_id, is_active)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lp_positions_nft_token ON lp_positions(nft_token_id)',
      
      // Reward calculations
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rewards_user_eligible ON rewards(user_id, is_eligible_for_claim)',
      
      // Transaction tracking
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_app_transactions_hash ON app_transactions(transaction_hash)',
    ];

    for (const indexSql of criticalIndexes) {
      try {
        await db.execute(sql.raw(indexSql));
        console.log(`✅ Created index: ${indexSql.match(/idx_\w+/)?.[0]}`);
      } catch (error) {
        // Index might already exist, that's okay
        console.log(`ℹ️ Index exists or creation skipped`);
      }
    }
  }

  /**
   * Update table statistics for query optimizer
   */
  private static async updateTableStatistics(): Promise<void> {
    try {
      await db.execute(sql`ANALYZE users, lp_positions, rewards, app_transactions`);
      console.log('✅ Updated table statistics');
    } catch (error) {
      console.warn('⚠️ Could not update statistics:', error);
    }
  }

  /**
   * Set optimal connection settings
   */
  private static async optimizeConnectionSettings(): Promise<void> {
    const optimizations = [
      // Improve performance for read-heavy workloads
      'SET default_statistics_target = 100',
      'SET random_page_cost = 1.1', // For SSD storage
      'SET effective_cache_size = "256MB"',
    ];

    for (const setting of optimizations) {
      try {
        await db.execute(sql.raw(setting));
      } catch (error) {
        // Settings might not be adjustable in managed databases
        console.log('ℹ️ Setting adjustment skipped');
      }
    }
  }
}