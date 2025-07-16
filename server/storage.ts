import { 
  users, 
  lpPositions, 
  rewards, 
  poolStats,
  type User, 
  type InsertUser,
  type LpPosition,
  type InsertLpPosition,
  type Reward,
  type InsertReward,
  type PoolStats,
  type InsertPoolStats
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByAddress(address: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // LP Position methods
  getLpPosition(id: number): Promise<LpPosition | undefined>;
  getLpPositionsByUserId(userId: number): Promise<LpPosition[]>;
  getAllLpPositions(): Promise<LpPosition[]>;
  createLpPosition(position: InsertLpPosition): Promise<LpPosition>;
  updateLpPosition(id: number, updates: Partial<LpPosition>): Promise<LpPosition | undefined>;
  
  // Position registration methods
  getUserPositions(address: string): Promise<any[]>;
  getRegisteredPositions(address: string): Promise<any[]>;
  
  // Reward methods
  getRewardsByUserId(userId: number): Promise<Reward[]>;
  getRewardsByPositionId(positionId: number): Promise<Reward[]>;
  createReward(reward: InsertReward): Promise<Reward>;
  claimRewards(userId: number): Promise<void>;
  
  // Pool Stats methods
  getPoolStats(poolAddress: string): Promise<PoolStats | undefined>;
  updatePoolStats(poolAddress: string, stats: InsertPoolStats): Promise<PoolStats>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private lpPositions: Map<number, LpPosition> = new Map();
  private rewards: Map<number, Reward> = new Map();
  private poolStats: Map<string, PoolStats> = new Map();
  
  private userIdCounter = 1;
  private positionIdCounter = 1;
  private rewardIdCounter = 1;
  private statsIdCounter = 1;

  constructor() {
    // Initialize with some sample positions for testing replacement notification
    this.initializeSamplePositions();
  }

  private initializeSamplePositions() {
    // No sample data - all data should come from real sources
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByAddress(address: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.address === address);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.userIdCounter++,
      address: insertUser.address,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getLpPosition(id: number): Promise<LpPosition | undefined> {
    return this.lpPositions.get(id);
  }

  async getLpPositionsByUserId(userId: number): Promise<LpPosition[]> {
    return Array.from(this.lpPositions.values()).filter(pos => pos.userId === userId);
  }

  async getAllLpPositions(): Promise<LpPosition[]> {
    return Array.from(this.lpPositions.values());
  }

  async createLpPosition(insertPosition: InsertLpPosition): Promise<LpPosition> {
    const position: LpPosition = {
      id: this.positionIdCounter++,
      userId: insertPosition.userId || null,
      nftId: insertPosition.nftId,
      poolAddress: insertPosition.poolAddress,
      tokenIds: insertPosition.tokenIds,
      minPrice: insertPosition.minPrice,
      maxPrice: insertPosition.maxPrice,
      liquidity: insertPosition.liquidity,
      isActive: true,
      createdAt: new Date(),
    };
    this.lpPositions.set(position.id, position);
    return position;
  }

  async updateLpPosition(id: number, updates: Partial<LpPosition>): Promise<LpPosition | undefined> {
    const position = this.lpPositions.get(id);
    if (!position) return undefined;
    
    const updatedPosition = { ...position, ...updates };
    this.lpPositions.set(id, updatedPosition);
    return updatedPosition;
  }

  async getUserPositions(address: string): Promise<any[]> {
    // In real implementation, this would query Uniswap V3 contracts
    // For now, return empty array - all positions come from real blockchain data
    return [];
  }

  async getRegisteredPositions(address: string): Promise<any[]> {
    // Get positions that have been registered in our system
    const user = await this.getUserByAddress(address);
    if (!user) return [];
    
    return Array.from(this.lpPositions.values()).filter(pos => pos.userId === user.id);
  }

  async getRewardsByUserId(userId: number): Promise<Reward[]> {
    return Array.from(this.rewards.values()).filter(reward => reward.userId === userId);
  }

  async getRewardsByPositionId(positionId: number): Promise<Reward[]> {
    return Array.from(this.rewards.values()).filter(reward => reward.positionId === positionId);
  }

  async createReward(insertReward: InsertReward): Promise<Reward> {
    const reward: Reward = {
      id: this.rewardIdCounter++,
      userId: insertReward.userId || null,
      positionId: insertReward.positionId || null,
      amount: insertReward.amount,
      claimedAt: null,
      createdAt: new Date(),
    };
    this.rewards.set(reward.id, reward);
    return reward;
  }

  async claimRewards(userId: number): Promise<void> {
    const userRewards = Array.from(this.rewards.values()).filter(
      reward => reward.userId === userId && !reward.claimedAt
    );
    
    userRewards.forEach(reward => {
      reward.claimedAt = new Date();
      this.rewards.set(reward.id, reward);
    });
  }

  async getPoolStats(poolAddress: string): Promise<PoolStats | undefined> {
    return this.poolStats.get(poolAddress);
  }

  async updatePoolStats(poolAddress: string, stats: InsertPoolStats): Promise<PoolStats> {
    const existing = this.poolStats.get(poolAddress);
    const poolStat: PoolStats = {
      id: existing?.id || this.statsIdCounter++,
      ...stats,
      updatedAt: new Date(),
    };
    this.poolStats.set(poolAddress, poolStat);
    return poolStat;
  }
}

// Database storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByAddress(address: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.address, address)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getLpPosition(id: number): Promise<LpPosition | undefined> {
    const result = await db.select().from(lpPositions).where(eq(lpPositions.id, id)).limit(1);
    return result[0];
  }

  async getLpPositionsByUserId(userId: number): Promise<LpPosition[]> {
    return await db.select().from(lpPositions).where(eq(lpPositions.userId, userId));
  }

  async getAllLpPositions(): Promise<LpPosition[]> {
    return await db.select().from(lpPositions);
  }

  async createLpPosition(insertPosition: InsertLpPosition): Promise<LpPosition> {
    const result = await db.insert(lpPositions).values(insertPosition).returning();
    return result[0];
  }

  async updateLpPosition(id: number, updates: Partial<LpPosition>): Promise<LpPosition | undefined> {
    const result = await db.update(lpPositions).set(updates).where(eq(lpPositions.id, id)).returning();
    return result[0];
  }

  async getUserPositions(address: string): Promise<any[]> {
    // Return empty array - positions come from blockchain data
    return [];
  }

  async getRegisteredPositions(address: string): Promise<any[]> {
    const user = await this.getUserByAddress(address);
    if (!user) return [];
    
    return await db.select().from(lpPositions).where(eq(lpPositions.userId, user.id));
  }

  async getRewardsByUserId(userId: number): Promise<Reward[]> {
    return await db.select().from(rewards).where(eq(rewards.userId, userId));
  }

  async getRewardsByPositionId(positionId: number): Promise<Reward[]> {
    return await db.select().from(rewards).where(eq(rewards.positionId, positionId));
  }

  async createReward(insertReward: InsertReward): Promise<Reward> {
    const result = await db.insert(rewards).values(insertReward).returning();
    return result[0];
  }

  async claimRewards(userId: number): Promise<void> {
    await db.update(rewards)
      .set({ claimedAt: new Date() })
      .where(eq(rewards.userId, userId));
  }

  async getPoolStats(poolAddress: string): Promise<PoolStats | undefined> {
    const result = await db.select().from(poolStats).where(eq(poolStats.poolAddress, poolAddress)).limit(1);
    return result[0];
  }

  async updatePoolStats(poolAddress: string, stats: InsertPoolStats): Promise<PoolStats> {
    const existing = await this.getPoolStats(poolAddress);
    if (existing) {
      const result = await db.update(poolStats)
        .set({ ...stats, updatedAt: new Date() })
        .where(eq(poolStats.poolAddress, poolAddress))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(poolStats).values({
        ...stats,
        poolAddress,
        updatedAt: new Date()
      }).returning();
      return result[0];
    }
  }
}

// Use database storage instead of in-memory storage
export const storage = new DatabaseStorage();
