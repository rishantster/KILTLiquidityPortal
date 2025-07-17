import { pgTable, text, serial, decimal, timestamp, integer, boolean, date, numeric, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Core user table - EVM wallet addresses
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Uniswap V3 LP positions (NFT-based) - App-tracked only
export const lpPositions = pgTable("lp_positions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  nftTokenId: text("nft_token_id").notNull(), // Fixed: Use consistent naming
  poolAddress: text("pool_address").notNull(),
  token0Address: text("token_0_address").notNull(),
  token1Address: text("token_1_address").notNull(),
  token0Amount: numeric("token_0_amount", { precision: 30, scale: 18 }).notNull(),
  token1Amount: numeric("token_1_amount", { precision: 30, scale: 18 }).notNull(),
  minPrice: numeric("min_price", { precision: 30, scale: 18 }).notNull(),
  maxPrice: numeric("max_price", { precision: 30, scale: 18 }).notNull(),
  tickLower: integer("tick_lower").notNull(),
  tickUpper: integer("tick_upper").notNull(),
  liquidity: numeric("liquidity", { precision: 30, scale: 0 }).notNull(),
  feeTier: integer("fee_tier").notNull(), // 500, 3000, 10000 (0.05%, 0.3%, 1%)
  currentValueUSD: numeric("current_value_usd", { precision: 30, scale: 18 }).notNull(),
  isActive: boolean("is_active").default(true),
  // App-specific tracking fields
  createdViaApp: boolean("created_via_app").default(true).notNull(),
  appTransactionHash: text("app_transaction_hash").notNull(),
  appSessionId: text("app_session_id").notNull(),
  verificationStatus: text("verification_status").default("pending").notNull(),
  rewardEligible: boolean("reward_eligible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// KILT treasury reward system with Top 100 ranking
export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  positionId: integer("position_id").references(() => lpPositions.id),
  nftTokenId: text("nft_token_id").notNull(), // Uniswap V3 NFT token ID
  positionValueUSD: decimal("position_value_usd", { precision: 20, scale: 8 }).notNull(),
  dailyRewardAmount: decimal("daily_reward_amount", { precision: 18, scale: 8 }).notNull(),
  accumulatedAmount: decimal("accumulated_amount", { precision: 18, scale: 8 }).notNull(),
  claimedAmount: decimal("claimed_amount", { precision: 18, scale: 8 }).default("0"),
  liquidityAddedAt: timestamp("liquidity_added_at").notNull(), // When liquidity was first added to pool
  stakingStartDate: timestamp("staking_start_date").defaultNow().notNull(), // When NFT staking for rewards started
  lastRewardCalculation: timestamp("last_reward_calculation").defaultNow().notNull(),
  claimedAt: timestamp("claimed_at"),
  isEligibleForClaim: boolean("is_eligible_for_claim").default(false),
  lockPeriodDays: integer("lock_period_days").default(7).notNull(), // 7 days from liquidity addition
  createdAt: timestamp("created_at").defaultNow(),
});

// Real-time pool statistics
export const poolStats = pgTable("pool_stats", {
  id: serial("id").primaryKey(),
  poolAddress: text("pool_address").notNull(),
  tvl: decimal("tvl", { precision: 18, scale: 2 }).notNull(),
  volume24h: decimal("volume_24h", { precision: 18, scale: 2 }).notNull(),
  apr: decimal("apr", { precision: 5, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 18, scale: 8 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Daily reward tracking table
export const dailyRewards = pgTable("daily_rewards", {
  id: serial("id").primaryKey(),
  rewardId: integer("reward_id").references(() => rewards.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  positionId: integer("position_id").references(() => lpPositions.id).notNull(),
  date: date("date").notNull(),
  positionValueUSD: decimal("position_value_usd", { precision: 20, scale: 8 }).notNull(),
  baseAPR: decimal("base_apr", { precision: 5, scale: 2 }).notNull(),
  timeMultiplier: decimal("time_multiplier", { precision: 5, scale: 2 }).notNull(),
  sizeMultiplier: decimal("size_multiplier", { precision: 5, scale: 2 }).notNull(),
  effectiveAPR: decimal("effective_apr", { precision: 5, scale: 2 }).notNull(),
  dailyRewardAmount: decimal("daily_reward_amount", { precision: 18, scale: 8 }).notNull(),
  daysStaked: integer("days_staked").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueUserPositionDate: unique().on(table.userId, table.positionId, table.date),
}));



// App-specific transaction tracking for reward eligibility
export const appTransactions = pgTable("app_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sessionId: text("session_id").notNull(), // Unique session identifier
  userAddress: text("user_address").notNull(),
  transactionHash: text("transaction_hash").notNull().unique(),
  transactionType: text("transaction_type").notNull(), // 'mint', 'increase', 'decrease', 'collect', 'burn'
  nftTokenId: text("nft_token_id"), // Uniswap V3 NFT token ID (if applicable)
  poolAddress: text("pool_address").notNull(),
  amount0: numeric("amount_0", { precision: 20, scale: 8 }),
  amount1: numeric("amount_1", { precision: 20, scale: 8 }),
  liquidityAmount: numeric("liquidity_amount", { precision: 30, scale: 0 }),
  gasUsed: integer("gas_used"),
  gasPrice: numeric("gas_price", { precision: 20, scale: 0 }),
  blockNumber: integer("block_number"),
  verificationStatus: text("verification_status").default("pending").notNull(), // pending, verified, failed
  appVersion: text("app_version").notNull(), // Version of the app used
  userAgent: text("user_agent"), // Browser/device info for fraud detection
  ipAddress: text("ip_address"), // IP address for fraud detection
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
}, (table) => ({
  uniqueSessionTransaction: unique().on(table.sessionId, table.transactionHash),
}));

// Position reward eligibility tracking
export const positionEligibility = pgTable("position_eligibility", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").references(() => lpPositions.id).notNull(),
  nftTokenId: text("nft_token_id").notNull(),
  appTransactionId: integer("app_transaction_id").references(() => appTransactions.id).notNull(),
  eligibilityReason: text("eligibility_reason").notNull(), // 'app_created', 'app_increased', 'verified_transaction'
  isEligible: boolean("is_eligible").default(true).notNull(),
  eligibilityCheckedAt: timestamp("eligibility_checked_at").defaultNow().notNull(),
  lastValidationAt: timestamp("last_validation_at").defaultNow().notNull(),
  notes: text("notes"), // Additional verification notes
}, (table) => ({
  uniquePositionEligibility: unique().on(table.positionId, table.nftTokenId),
}));

// Program settings table - comprehensive formula parameters
export const programSettings = pgTable("program_settings", {
  id: serial("id").primaryKey(),
  programDuration: integer("program_duration").notNull().default(90),
  
  // Core formula parameters
  liquidityWeight: decimal("liquidity_weight", { precision: 10, scale: 3 }).notNull().default("0.600"), // b_time parameter
  baseLiquidityWeight: decimal("base_liquidity_weight", { precision: 10, scale: 3 }).notNull().default("1.000"), // Base liquidity coefficient
  timeBoostCoefficient: decimal("time_boost_coefficient", { precision: 10, scale: 3 }).notNull().default("1.000"), // Time boost multiplier
  inRangeMultiplier: decimal("in_range_multiplier", { precision: 10, scale: 3 }).notNull().default("1.000"), // IRM coefficient
  poolFactor: decimal("pool_factor", { precision: 10, scale: 3 }).notNull().default("1.000"), // Pool performance factor
  concentrationBonus: decimal("concentration_bonus", { precision: 10, scale: 3 }).notNull().default("1.000"), // Concentration range bonus
  
  // Position requirements
  minimumPositionValue: decimal("minimum_position_value", { precision: 18, scale: 8 }).notNull().default("10.00000000"),
  lockPeriod: integer("lock_period").notNull().default(7),
  inRangeRequirement: boolean("in_range_requirement").default(true).notNull(),
  fullRangeBonus: decimal("full_range_bonus", { precision: 10, scale: 3 }).notNull().default("1.200"), // FRB parameter
  
  // Performance thresholds
  minimumTimeInRange: decimal("minimum_time_in_range", { precision: 10, scale: 3 }).notNull().default("0.800"), // 80% minimum time in range
  performanceThreshold: decimal("performance_threshold", { precision: 10, scale: 3 }).notNull().default("0.500"), // 50% performance threshold
  
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Treasury configuration table
export const treasuryConfig = pgTable("treasury_config", {
  id: serial("id").primaryKey(),
  treasuryWalletAddress: text("treasury_wallet_address").notNull().unique(),
  totalAllocation: numeric("total_allocation", { precision: 30, scale: 18 }).notNull(),
  annualRewardsBudget: numeric("annual_rewards_budget", { precision: 30, scale: 18 }).notNull(),
  dailyRewardsCap: numeric("daily_rewards_cap", { precision: 30, scale: 18 }).notNull(),
  programStartDate: timestamp("program_start_date").notNull(),
  programEndDate: timestamp("program_end_date").notNull(),
  programDurationDays: integer("program_duration_days").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Token and pool configuration table - eliminates hardcoded addresses
export const tokenPoolConfig = pgTable("token_pool_config", {
  id: serial("id").primaryKey(),
  kiltTokenAddress: text("kilt_token_address").notNull(),
  wethTokenAddress: text("weth_token_address").notNull(),
  poolAddress: text("pool_address").notNull(),
  poolFeeRate: integer("pool_fee_rate").notNull().default(3000), // 0.3% = 3000
  networkId: integer("network_id").notNull().default(8453), // Base network
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Admin operations audit log
export const adminOperations = pgTable("admin_operations", {
  id: serial("id").primaryKey(),
  operationType: text("operation_type").notNull(), // 'treasury_update', 'settings_change', 'rewards_cap_change'
  operationDetails: text("operation_details").notNull(), // JSON string with operation details
  treasuryAddress: text("treasury_address"),
  amount: numeric("amount", { precision: 30, scale: 18 }),
  reason: text("reason").notNull(),
  performedBy: text("performed_by").notNull(), // Admin wallet address or username
  transactionHash: text("transaction_hash"), // If blockchain transaction involved
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Liquidity events tracking table
export const liquidityEvents = pgTable("liquidity_events", {
  id: serial("id").primaryKey(),
  positionId: integer("position_id").references(() => lpPositions.id).notNull(),
  transactionHash: text("transaction_hash").notNull(),
  blockNumber: integer("block_number").notNull(),
  eventType: text("event_type").notNull(), // 'mint', 'burn', 'increase', 'decrease', 'collect'
  amount0: numeric("amount_0", { precision: 30, scale: 18 }),
  amount1: numeric("amount_1", { precision: 30, scale: 18 }),
  liquidityDelta: numeric("liquidity_delta", { precision: 30, scale: 0 }),
  token0Fees: numeric("token_0_fees", { precision: 30, scale: 18 }),
  token1Fees: numeric("token_1_fees", { precision: 30, scale: 18 }),
  gasUsed: integer("gas_used"),
  gasPrice: numeric("gas_price", { precision: 30, scale: 0 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  address: true,
});

export const insertLpPositionSchema = createInsertSchema(lpPositions).pick({
  userId: true,
  nftTokenId: true,
  poolAddress: true,
  token0Address: true,
  token1Address: true,
  token0Amount: true,
  token1Amount: true,
  minPrice: true,
  maxPrice: true,
  tickLower: true,
  tickUpper: true,
  liquidity: true,
  feeTier: true,
  currentValueUSD: true,
  isActive: true,
  createdViaApp: true,
  appTransactionHash: true,
  appSessionId: true,
  verificationStatus: true,
  rewardEligible: true,
});

export const insertAppTransactionSchema = createInsertSchema(appTransactions).pick({
  userId: true,
  sessionId: true,
  userAddress: true,
  transactionHash: true,
  transactionType: true,
  nftTokenId: true,
  poolAddress: true,
  amount0: true,
  amount1: true,
  liquidityAmount: true,
  gasUsed: true,
  gasPrice: true,
  blockNumber: true,
  verificationStatus: true,
  appVersion: true,
  userAgent: true,
  ipAddress: true,
});

export const insertPositionEligibilitySchema = createInsertSchema(positionEligibility).pick({
  positionId: true,
  nftTokenId: true,
  appTransactionId: true,
  eligibilityReason: true,
  isEligible: true,
  notes: true,
});

export const insertLiquidityEventSchema = createInsertSchema(liquidityEvents).pick({
  positionId: true,
  transactionHash: true,
  blockNumber: true,
  eventType: true,
  amount0: true,
  amount1: true,
  liquidityDelta: true,
  token0Fees: true,
  token1Fees: true,
  gasUsed: true,
  gasPrice: true,
});

export const insertRewardSchema = createInsertSchema(rewards).pick({
  userId: true,
  positionId: true,
  nftTokenId: true,
  positionValueUSD: true,
  dailyRewardAmount: true,
  accumulatedAmount: true,
  liquidityAddedAt: true,
  stakingStartDate: true,
});

export const insertDailyRewardSchema = createInsertSchema(dailyRewards).pick({
  rewardId: true,
  userId: true,
  positionId: true,
  date: true,
  positionValueUSD: true,
  baseAPR: true,
  timeMultiplier: true,
  sizeMultiplier: true,
  effectiveAPR: true,
  dailyRewardAmount: true,
  daysStaked: true,
});

export const insertPoolStatsSchema = createInsertSchema(poolStats).pick({
  poolAddress: true,
  tvl: true,
  volume24h: true,
  apr: true,
  currentPrice: true,
});



// New schema validators for admin features
export const insertProgramSettingsSchema = createInsertSchema(programSettings).pick({
  programDuration: true,
  liquidityWeight: true,
  minimumPositionValue: true,
  lockPeriod: true,
});

export const insertTreasuryConfigSchema = createInsertSchema(treasuryConfig).pick({
  treasuryWalletAddress: true,
  totalAllocation: true,
  annualRewardsBudget: true,
  dailyRewardsCap: true,
  programStartDate: true,
  programEndDate: true,
  programDurationDays: true,
  isActive: true,
  createdBy: true,
});

export const insertAdminOperationSchema = createInsertSchema(adminOperations).pick({
  operationType: true,
  operationDetails: true,
  treasuryAddress: true,
  amount: true,
  reason: true,
  performedBy: true,
  transactionHash: true,
  success: true,
  errorMessage: true,
});

export const insertTokenPoolConfigSchema = createInsertSchema(tokenPoolConfig).pick({
  kiltTokenAddress: true,
  wethTokenAddress: true,
  poolAddress: true,
  poolFeeRate: true,
  networkId: true,
  isActive: true,
  createdBy: true,
});

// Type definitions for inserts and selects
export type LpPosition = typeof lpPositions.$inferSelect;
export type InsertLpPosition = typeof lpPositions.$inferInsert;

export type Reward = typeof rewards.$inferSelect;
export type InsertReward = typeof rewards.$inferInsert;

export type PoolStats = typeof poolStats.$inferSelect;
export type InsertPoolStats = typeof poolStats.$inferInsert;

export type PositionSnapshot = typeof positionSnapshots.$inferSelect;
export type InsertPositionSnapshot = typeof positionSnapshots.$inferInsert;

export type PoolMetricsHistory = typeof poolMetricsHistory.$inferSelect;
export type InsertPoolMetricsHistory = typeof poolMetricsHistory.$inferInsert;

export type UserAnalytics = typeof userAnalytics.$inferSelect;
export type InsertUserAnalytics = typeof userAnalytics.$inferInsert;

export type FeeEvent = typeof feeEvents.$inferSelect;
export type InsertFeeEvent = typeof feeEvents.$inferInsert;

export type DailyReward = typeof dailyRewards.$inferSelect;
export type InsertDailyReward = typeof dailyRewards.$inferInsert;

export type AppTransaction = typeof appTransactions.$inferSelect;
export type InsertAppTransaction = typeof appTransactions.$inferInsert;

export type PositionEligibility = typeof positionEligibility.$inferSelect;
export type InsertPositionEligibility = typeof positionEligibility.$inferInsert;

// Program settings types
export type ProgramSettings = typeof programSettings.$inferSelect;
export type InsertProgramSettings = typeof programSettings.$inferInsert;

// Treasury config types
export type TreasuryConfig = typeof treasuryConfig.$inferSelect;
export type InsertTreasuryConfig = typeof treasuryConfig.$inferInsert;

// Admin operations types
export type AdminOperation = typeof adminOperations.$inferSelect;
export type InsertAdminOperation = typeof adminOperations.$inferInsert;

export type TokenPoolConfig = typeof tokenPoolConfig.$inferSelect;
export type InsertTokenPoolConfig = typeof tokenPoolConfig.$inferInsert;





export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLpPosition = z.infer<typeof insertLpPositionSchema>;
export type LpPosition = typeof lpPositions.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertDailyReward = z.infer<typeof insertDailyRewardSchema>;
export type DailyReward = typeof dailyRewards.$inferSelect;
export type InsertPoolStats = z.infer<typeof insertPoolStatsSchema>;
export type PoolStats = typeof poolStats.$inferSelect;



// Clean up duplicate type definitions
export type LiquidityEvent = typeof liquidityEvents.$inferSelect;
export type InsertLiquidityEvent = z.infer<typeof insertLiquidityEventSchema>;
