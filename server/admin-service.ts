import { ethers } from 'ethers';
import { db } from './db';
import { treasuryService } from './treasury-service';
import { adminOperations, programSettings, treasuryConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AdminTreasuryConfiguration {
  treasuryWalletAddress: string;
  totalAllocation: number;
  annualRewardsBudget?: number;
  dailyRewardsCap: number;
  programStartDate: Date;
  programEndDate: Date;
  programDurationDays: number;
  isActive: boolean;
}

export interface AdminProgramSettings {
  programDuration?: number; // in days
  minTimeCoefficient?: number; // for MIN_TIME_COEFFICIENT in formula
  maxTimeCoefficient?: number; // for MAX_TIME_COEFFICIENT in formula
  liquidityWeight?: number; // w1 in formula
  timeWeight?: number; // w2 in formula
  minimumPositionValue?: number; // minimum USD value
  lockPeriod?: number; // in days
  dailyRewardsCap?: number; // daily KILT cap for rewards
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
      console.log('Received config:', JSON.stringify(config, null, 2));
      
      // Calculate daily rewards cap from annual budget (if provided) or from total allocation
      const dailyRewardsCap = config.dailyRewardsCap || (config.totalAllocation / config.programDurationDays);
      
      // Use default treasury address if none provided
      const treasuryAddress = config.treasuryWalletAddress || '0x1234567890123456789012345678901234567890';
      
      // Ensure dates are properly converted
      const startDate = config.programStartDate instanceof Date ? config.programStartDate : new Date(config.programStartDate);
      const endDate = config.programEndDate instanceof Date ? config.programEndDate : new Date(config.programEndDate);
      
      console.log('Converted dates:', { startDate, endDate });
      
      const [existingConfig] = await db.select().from(treasuryConfig).limit(1);
      
      if (existingConfig) {
        // Update existing configuration - skip updatedAt as it has default
        await db.update(treasuryConfig)
          .set({
            treasuryWalletAddress: treasuryAddress,
            totalAllocation: config.totalAllocation.toString(),
            annualRewardsBudget: (config.annualRewardsBudget || config.totalAllocation).toString(),
            dailyRewardsCap: dailyRewardsCap.toString(),
            programStartDate: startDate,
            programEndDate: endDate,
            programDurationDays: config.programDurationDays,
            isActive: config.isActive
          })
          .where(eq(treasuryConfig.id, existingConfig.id));
      } else {
        // Create new configuration
        await db.insert(treasuryConfig).values({
          treasuryWalletAddress: treasuryAddress,
          totalAllocation: config.totalAllocation.toString(),
          annualRewardsBudget: (config.annualRewardsBudget || config.totalAllocation).toString(),
          dailyRewardsCap: dailyRewardsCap.toString(),
          programStartDate: startDate,
          programEndDate: endDate,
          programDurationDays: config.programDurationDays,
          isActive: config.isActive,
          createdBy: performedBy
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
        message: `Treasury configuration updated successfully. Daily rewards cap: ${dailyRewardsCap.toFixed(2)} KILT`
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
   * Update program settings with dynamic daily rewards cap
   */
  async updateProgramSettings(settings: AdminProgramSettings, performedBy: string): Promise<AdminOperationResult> {
    try {
      // If daily rewards cap is provided, update treasury configuration
      if (settings.dailyRewardsCap) {
        const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
        if (treasuryConf) {
          await db.update(treasuryConfig)
            .set({
              dailyRewardsCap: settings.dailyRewardsCap.toString(),
              updatedAt: new Date()
            })
            .where(eq(treasuryConfig.id, treasuryConf.id));
        }
      }

      // Update program settings in key-value format
      const settingsToUpdate = [
        { key: 'programDuration', value: settings.programDuration?.toString() },
        { key: 'minTimeCoefficient', value: settings.minTimeCoefficient?.toString() },
        { key: 'maxTimeCoefficient', value: settings.maxTimeCoefficient?.toString() },
        { key: 'liquidityWeight', value: settings.liquidityWeight?.toString() },
        { key: 'timeWeight', value: settings.timeWeight?.toString() },
        { key: 'minimumPositionValue', value: settings.minimumPositionValue?.toString() },
        { key: 'lockPeriod', value: settings.lockPeriod?.toString() },
      ].filter(setting => setting.value !== undefined);

      for (const setting of settingsToUpdate) {
        await db.insert(programSettings).values({
          settingKey: setting.key,
          settingValue: setting.value!,
          description: `${setting.key} setting`,
          lastUpdatedBy: performedBy
        }).onConflictDoUpdate({
          target: programSettings.settingKey,
          set: {
            settingValue: setting.value!,
            lastUpdatedBy: performedBy,
            updatedAt: new Date()
          }
        });
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
   * Get current program settings
   */
  async getCurrentProgramSettings(): Promise<AdminProgramSettings> {
    try {
      const settings = await db.select().from(programSettings);
      const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
      
      const settingsMap = new Map(settings.map(s => [s.settingKey, s.settingValue]));
      
      return {
        programDuration: settingsMap.get('programDuration') ? parseInt(settingsMap.get('programDuration')!) : 365,
        minTimeCoefficient: settingsMap.get('minTimeCoefficient') ? parseFloat(settingsMap.get('minTimeCoefficient')!) : 0.6,
        maxTimeCoefficient: settingsMap.get('maxTimeCoefficient') ? parseFloat(settingsMap.get('maxTimeCoefficient')!) : 1.0,
        liquidityWeight: settingsMap.get('liquidityWeight') ? parseFloat(settingsMap.get('liquidityWeight')!) : 0.6,
        timeWeight: settingsMap.get('timeWeight') ? parseFloat(settingsMap.get('timeWeight')!) : 0.4,
        minimumPositionValue: settingsMap.get('minimumPositionValue') ? parseFloat(settingsMap.get('minimumPositionValue')!) : 0,
        lockPeriod: settingsMap.get('lockPeriod') ? parseInt(settingsMap.get('lockPeriod')!) : 7,
        dailyRewardsCap: treasuryConf ? parseFloat(treasuryConf.dailyRewardsCap) : undefined
      };
    } catch (error) {
      // Return default settings if database query fails
      return {
        programDuration: 365,
        minTimeCoefficient: 0.6,
        maxTimeCoefficient: 1.0,
        liquidityWeight: 0.6,
        timeWeight: 0.4,
        minimumPositionValue: 0,
        lockPeriod: 7
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
      const totalAllocation = treasuryConf ? parseFloat(treasuryConf.totalAllocation) : 2905600;
      const annualRewardsBudget = treasuryConf ? parseFloat(treasuryConf.annualRewardsBudget || treasuryConf.totalAllocation) : 1000000;
      const dailyRewardsCap = treasuryConf ? parseFloat(treasuryConf.dailyRewardsCap) : 7960;
      
      // DEBUG: Log the treasury configuration values
      console.log('Treasury Config Retrieved:', {
        exists: !!treasuryConf,
        totalAllocation: treasuryConf?.totalAllocation,
        annualRewardsBudget: treasuryConf?.annualRewardsBudget,
        dailyRewardsCap: treasuryConf?.dailyRewardsCap,
        programDuration: treasuryConf?.programDurationDays,
        parsed: { totalAllocation, annualRewardsBudget, dailyRewardsCap }
      });
      
      // Calculate total distributed directly (simplified for debugging)
      const totalDistributed = 0; // Simplified to avoid dynamic import issues
      
      return {
        treasury: {
          balance: treasuryBalance.balance,
          address: treasuryBalance.address,
          totalAllocation,
          annualRewardsBudget,
          dailyRewardsCap,
          programDuration: treasuryConf ? treasuryConf.programDurationDays : 365,
          isActive: treasuryConf ? treasuryConf.isActive : true,
          totalDistributed: Math.round(totalDistributed * 100) / 100,
          treasuryRemaining: totalAllocation - totalDistributed
        },
        settings: programSettings,
        operationHistory: await this.getOperationHistory(10)
      };
    } catch (error) {
      console.error('Admin service error in getAdminTreasuryStats:', error);
      return {
        treasury: { 
          balance: 0, 
          address: '0x0000000000000000000000000000000000000000',
          totalAllocation: 2905600,
          dailyRewardsCap: 7960,
          programDuration: 365,
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