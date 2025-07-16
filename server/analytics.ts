import { eq, desc, and, between, sql } from 'drizzle-orm';
import { 
  positionSnapshots, 
  poolMetricsHistory, 
  userAnalytics, 
  feeEvents, 
  performanceMetrics,
  lpPositions,
  users,
  type InsertPositionSnapshot,
  type InsertPoolMetricsHistory,
  type InsertUserAnalytics,
  type InsertFeeEvent,
  type InsertPerformanceMetrics,
  type PositionSnapshot,
  type PoolMetricsHistory,
  type UserAnalytics,
  type FeeEvent,
  type PerformanceMetrics
} from '@shared/schema';

// Analytics service for tracking and calculating advanced metrics
export class AnalyticsService {
  constructor(private db: any) {} // Database interface with Drizzle ORM

  // Position Analytics
  async createPositionSnapshot(data: InsertPositionSnapshot): Promise<PositionSnapshot> {
    const [snapshot] = await this.db.insert(positionSnapshots).values(data).returning();
    return snapshot;
  }

  async getPositionSnapshots(positionId: number, limit = 100): Promise<PositionSnapshot[]> {
    return await this.db
      .select()
      .from(positionSnapshots)
      .where(eq(positionSnapshots.positionId, positionId))
      .orderBy(desc(positionSnapshots.snapshotAt))
      .limit(limit);
  }

  async getPositionPerformanceHistory(positionId: number, days = 30): Promise<PositionSnapshot[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.db
      .select()
      .from(positionSnapshots)
      .where(
        and(
          eq(positionSnapshots.positionId, positionId),
          sql`${positionSnapshots.snapshotAt} >= ${cutoffDate}`
        )
      )
      .orderBy(desc(positionSnapshots.snapshotAt));
  }

  // Pool Analytics
  async recordPoolMetrics(data: InsertPoolMetricsHistory): Promise<PoolMetricsHistory> {
    const [metrics] = await this.db.insert(poolMetricsHistory).values(data).returning();
    return metrics;
  }

  async getPoolPriceHistory(poolAddress: string, hours = 24): Promise<PoolMetricsHistory[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);
    
