import { ethers } from 'ethers';
import { db } from './db';
import { treasuryService } from './treasury-service';
import { adminOperations, programSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AdminTreasuryOperation {
  operation: 'add' | 'remove' | 'transfer';
  amount: number;
  fromAddress?: string;
  toAddress?: string;
  privateKey: string;
  reason: string;
}

export interface AdminProgramSettings {
  programDuration?: number; // in days
  minTimeCoefficient?: number; // for MIN_TIME_COEFFICIENT in formula
  maxTimeCoefficient?: number; // for MAX_TIME_COEFFICIENT in formula
  liquidityWeight?: number; // w1 in formula
  timeWeight?: number; // w2 in formula
  minimumPositionValue?: number; // minimum USD value
  lockPeriod?: number; // in days
}

export interface AdminOperationResult {
  success: boolean;
  transactionHash?: string;
  message: string;
  error?: string;
}

export class AdminService {
  private provider: ethers.JsonRpcProvider;
  private readonly KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';
  private readonly KILT_TOKEN_ABI = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function balanceOf(address account) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
  ];

  constructor() {
    this.provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  }

  /**
   * Add KILT tokens to treasury wallet
   */
  async addToTreasury(operation: AdminTreasuryOperation): Promise<AdminOperationResult> {
    try {
      if (!operation.toAddress || !operation.privateKey) {
        return { success: false, message: 'Treasury address and private key required' };
      }

      const wallet = new ethers.Wallet(operation.privateKey, this.provider);
      const kiltContract = new ethers.Contract(this.KILT_TOKEN_ADDRESS, this.KILT_TOKEN_ABI, wallet);
      
      const amountWei = ethers.parseEther(operation.amount.toString());
      const tx = await kiltContract.transfer(operation.toAddress, amountWei);
      await tx.wait();

      // Log operation
      await this.logAdminOperation({
        operation: 'treasury_add',
        amount: operation.amount,
        toAddress: operation.toAddress,
        transactionHash: tx.hash,
        reason: operation.reason,
        timestamp: new Date()
      });

      return {
        success: true,
        transactionHash: tx.hash,
        message: `Successfully added ${operation.amount} KILT to treasury`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to add to treasury',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove KILT tokens from treasury wallet
   */
  async removeFromTreasury(operation: AdminTreasuryOperation): Promise<AdminOperationResult> {
    try {
      if (!operation.fromAddress || !operation.toAddress || !operation.privateKey) {
        return { success: false, message: 'From address, to address, and private key required' };
      }

      const wallet = new ethers.Wallet(operation.privateKey, this.provider);
      const kiltContract = new ethers.Contract(this.KILT_TOKEN_ADDRESS, this.KILT_TOKEN_ABI, wallet);
      
      const amountWei = ethers.parseEther(operation.amount.toString());
      const tx = await kiltContract.transfer(operation.toAddress, amountWei);
      await tx.wait();

      // Log operation
      await this.logAdminOperation({
        operation: 'treasury_remove',
        amount: operation.amount,
        fromAddress: operation.fromAddress,
        toAddress: operation.toAddress,
        transactionHash: tx.hash,
        reason: operation.reason,
        timestamp: new Date()
      });

      return {
        success: true,
        transactionHash: tx.hash,
        message: `Successfully removed ${operation.amount} KILT from treasury`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to remove from treasury',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Transfer KILT tokens between addresses
   */
  async transferTokens(operation: AdminTreasuryOperation): Promise<AdminOperationResult> {
    try {
      if (!operation.fromAddress || !operation.toAddress || !operation.privateKey) {
        return { success: false, message: 'From address, to address, and private key required' };
      }

      const wallet = new ethers.Wallet(operation.privateKey, this.provider);
      const kiltContract = new ethers.Contract(this.KILT_TOKEN_ADDRESS, this.KILT_TOKEN_ABI, wallet);
      
      const amountWei = ethers.parseEther(operation.amount.toString());
      const tx = await kiltContract.transfer(operation.toAddress, amountWei);
      await tx.wait();

      // Log operation
      await this.logAdminOperation({
        operation: 'treasury_transfer',
        amount: operation.amount,
        fromAddress: operation.fromAddress,
        toAddress: operation.toAddress,
        transactionHash: tx.hash,
        reason: operation.reason,
        timestamp: new Date()
      });

      return {
        success: true,
        transactionHash: tx.hash,
        message: `Successfully transferred ${operation.amount} KILT`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to transfer tokens',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update program settings
   */
  async updateProgramSettings(settings: AdminProgramSettings): Promise<AdminOperationResult> {
    try {
      // Store updated settings in database
      const currentSettings = await this.getCurrentProgramSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
      // Update database with new settings using Drizzle ORM
      await db.insert(programSettings).values({
        id: 1,
        programDuration: updatedSettings.programDuration,
        minTimeCoefficient: updatedSettings.minTimeCoefficient?.toString(),
        maxTimeCoefficient: updatedSettings.maxTimeCoefficient?.toString(),
        liquidityWeight: updatedSettings.liquidityWeight?.toString(),
        timeWeight: updatedSettings.timeWeight?.toString(),
        minimumPositionValue: updatedSettings.minimumPositionValue?.toString(),
        lockPeriod: updatedSettings.lockPeriod,
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: programSettings.id,
        set: {
          programDuration: updatedSettings.programDuration,
          minTimeCoefficient: updatedSettings.minTimeCoefficient?.toString(),
          maxTimeCoefficient: updatedSettings.maxTimeCoefficient?.toString(),
          liquidityWeight: updatedSettings.liquidityWeight?.toString(),
          timeWeight: updatedSettings.timeWeight?.toString(),
          minimumPositionValue: updatedSettings.minimumPositionValue?.toString(),
          lockPeriod: updatedSettings.lockPeriod,
          updatedAt: new Date()
        }
      });

      // Log operation
      await this.logAdminOperation({
        operation: 'program_settings_update',
        settings: settings,
        reason: 'Program settings updated by admin',
        timestamp: new Date()
      });

      return {
        success: true,
        message: 'Program settings updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update program settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current program settings
   */
  async getCurrentProgramSettings(): Promise<AdminProgramSettings> {
    try {
      const result = await db.select().from(programSettings).where(eq(programSettings.id, 1));
      
      if (result.length > 0) {
        const row = result[0];
        return {
          programDuration: row.programDuration || 365,
          minTimeCoefficient: parseFloat(row.minTimeCoefficient) || 0.6,
          maxTimeCoefficient: parseFloat(row.maxTimeCoefficient) || 1.0,
          liquidityWeight: parseFloat(row.liquidityWeight) || 0.6,
          timeWeight: parseFloat(row.timeWeight) || 0.4,
          minimumPositionValue: parseFloat(row.minimumPositionValue) || 100,
          lockPeriod: row.lockPeriod || 90
        };
      }
      
      // Default settings
      return {
        programDuration: 365,
        minTimeCoefficient: 0.6,
        maxTimeCoefficient: 1.0,
        liquidityWeight: 0.6,
        timeWeight: 0.4,
        minimumPositionValue: 100,
        lockPeriod: 90
      };
    } catch (error) {
      // Return default settings if database query fails
      return {
        programDuration: 365,
        minTimeCoefficient: 0.6,
        maxTimeCoefficient: 1.0,
        liquidityWeight: 0.6,
        timeWeight: 0.4,
        minimumPositionValue: 100,
        lockPeriod: 90
      };
    }
  }

  /**
   * Get admin operation history
   */
  async getOperationHistory(limit: number = 50): Promise<any[]> {
    try {
      const result = await db.select().from(adminOperations)
        .orderBy(adminOperations.timestamp)
        .limit(limit);
      
      return result || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get treasury statistics for admin
   */
  async getAdminTreasuryStats(): Promise<any> {
    try {
      const treasuryInfo = await treasuryService.getTreasuryInfo();
      const treasuryStats = await treasuryService.getTreasuryStats();
      const programSettings = await this.getCurrentProgramSettings();
      
      return {
        treasury: treasuryInfo,
        program: treasuryStats,
        settings: programSettings,
        operationHistory: await this.getOperationHistory(10)
      };
    } catch (error) {
      return {
        treasury: { balance: 0, allowance: 0, isConfigured: false },
        program: { totalAllocation: 2905600, totalDistributed: 0, remainingBudget: 2905600 },
        settings: await this.getCurrentProgramSettings(),
        operationHistory: []
      };
    }
  }

  /**
   * Log admin operations for audit trail
   */
  private async logAdminOperation(operation: any): Promise<void> {
    try {
      await db.insert(adminOperations).values({
        operation: operation.operation,
        amount: operation.amount?.toString() || null,
        fromAddress: operation.fromAddress || null,
        toAddress: operation.toAddress || null,
        transactionHash: operation.transactionHash || null,
        reason: operation.reason || null,
        settings: operation.settings ? JSON.stringify(operation.settings) : null,
        timestamp: operation.timestamp
      });
    } catch (error) {
      console.error('Failed to log admin operation:', error);
    }
  }
}

export const adminService = new AdminService();