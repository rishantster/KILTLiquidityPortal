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
    // Create sample users
    const users = [
      { id: 1, address: "0x1234567890123456789012345678901234567890", createdAt: new Date("2025-01-01") },
      { id: 2, address: "0x2345678901234567890123456789012345678901", createdAt: new Date("2025-01-02") },
      { id: 3, address: "0x3456789012345678901234567890123456789012", createdAt: new Date("2025-01-03") },
    ];

    users.forEach(user => {
      this.users.set(user.id, user);
    });

    // Create sample positions with different values to test Top 100 system
    const positions = [
      {
        id: 1, userId: 1, nftId: 1001, poolAddress: "0xkilt-eth-pool", tokenIds: "{}",
        minPrice: "0.001", maxPrice: "0.01", liquidity: "1000000", currentValueUSD: "50000",
        isActive: true, createdViaApp: true, appTransactionHash: "0xabc123", appSessionId: "session1",
        verificationStatus: "verified", rewardEligible: true, createdAt: new Date("2025-01-01")
      },
      {
        id: 2, userId: 2, nftId: 1002, poolAddress: "0xkilt-eth-pool", tokenIds: "{}",
        minPrice: "0.001", maxPrice: "0.01", liquidity: "800000", currentValueUSD: "25000",
        isActive: true, createdViaApp: true, appTransactionHash: "0xdef456", appSessionId: "session2",
        verificationStatus: "verified", rewardEligible: true, createdAt: new Date("2025-01-05")
      },
      {
        id: 3, userId: 3, nftId: 1003, poolAddress: "0xkilt-eth-pool", tokenIds: "{}",
        minPrice: "0.001", maxPrice: "0.01", liquidity: "500000", currentValueUSD: "10000",
        isActive: true, createdViaApp: true, appTransactionHash: "0xghi789", appSessionId: "session3",
        verificationStatus: "verified", rewardEligible: true, createdAt: new Date("2025-01-10")
      },
    ];

    positions.forEach(pos => {
      this.lpPositions.set(pos.id, pos as any);
    });

    this.userIdCounter = 4;
    this.positionIdCounter = 4;
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

export const storage = new MemStorage();