    return await this.db
      .select()
      .from(poolMetricsHistory)
      .where(
        and(
          eq(poolMetricsHistory.poolAddress, poolAddress),
          sql`${poolMetricsHistory.timestamp} >= ${cutoffDate}`
        )
      )
      .orderBy(desc(poolMetricsHistory.timestamp));
  }

  async getPoolTVLHistory(poolAddress: string, days = 7): Promise<PoolMetricsHistory[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.db
      .select()
      .from(poolMetricsHistory)
      .where(
        and(
          eq(poolMetricsHistory.poolAddress, poolAddress),
          sql`${poolMetricsHistory.timestamp} >= ${cutoffDate}`
        )
      )
      .orderBy(desc(poolMetricsHistory.timestamp));
  }

  // User Analytics
  async updateUserAnalytics(userId: number): Promise<UserAnalytics> {
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate user metrics
    const userPositions = await this.db
      .select()
      .from(lpPositions)
      .where(eq(lpPositions.userId, userId));

    const latestSnapshots = await Promise.all(
      userPositions.map(async (position) => {
        const [snapshot] = await this.db
          .select()
          .from(positionSnapshots)
          .where(eq(positionSnapshots.positionId, position.id))
          .orderBy(desc(positionSnapshots.snapshotAt))
          .limit(1);
        return snapshot;
      })
    );

    const totalValueUSD = latestSnapshots
      .filter(s => s)
      .reduce((sum, snapshot) => sum + parseFloat(snapshot.totalValueUSD), 0);

    const totalFeesEarnedUSD = latestSnapshots
      .filter(s => s)
      .reduce((sum, snapshot) => sum + parseFloat(snapshot.feesEarned0) + parseFloat(snapshot.feesEarned1), 0);

    const avgPositionSize = userPositions.length > 0 ? totalValueUSD / userPositions.length : 0;

    // Find best performing position
    const bestPosition = latestSnapshots
      .filter(s => s)
      .sort((a, b) => parseFloat(b.totalValueUSD) - parseFloat(a.totalValueUSD))[0];

    const analyticsData: InsertUserAnalytics = {
      userId,
      date: today,
      totalPositions: userPositions.length,
      totalValueUSD: totalValueUSD.toString(),
      totalFeesEarnedUSD: totalFeesEarnedUSD.toString(),
      totalRewardsEarnedUSD: '0', // To be calculated based on rewards
      avgPositionSize: avgPositionSize.toString(),
      bestPerformingPositionId: bestPosition?.positionId || null,
    };

    // Upsert user analytics
    const [analytics] = await this.db
      .insert(userAnalytics)
      .values(analyticsData)
      .onConflictDoUpdate({
        target: [userAnalytics.userId, userAnalytics.date],
        set: analyticsData
      })
      .returning();

    return analytics;
  }

  async getUserAnalyticsHistory(userId: number, days = 30): Promise<UserAnalytics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.db
      .select()
      .from(userAnalytics)
      .where(
        and(
          eq(userAnalytics.userId, userId),
          sql`${userAnalytics.date} >= ${cutoffDate.toISOString().split('T')[0]}`
        )
      )
      .orderBy(desc(userAnalytics.date));
  }

  // Fee Event Tracking
  async recordFeeEvent(data: InsertFeeEvent): Promise<FeeEvent> {
    const [event] = await this.db.insert(feeEvents).values(data).returning();
    return event;
  }

  async getFeeEvents(positionId: number, limit = 50): Promise<FeeEvent[]> {
    return await this.db
      .select()
      .from(feeEvents)
      .where(eq(feeEvents.positionId, positionId))
      .orderBy(desc(feeEvents.timestamp))
      .limit(limit);
  }

  async getTotalFeesEarned(positionId: number): Promise<{amount0: string, amount1: string, amountUSD: string}> {
    const result = await this.db
      .select({
        totalAmount0: sql`SUM(${feeEvents.amount0})`,
        totalAmount1: sql`SUM(${feeEvents.amount1})`,
        totalAmountUSD: sql`SUM(${feeEvents.amountUSD})`
      })
      .from(feeEvents)
      .where(eq(feeEvents.positionId, positionId));

    return {
      amount0: result[0]?.totalAmount0?.toString() || '0',
      amount1: result[0]?.totalAmount1?.toString() || '0',
      amountUSD: result[0]?.totalAmountUSD?.toString() || '0'
    };
  }

  // Performance Metrics
  async calculatePerformanceMetrics(positionId: number, date: string): Promise<PerformanceMetrics> {
    // Get position snapshots for calculation
    const snapshots = await this.getPositionSnapshots(positionId, 30);
    
    if (snapshots.length < 2) {
      // Not enough data for calculation
      const defaultMetrics: InsertPerformanceMetrics = {
        positionId,
        date,
        impermanentLoss: '0',
        feesVsHolding: '0',
        annualizedReturn: '0',
        timeInRange: '0',
        volumeContributed: '0'
      };
      
      const [metrics] = await this.db.insert(performanceMetrics).values(defaultMetrics).returning();
      return metrics;
    }

    const latest = snapshots[0];
    const earliest = snapshots[snapshots.length - 1];
    
    // Calculate impermanent loss (simplified)
    const hodlValue = parseFloat(earliest.token0Amount) + parseFloat(earliest.token1Amount);
    const currentValue = parseFloat(latest.totalValueUSD);
    const impermanentLoss = ((currentValue - hodlValue) / hodlValue) * 100;

    // Calculate fees vs holding
    const totalFees = parseFloat(latest.feesEarned0) + parseFloat(latest.feesEarned1);
    const feesVsHolding = (totalFees / currentValue) * 100;

    // Calculate time in range
    const inRangeSnapshots = snapshots.filter(s => s.inRange).length;
    const timeInRange = inRangeSnapshots / snapshots.length;

    // Calculate annualized return (simplified)
    const daysElapsed = Math.max(1, (Date.now() - new Date(earliest.snapshotAt).getTime()) / (1000 * 60 * 60 * 24));
    const totalReturn = ((currentValue + totalFees - hodlValue) / hodlValue) * 100;
    const annualizedReturn = (totalReturn / daysElapsed) * 365;

    const metricsData: InsertPerformanceMetrics = {
      positionId,
      date,
      impermanentLoss: impermanentLoss.toFixed(6),
      feesVsHolding: feesVsHolding.toFixed(6),
      annualizedReturn: annualizedReturn.toFixed(6),
      timeInRange: timeInRange.toFixed(4),
      volumeContributed: '0' // Would need additional data to calculate
    };

    const [metrics] = await this.db
      .insert(performanceMetrics)
      .values(metricsData)
      .onConflictDoUpdate({
        target: [performanceMetrics.positionId, performanceMetrics.date],
        set: metricsData
      })
      .returning();

    return metrics;
  }

  async getPerformanceMetrics(positionId: number, days = 30): Promise<PerformanceMetrics[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.db
      .select()
      .from(performanceMetrics)
      .where(
        and(
          eq(performanceMetrics.positionId, positionId),
          sql`${performanceMetrics.date} >= ${cutoffDate.toISOString().split('T')[0]}`
        )
      )
      .orderBy(desc(performanceMetrics.date));
  }

  // Dashboard Analytics
  async getDashboardMetrics(userId: number) {
    const [userStats] = await this.db
      .select()
      .from(userAnalytics)
      .where(eq(userAnalytics.userId, userId))
      .orderBy(desc(userAnalytics.date))
      .limit(1);

    if (!userStats) {
      return {
        totalPositions: 0,
        totalValueUSD: '0',
        totalFeesEarnedUSD: '0',
        totalRewardsEarnedUSD: '0',
        avgPositionSize: '0',
        bestPerformingPositionId: null
      };
    }

    return userStats;
  }

  async getTopPerformingPositions(userId: number, limit = 5): Promise<TopPerformingPosition[]> {
    const result = await this.db
      .select({
        positionId: performanceMetrics.positionId,
        annualizedReturn: performanceMetrics.annualizedReturn,
        feesVsHolding: performanceMetrics.feesVsHolding,
        timeInRange: performanceMetrics.timeInRange
      })
      .from(performanceMetrics)
      .innerJoin(lpPositions, eq(performanceMetrics.positionId, lpPositions.id))
      .where(eq(lpPositions.userId, userId))
      .orderBy(desc(performanceMetrics.annualizedReturn))
      .limit(limit);

    return result;
  }

  // Real-time data collection helpers
  async shouldTakeSnapshot(positionId: number): Promise<boolean> {
    const [lastSnapshot] = await this.db
      .select()
      .from(positionSnapshots)
      .where(eq(positionSnapshots.positionId, positionId))
      .orderBy(desc(positionSnapshots.snapshotAt))
      .limit(1);

    if (!lastSnapshot) return true;

    // Take snapshot every hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return new Date(lastSnapshot.snapshotAt) < oneHourAgo;
  }

  async shouldRecordPoolMetrics(poolAddress: string): Promise<boolean> {
    const [lastMetrics] = await this.db
      .select()
      .from(poolMetricsHistory)
      .where(eq(poolMetricsHistory.poolAddress, poolAddress))
      .orderBy(desc(poolMetricsHistory.timestamp))
      .limit(1);

    if (!lastMetrics) return true;

    // Record metrics every 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return new Date(lastMetrics.timestamp) < fifteenMinutesAgo;
  }
}