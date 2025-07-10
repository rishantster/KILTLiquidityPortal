import { db } from './db';
import { 
  lpPositions, 
  positionEligibility, 
  appTransactions,
  users,
  type InsertLpPosition,
  type InsertPositionEligibility,
  type InsertAppTransaction
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { rewardService } from './reward-service';

export interface PositionRegistrationResult {
  success: boolean;
  positionId?: number;
  message: string;
  alreadyRegistered?: boolean;
  eligibilityStatus: 'eligible' | 'ineligible' | 'pending';
  rewardInfo?: {
    dailyRewards: number;
    estimatedAPR: number;
    lockPeriodDays: number;
  };
}

export interface ExternalPositionData {
  nftTokenId: string;
  poolAddress: string;
  token0Address: string;
  token1Address: string;
  amount0: string;
  amount1: string;
  minPrice: string;
  maxPrice: string;
  liquidity: string;
  currentValueUSD: number;
  feeTier: number;
  createdAt: Date;
}

export class PositionRegistrationService {
  constructor(private db: any) {}

  /**
   * Register an existing Uniswap position (created externally) into our reward program
   */
  async registerExternalPosition(
    userId: number,
    userAddress: string,
    positionData: ExternalPositionData,
    verificationProof?: {
      transactionHash: string;
      blockNumber: number;
      timestamp: string;
    }
  ): Promise<PositionRegistrationResult> {
    try {
      // Check if position is already registered
      const existingPosition = await this.db
        .select()
        .from(lpPositions)
        .where(eq(lpPositions.nftTokenId, positionData.nftTokenId))
        .limit(1);

      if (existingPosition.length > 0) {
        const [position] = existingPosition;
        
        // Check if already eligible for rewards
        const [eligibility] = await this.db
          .select()
          .from(positionEligibility)
          .where(eq(positionEligibility.positionId, position.id))
          .limit(1);

        return {
          success: false,
          message: 'Position already registered in the reward program',
          alreadyRegistered: true,
          eligibilityStatus: eligibility?.isEligible ? 'eligible' : 'ineligible'
        };
      }

      // Validate that this is a KILT-containing position
      const isKiltPosition = this.validateKiltPosition(positionData);
      if (!isKiltPosition) {
        return {
          success: false,
          message: 'Position must contain KILT token to be eligible for rewards',
          eligibilityStatus: 'ineligible'
        };
      }

      // Create position record
      const positionRecord: InsertLpPosition = {
        userId,
        nftTokenId: positionData.nftTokenId,
        poolAddress: positionData.poolAddress,
        token0Address: positionData.token0Address,
        token1Address: positionData.token1Address,
        amount0: positionData.amount0,
        amount1: positionData.amount1,
        minPrice: positionData.minPrice,
        maxPrice: positionData.maxPrice,
        liquidity: positionData.liquidity,
        currentValueUSD: positionData.currentValueUSD.toString(),
        feeTier: positionData.feeTier.toString(),
        isActive: true,
        createdAt: positionData.createdAt
      };

      const [createdPosition] = await this.db
        .insert(lpPositions)
        .values(positionRecord)
        .returning();

      // Create app transaction record for registration
      const registrationTransaction: InsertAppTransaction = {
        sessionId: `registration_${Date.now()}`,
        userId,
        transactionType: 'position_registration',
        transactionHash: verificationProof?.transactionHash || `manual_registration_${positionData.nftTokenId}`,
        blockNumber: verificationProof?.blockNumber?.toString() || '0',
        appVersion: '1.0.0',
        userAgent: 'Position Registration Service',
        ipAddress: '127.0.0.1', // Internal registration
        verificationStatus: 'verified',
        metadata: JSON.stringify({
          registrationType: 'external_position',
          nftTokenId: positionData.nftTokenId,
          registeredAt: new Date().toISOString(),
          originalCreation: positionData.createdAt.toISOString()
        })
      };

      const [appTransaction] = await this.db
        .insert(appTransactions)
        .values(registrationTransaction)
        .returning();

      // Create position eligibility record
      const eligibilityRecord: InsertPositionEligibility = {
        positionId: createdPosition.id,
        appTransactionId: appTransaction.id,
        isEligible: true,
        verificationStatus: 'verified',
        createdThroughApp: false, // External position
        registrationMethod: 'manual_registration',
        eligibilityStartDate: new Date(), // Rewards start from registration date
        metadata: JSON.stringify({
          originalCreationDate: positionData.createdAt.toISOString(),
          registrationDate: new Date().toISOString(),
          externalPosition: true
        })
      };

      await this.db
        .insert(positionEligibility)
        .values(eligibilityRecord);

      // Calculate reward information
      const rewardCalc = await rewardService.calculatePositionRewards(
        userId,
        positionData.nftTokenId,
        positionData.currentValueUSD,
        new Date(), // Use registration date as liquidity start date
        new Date()  // Use registration date as staking start date
      );

      // Create initial reward tracking
      await rewardService.createPositionReward(
        userId,
        createdPosition.id,
        positionData.nftTokenId,
        positionData.currentValueUSD,
        new Date(), // Registration date as liquidity start
        new Date()  // Registration date as staking start
      );

      return {
        success: true,
        positionId: createdPosition.id,
        message: 'Position successfully registered for rewards! Rewards will accrue from today.',
        eligibilityStatus: 'eligible',
        rewardInfo: {
          dailyRewards: rewardCalc.dailyRewards,
          estimatedAPR: rewardCalc.totalAPR,
          lockPeriodDays: 90
        }
      };

    } catch (error) {
      console.error('Error registering external position:', error);
      return {
        success: false,
        message: 'Failed to register position. Please try again.',
        eligibilityStatus: 'ineligible'
      };
    }
  }

  /**
   * Validate that position contains KILT token
   */
  private validateKiltPosition(positionData: ExternalPositionData): boolean {
    const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';
    
    return (
      positionData.token0Address.toLowerCase() === KILT_TOKEN_ADDRESS.toLowerCase() ||
      positionData.token1Address.toLowerCase() === KILT_TOKEN_ADDRESS.toLowerCase()
    );
  }

  /**
   * Get registration status for a position
   */
  async getPositionRegistrationStatus(nftTokenId: string): Promise<{
    isRegistered: boolean;
    isEligible: boolean;
    registrationDate?: Date;
    eligibilityStartDate?: Date;
  }> {
    try {
      const [position] = await this.db
        .select()
        .from(lpPositions)
        .where(eq(lpPositions.nftTokenId, nftTokenId))
        .limit(1);

      if (!position) {
        return {
          isRegistered: false,
          isEligible: false
        };
      }

      const [eligibility] = await this.db
        .select()
        .from(positionEligibility)
        .where(eq(positionEligibility.positionId, position.id))
        .limit(1);

      return {
        isRegistered: true,
        isEligible: eligibility?.isEligible || false,
        registrationDate: position.createdAt,
        eligibilityStartDate: eligibility?.eligibilityStartDate || undefined
      };

    } catch (error) {
      console.error('Error checking registration status:', error);
      return {
        isRegistered: false,
        isEligible: false
      };
    }
  }

  /**
   * List all unregistered KILT positions for a user
   */
  async getUnregisteredKiltPositions(userAddress: string): Promise<{
    eligiblePositions: any[];
    registrationRequired: boolean;
  }> {
    try {
      // This would integrate with Uniswap V3 contracts to fetch user's positions
      // For now, return structure for frontend integration
      
      return {
        eligiblePositions: [],
        registrationRequired: false
      };
    } catch (error) {
      console.error('Error fetching unregistered positions:', error);
      return {
        eligiblePositions: [],
        registrationRequired: false
      };
    }
  }

  /**
   * Bulk register multiple positions
   */
  async bulkRegisterPositions(
    userId: number,
    userAddress: string,
    positions: ExternalPositionData[]
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: PositionRegistrationResult[];
  }> {
    const results: PositionRegistrationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const position of positions) {
      const result = await this.registerExternalPosition(userId, userAddress, position);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      successCount,
      failureCount,
      results
    };
  }
}

export const positionRegistrationService = new PositionRegistrationService(db);