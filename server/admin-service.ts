import { ethers } from 'ethers';
import { db } from './db';
import { treasuryService } from './treasury-service';
import { adminOperations, programSettings, treasuryConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AdminTreasuryConfiguration {
  treasuryWalletAddress: string;
  programBudget: number; // Single unified budget field
  dailyRewardsCap?: number; // Optional - auto-calculated if not provided
  programStartDate: Date;
  programEndDate: Date;
  programDurationDays: number;
  isActive: boolean;
}

export interface AdminProgramSettings {
  // NOTE: programDuration is now controlled by Treasury Config (programDurationDays)
  maxLiquidityBoost?: number; // w1 - max liquidity boost (0.6 = 60% boost)
  minimumPositionValue?: number; // minimum USD value (set to 0 for no minimum)
  lockPeriod?: number; // claim lock period in days (7 days)
  inRangeRequirement?: boolean; // whether IRM (In-Range Multiplier) is required
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
    'function balanceOf(address account) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)'
  ];

  constructor() {
    this.provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  }

  /**
   * Configure treasury settings without private keys
   */
  async updateTreasuryConfiguration(config: AdminTreasuryConfiguration, performedBy: string): Promise<AdminOperationResult> {
    try {
      // Treasury configuration received
      
      // Calculate daily rewards cap from program budget
      const dailyRewardsCap = config.dailyRewardsCap || (config.programBudget / config.programDurationDays);
      
      // Use default treasury address if none provided
      const treasuryAddress = config.treasuryWalletAddress || '0x0000000000000000000000000000000000000000';
      
      // Ensure dates are properly converted
      const startDate = config.programStartDate instanceof Date ? config.programStartDate : new Date(config.programStartDate);
      const endDate = config.programEndDate instanceof Date ? config.programEndDate : new Date(config.programEndDate);
      
      // Date conversion completed
      
      const [existingConfig] = await db.select().from(treasuryConfig).limit(1);
      
      if (existingConfig) {
        // Update existing configuration - skip updatedAt as it has default
        await db.update(treasuryConfig)
          .set({
            treasuryWalletAddress: treasuryAddress,
            totalAllocation: config.programBudget.toString(),
            annualRewardsBudget: config.programBudget.toString(),
            dailyRewardsCap: dailyRewardsCap.toString(),
            programStartDate: startDate,
            programEndDate: endDate,
            programDurationDays: config.programDurationDays,
            isActive: config.isActive
          })
          .where(eq(treasuryConfig.id, existingConfig.id));
        
        // CRITICAL: Sync program_settings table with treasury config duration
        await db.update(programSettings)
          .set({
            programDuration: config.programDurationDays,
            updatedAt: new Date()
          });
      } else {
        // Create new configuration
        await db.insert(treasuryConfig).values({
          treasuryWalletAddress: treasuryAddress,
          totalAllocation: config.programBudget.toString(),
          annualRewardsBudget: config.programBudget.toString(),
          dailyRewardsCap: dailyRewardsCap.toString(),
          programStartDate: startDate,
          programEndDate: endDate,
          programDurationDays: config.programDurationDays,
          isActive: config.isActive,
          createdBy: performedBy
        });
        
        // CRITICAL: Sync program_settings table with treasury config duration
        await db.update(programSettings)
          .set({
            programDuration: config.programDurationDays,
            updatedAt: new Date()
          });
      }

      // Log operation (temporarily disabled for debugging)
      // await this.logAdminOperation({
      //   operationType: 'treasury_configuration',
      //   operationDetails: JSON.stringify(config),
      //   treasuryAddress: treasuryAddress,
      //   amount: config.totalAllocation.toString(),
      //   reason: 'Treasury configuration updated',
      //   performedBy,
      //   success: true
      // });

      return {
        success: true,
        message: `Treasury configuration updated successfully. Program budget: ${config.programBudget.toLocaleString()} KILT, Daily cap: ${dailyRewardsCap.toFixed(2)} KILT`
      };
    } catch (error) {
      console.error('Treasury configuration update error:', error);
      return {
        success: false,
        message: 'Failed to update treasury configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get treasury balance from blockchain (read-only)
   */
  async getTreasuryBalance(): Promise<{ balance: number; address: string }> {
    try {
      const [config] = await db.select().from(treasuryConfig).limit(1);
      if (!config) {
        return { balance: 0, address: '0x0000000000000000000000000000000000000000' };
      }

      const kiltContract = new ethers.Contract(this.KILT_TOKEN_ADDRESS, this.KILT_TOKEN_ABI, this.provider);
      const balance = await kiltContract.balanceOf(config.treasuryWalletAddress);
      const balanceEther = parseFloat(ethers.formatEther(balance));

      return {
        balance: balanceEther,
        address: config.treasuryWalletAddress
      };
    } catch (error) {
      return { balance: 0, address: '0x0000000000000000000000000000000000000000' };
    }
  }

  /**
   * Update program settings using existing database schema
   */
  async updateProgramSettings(settings: AdminProgramSettings, performedBy: string): Promise<AdminOperationResult> {
    try {
      console.log('Admin service updateProgramSettings called with:', settings, performedBy);
      
      // Get treasury config to use as authoritative source for program duration
      const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
      const authoritativeProgramDuration = treasuryConf ? treasuryConf.programDurationDays : 365;
      
      console.log('Using authoritative program duration from treasury config:', authoritativeProgramDuration);
      
      // First, get existing settings or create default values
      const [existingSettings] = await db.select().from(programSettings).limit(1);
      
      console.log('Existing settings:', existingSettings);
      
      if (existingSettings) {
        // Update existing settings record using actual database columns
        const updateData = {
          programDuration: authoritativeProgramDuration, // Always use treasury config value
          // Map maxLiquidityBoost to liquidityWeight for existing column
          liquidityWeight: settings.maxLiquidityBoost?.toString() || existingSettings.liquidityWeight,
          minimumPositionValue: settings.minimumPositionValue?.toString() || existingSettings.minimumPositionValue,
          lockPeriod: settings.lockPeriod || existingSettings.lockPeriod,
          updatedAt: new Date()
        };
        
        console.log('Updating with data:', updateData);
        
        await db.update(programSettings)
          .set(updateData)
          .where(eq(programSettings.id, existingSettings.id));
      } else {
        // Create new settings record with defaults using actual database columns
        const insertData = {
          programDuration: authoritativeProgramDuration, // Always use treasury config value
          // Map maxLiquidityBoost to liquidityWeight for existing column
          liquidityWeight: settings.maxLiquidityBoost?.toString() || "0.6",
          minimumPositionValue: settings.minimumPositionValue?.toString() || "0",
          lockPeriod: settings.lockPeriod || 7
        };
        
        console.log('Inserting new settings:', insertData);
        
        await db.insert(programSettings).values(insertData);
      }

      // Log operation
      await this.logAdminOperation({
        operationType: 'program_settings_update',
        operationDetails: JSON.stringify(settings),
        reason: 'Program settings updated',
        performedBy,
        success: true
      });

      return {
        success: true,
        message: 'Program settings updated successfully'
      };
    } catch (error) {
      await this.logAdminOperation({
        operationType: 'program_settings_update',
        operationDetails: JSON.stringify(settings),
        reason: 'Failed to update program settings',
        performedBy,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Failed to update program settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current program settings using existing database schema
   */
  async getCurrentProgramSettings(): Promise<AdminProgramSettings> {
    try {
      const [settings] = await db.select().from(programSettings).limit(1);
      
      if (settings) {
        return {
          programDuration: settings.programDuration || 365,
          // Map liquidityWeight to maxLiquidityBoost for UI
          maxLiquidityBoost: parseFloat(settings.liquidityWeight) || 0.6,
          minimumPositionValue: parseFloat(settings.minimumPositionValue) || 0,
          lockPeriod: settings.lockPeriod || 7,
          inRangeRequirement: true // Always true for refined formula
        };
      }
      
      // Return default settings if no database record exists
      return {
        programDuration: 365,
        maxLiquidityBoost: 0.6,
        minimumPositionValue: 0,
        lockPeriod: 7,
        inRangeRequirement: true
      };
    } catch (error) {
      // Return default settings if database query fails
      return {
        programDuration: 365,
        maxLiquidityBoost: 0.6,
        minimumPositionValue: 0,
        lockPeriod: 7,
        inRangeRequirement: true
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
      const treasuryBalance = await this.getTreasuryBalance();
      const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
      const programSettings = await this.getCurrentProgramSettings();
      
      // Admin controls the treasury configuration - this is the authoritative source
      const programBudget = treasuryConf ? parseFloat(treasuryConf.totalAllocation) : 2905600;
      const dailyRewardsCap = treasuryConf ? parseFloat(treasuryConf.dailyRewardsCap) : 7960;
      
      // Treasury configuration retrieved successfully
      
      // Calculate total distributed directly (simplified for debugging)
      const totalDistributed = 0; // Simplified to avoid dynamic import issues
      
      return {
        treasury: {
          balance: treasuryBalance.balance,
          address: treasuryBalance.address,
          programBudget,
          dailyRewardsCap,
          programDuration: treasuryConf ? treasuryConf.programDurationDays : 365,
          programEndDate: treasuryConf ? treasuryConf.programEndDate : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: treasuryConf ? treasuryConf.isActive : true,
          totalDistributed: Math.round(totalDistributed * 100) / 100,
          treasuryRemaining: programBudget - totalDistributed
        },
        settings: programSettings,
        operationHistory: await this.getOperationHistory(10)
      };
    } catch (error) {
      console.error('Admin service error in getAdminTreasuryStats:', error);
      return {
        treasury: { 
          balance: 0,
          programBudget: 2905600, 
          address: '0x0000000000000000000000000000000000000000',
          dailyRewardsCap: 7960,
          programDuration: 365,
          programEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          totalDistributed: 0,
          treasuryRemaining: 2905600
        },
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
        operationType: operation.operationType,
        operationDetails: operation.operationDetails,
        treasuryAddress: operation.treasuryAddress,
        amount: operation.amount,
        reason: operation.reason,
        performedBy: operation.performedBy,
        transactionHash: operation.transactionHash,
        success: operation.success,
        errorMessage: operation.errorMessage
      });
    } catch (error) {
      // Log error but don't fail the operation
      return;
    }
  }
}

export const adminService = new AdminService();