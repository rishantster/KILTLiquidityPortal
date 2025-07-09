import { db } from "./db";
import { appTransactions, positionEligibility, lpPositions, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface AppTransactionData {
  userId: number;
  userAddress: string;
  transactionHash: string;
  transactionType: 'mint' | 'increase' | 'decrease' | 'collect' | 'burn';
  nftTokenId?: string;
  poolAddress: string;
  amount0?: number;
  amount1?: number;
  liquidityAmount?: number;
  gasUsed?: number;
  gasPrice?: number;
  blockNumber?: number;
  appVersion: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface SessionData {
  sessionId: string;
  userId: number;
  userAddress: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export class AppTransactionService {
  private readonly APP_VERSION = "1.0.0";
  private readonly SESSION_DURATION_HOURS = 24;
  private sessions: Map<string, SessionData> = new Map();

  /**
   * Create a new app session for transaction tracking
   * This ensures only transactions initiated through our app are tracked
   */
  async createAppSession(userId: number, userAddress: string, userAgent?: string): Promise<string> {
    const sessionId = nanoid(32); // Generate unique 32-character session ID
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (this.SESSION_DURATION_HOURS * 60 * 60 * 1000));
    
    const sessionData: SessionData = {
      sessionId,
      userId,
      userAddress,
      createdAt: now,
      expiresAt,
      isActive: true
    };
    
    this.sessions.set(sessionId, sessionData);
    
    console.log(`Created app session ${sessionId} for user ${userAddress}`);
    return sessionId;
  }

  /**
   * Validate that a session exists and is active
   */
  validateSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.log(`Session ${sessionId} not found`);
      return null;
    }
    
    if (new Date() > session.expiresAt) {
      console.log(`Session ${sessionId} expired`);
      this.sessions.delete(sessionId);
      return null;
    }
    
    if (!session.isActive) {
      console.log(`Session ${sessionId} is inactive`);
      return null;
    }
    
    return session;
  }

  /**
   * Record a transaction initiated through our app
   * This is the ONLY way positions become eligible for rewards
   */
  async recordAppTransaction(
    sessionId: string,
    transactionData: AppTransactionData,
    ipAddress?: string
  ): Promise<{ success: boolean; transactionId?: number; error?: string }> {
    try {
      // Validate session
      const session = this.validateSession(sessionId);
      if (!session) {
        return { success: false, error: "Invalid or expired session" };
      }
      
      // Verify user matches session
      if (session.userId !== transactionData.userId || 
          session.userAddress.toLowerCase() !== transactionData.userAddress.toLowerCase()) {
        return { success: false, error: "User mismatch with session" };
      }
      
      // Check if transaction already exists
      const existingTransaction = await db
        .select()
        .from(appTransactions)
        .where(eq(appTransactions.transactionHash, transactionData.transactionHash))
        .limit(1);
      
      if (existingTransaction.length > 0) {
        return { success: false, error: "Transaction already recorded" };
      }
      
      // Record the transaction
      const [appTransaction] = await db
        .insert(appTransactions)
        .values({
          userId: transactionData.userId,
          sessionId,
          userAddress: transactionData.userAddress,
          transactionHash: transactionData.transactionHash,
          transactionType: transactionData.transactionType,
          nftTokenId: transactionData.nftTokenId,
          poolAddress: transactionData.poolAddress,
          amount0: transactionData.amount0?.toString(),
          amount1: transactionData.amount1?.toString(),
          liquidityAmount: transactionData.liquidityAmount?.toString(),
          gasUsed: transactionData.gasUsed,
          gasPrice: transactionData.gasPrice?.toString(),
          blockNumber: transactionData.blockNumber,
          verificationStatus: "pending",
          appVersion: transactionData.appVersion || this.APP_VERSION,
          userAgent: transactionData.userAgent,
          ipAddress: ipAddress || transactionData.ipAddress,
        })
        .returning();
      
      console.log(`Recorded app transaction ${transactionData.transactionHash} for user ${transactionData.userAddress}`);
      
      return { success: true, transactionId: appTransaction.id };
      
    } catch (error: any) {
      console.error("Failed to record app transaction:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify transaction on blockchain and update status
   */
  async verifyTransaction(transactionId: number, blockchainData: any): Promise<boolean> {
    try {
      const [transaction] = await db
        .select()
        .from(appTransactions)
        .where(eq(appTransactions.id, transactionId))
        .limit(1);
      
      if (!transaction) {
        return false;
      }
      
      // Update transaction with blockchain verification data
      await db
        .update(appTransactions)
        .set({
          verificationStatus: "verified",
          verifiedAt: new Date(),
          blockNumber: blockchainData.blockNumber,
          gasUsed: blockchainData.gasUsed,
          gasPrice: blockchainData.gasPrice,
        })
        .where(eq(appTransactions.id, transactionId));
      
      console.log(`Verified transaction ${transaction.transactionHash}`);
      return true;
      
    } catch (error: any) {
      console.error("Failed to verify transaction:", error);
      return false;
    }
  }

  /**
   * Create position eligibility record for reward-eligible positions
   * Only positions with verified app transactions are eligible
   */
  async createPositionEligibility(
    positionId: number,
    nftTokenId: string,
    appTransactionId: number,
    eligibilityReason: string = "app_created"
  ): Promise<boolean> {
    try {
      // Verify the app transaction exists and is verified
      const [appTransaction] = await db
        .select()
        .from(appTransactions)
        .where(eq(appTransactions.id, appTransactionId))
        .limit(1);
      
      if (!appTransaction || appTransaction.verificationStatus !== "verified") {
        console.log(`App transaction ${appTransactionId} not verified, position not eligible`);
        return false;
      }
      
      // Create eligibility record
      await db
        .insert(positionEligibility)
        .values({
          positionId,
          nftTokenId,
          appTransactionId,
          eligibilityReason,
          isEligible: true,
          notes: `Position created via app transaction ${appTransaction.transactionHash}`,
        });
      
      console.log(`Created position eligibility for position ${positionId} with NFT ${nftTokenId}`);
      return true;
      
    } catch (error: any) {
      console.error("Failed to create position eligibility:", error);
      return false;
    }
  }

  /**
   * Check if a position is eligible for rewards
   * Only returns true for positions created through our app
   */
  async isPositionEligibleForRewards(positionId: number, nftTokenId: string): Promise<boolean> {
    try {
      const [eligibility] = await db
        .select()
        .from(positionEligibility)
        .where(and(
          eq(positionEligibility.positionId, positionId),
          eq(positionEligibility.nftTokenId, nftTokenId),
          eq(positionEligibility.isEligible, true)
        ))
        .limit(1);
      
      return !!eligibility;
      
    } catch (error: any) {
      console.error("Failed to check position eligibility:", error);
      return false;
    }
  }

  /**
   * Get all app transactions for a user
   */
  async getUserAppTransactions(userId: number): Promise<any[]> {
    try {
      const transactions = await db
        .select()
        .from(appTransactions)
        .where(eq(appTransactions.userId, userId))
        .orderBy(desc(appTransactions.createdAt));
      
      return transactions;
      
    } catch (error: any) {
      console.error("Failed to get user app transactions:", error);
      return [];
    }
  }

  /**
   * Get all reward-eligible positions for a user
   */
  async getUserEligiblePositions(userId: number): Promise<any[]> {
    try {
      const positions = await db
        .select({
          position: lpPositions,
          eligibility: positionEligibility,
          transaction: appTransactions,
        })
        .from(lpPositions)
        .innerJoin(positionEligibility, eq(lpPositions.id, positionEligibility.positionId))
        .innerJoin(appTransactions, eq(positionEligibility.appTransactionId, appTransactions.id))
        .where(and(
          eq(lpPositions.userId, userId),
          eq(lpPositions.rewardEligible, true),
          eq(positionEligibility.isEligible, true)
        ))
        .orderBy(desc(lpPositions.createdAt));
      
      return positions;
      
    } catch (error: any) {
      console.error("Failed to get user eligible positions:", error);
      return [];
    }
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { total: number; active: number; expired: number } {
    const now = new Date();
    let active = 0;
    let expired = 0;
    
    for (const session of this.sessions.values()) {
      if (now > session.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }
    
    return { total: this.sessions.size, active, expired };
  }
}

export const appTransactionService = new AppTransactionService();

// Cleanup expired sessions every hour
setInterval(() => {
  appTransactionService.cleanupExpiredSessions();
}, 60 * 60 * 1000);