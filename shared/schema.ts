import { pgTable, text, serial, decimal, timestamp, integer, boolean, date, numeric, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lpPositions = pgTable("lp_positions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  nftId: integer("nft_id").notNull(),
  poolAddress: text("pool_address").notNull(),
  tokenIds: text("token_ids").notNull(), // JSON string for token amounts
  minPrice: decimal("min_price", { precision: 18, scale: 8 }).notNull(),
  maxPrice: decimal("max_price", { precision: 18, scale: 8 }).notNull(),
  liquidity: decimal("liquidity", { precision: 18, scale: 8 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  positionId: integer("position_id").references(() => lpPositions.id),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const poolStats = pgTable("pool_stats", {
  id: serial("id").primaryKey(),
  poolAddress: text("pool_address").notNull(),
  tvl: decimal("tvl", { precision: 18, scale: 2 }).notNull(),
  volume24h: decimal("volume_24h", { precision: 18, scale: 2 }).notNull(),
  apr: decimal("apr", { precision: 5, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 18, scale: 8 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Advanced analytics tables
export const positionSnapshots = pgTable("position_snapshots", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").references(() => lpPositions.id).notNull(),
  liquidityAmount: numeric("liquidity_amount", { precision: 20, scale: 8 }).notNull(),
  token0Amount: numeric("token0_amount", { precision: 20, scale: 8 }).notNull(),
  token1Amount: numeric("token1_amount", { precision: 20, scale: 8 }).notNull(),
  totalValueUSD: numeric("total_value_usd", { precision: 20, scale: 8 }).notNull(),
  feesEarned0: numeric("fees_earned_0", { precision: 20, scale: 8 }).notNull(),
  feesEarned1: numeric("fees_earned_1", { precision: 20, scale: 8 }).notNull(),
  currentTick: integer("current_tick").notNull(),
  inRange: boolean("in_range").notNull(),
  snapshotAt: timestamp("snapshot_at").defaultNow().notNull(),
});

export const poolMetricsHistory = pgTable("pool_metrics_history", {
  id: serial("id").primaryKey(),
  poolAddress: text("pool_address").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  price: numeric("price", { precision: 20, scale: 8 }).notNull(),
  tvl: numeric("tvl", { precision: 20, scale: 8 }).notNull(),
  volume24h: numeric("volume_24h", { precision: 20, scale: 8 }).notNull(),
  liquidity: numeric("liquidity", { precision: 30, scale: 0 }).notNull(),
  tick: integer("tick").notNull(),
  feeGrowthGlobal0: numeric("fee_growth_global_0", { precision: 50, scale: 0 }).notNull(),
  feeGrowthGlobal1: numeric("fee_growth_global_1", { precision: 50, scale: 0 }).notNull(),
});

export const userAnalytics = pgTable("user_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  totalPositions: integer("total_positions").notNull(),
  totalValueUSD: numeric("total_value_usd", { precision: 20, scale: 8 }).notNull(),
  totalFeesEarnedUSD: numeric("total_fees_earned_usd", { precision: 20, scale: 8 }).notNull(),
  totalRewardsEarnedUSD: numeric("total_rewards_earned_usd", { precision: 20, scale: 8 }).notNull(),
  avgPositionSize: numeric("avg_position_size", { precision: 20, scale: 8 }).notNull(),
  bestPerformingPositionId: integer("best_performing_position_id").references(() => lpPositions.id),
});

export const feeEvents = pgTable("fee_events", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").references(() => lpPositions.id).notNull(),
  transactionHash: text("transaction_hash").notNull(),
  blockNumber: integer("block_number").notNull(),
  amount0: numeric("amount_0", { precision: 20, scale: 8 }).notNull(),
  amount1: numeric("amount_1", { precision: 20, scale: 8 }).notNull(),
  amountUSD: numeric("amount_usd", { precision: 20, scale: 8 }).notNull(),
  gasUsed: integer("gas_used").notNull(),
  gasPrice: numeric("gas_price", { precision: 20, scale: 0 }).notNull(),
  eventType: text("event_type").notNull(), // 'collect', 'compound'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").references(() => lpPositions.id).notNull(),
  date: date("date").notNull(),
  impermanentLoss: numeric("impermanent_loss", { precision: 10, scale: 6 }).notNull(),
  feesVsHolding: numeric("fees_vs_holding", { precision: 10, scale: 6 }).notNull(),
  annualizedReturn: numeric("annualized_return", { precision: 10, scale: 6 }).notNull(),
  timeInRange: numeric("time_in_range", { precision: 5, scale: 4 }).notNull(), // 0-1 percentage
  volumeContributed: numeric("volume_contributed", { precision: 20, scale: 8 }).notNull(),
}, (table) => ({
  uniqueConstraint: unique().on(table.positionId, table.date),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  address: true,
});

export const insertLpPositionSchema = createInsertSchema(lpPositions).pick({
  userId: true,
  nftId: true,
  poolAddress: true,
  tokenIds: true,
  minPrice: true,
  maxPrice: true,
  liquidity: true,
});

export const insertRewardSchema = createInsertSchema(rewards).pick({
  userId: true,
  positionId: true,
  amount: true,
});

export const insertPoolStatsSchema = createInsertSchema(poolStats).pick({
  poolAddress: true,
  tvl: true,
  volume24h: true,
  apr: true,
  currentPrice: true,
});

export const insertPositionSnapshotSchema = createInsertSchema(positionSnapshots).pick({
  positionId: true,
  liquidityAmount: true,
  token0Amount: true,
  token1Amount: true,
  totalValueUSD: true,
  feesEarned0: true,
  feesEarned1: true,
  currentTick: true,
  inRange: true,
});

export const insertPoolMetricsHistorySchema = createInsertSchema(poolMetricsHistory).pick({
  poolAddress: true,
  price: true,
  tvl: true,
  volume24h: true,
  liquidity: true,
  tick: true,
  feeGrowthGlobal0: true,
  feeGrowthGlobal1: true,
});

export const insertUserAnalyticsSchema = createInsertSchema(userAnalytics).pick({
  userId: true,
  date: true,
  totalPositions: true,
  totalValueUSD: true,
  totalFeesEarnedUSD: true,
  totalRewardsEarnedUSD: true,
  avgPositionSize: true,
  bestPerformingPositionId: true,
});

export const insertFeeEventSchema = createInsertSchema(feeEvents).pick({
  positionId: true,
  transactionHash: true,
  blockNumber: true,
  amount0: true,
  amount1: true,
  amountUSD: true,
  gasUsed: true,
  gasPrice: true,
  eventType: true,
});

export const insertPerformanceMetricsSchema = createInsertSchema(performanceMetrics).pick({
  positionId: true,
  date: true,
  impermanentLoss: true,
  feesVsHolding: true,
  annualizedReturn: true,
  timeInRange: true,
  volumeContributed: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLpPosition = z.infer<typeof insertLpPositionSchema>;
export type LpPosition = typeof lpPositions.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertPoolStats = z.infer<typeof insertPoolStatsSchema>;
export type PoolStats = typeof poolStats.$inferSelect;

// Analytics types
export type InsertPositionSnapshot = z.infer<typeof insertPositionSnapshotSchema>;
export type PositionSnapshot = typeof positionSnapshots.$inferSelect;
export type InsertPoolMetricsHistory = z.infer<typeof insertPoolMetricsHistorySchema>;
export type PoolMetricsHistory = typeof poolMetricsHistory.$inferSelect;
export type InsertUserAnalytics = z.infer<typeof insertUserAnalyticsSchema>;
export type UserAnalytics = typeof userAnalytics.$inferSelect;
export type InsertFeeEvent = z.infer<typeof insertFeeEventSchema>;
export type FeeEvent = typeof feeEvents.$inferSelect;
export type InsertPerformanceMetrics = z.infer<typeof insertPerformanceMetricsSchema>;
export type PerformanceMetrics = typeof performanceMetrics.$inferSelect;
