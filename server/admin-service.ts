import { ethers } from 'ethers';
import { db } from './db';
import { treasuryService } from './treasury-service';
import { adminOperations, programSettings, treasuryConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { blockchainConfigService } from './blockchain-config-service';

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
  
  // Core formula parameters
  maxLiquidityBoost?: number; // w1 - max liquidity boost (0.6 = 60% boost)
  baseLiquidityWeight?: number; // Base liquidity coefficient
  timeBoostCoefficient?: number; // Time boost multiplier
  inRangeMultiplier?: number; // IRM coefficient
  poolFactor?: number; // Pool performance factor
  concentrationBonus?: number; // Concentration range bonus
  
  // Position requirements
  minimumPositionValue?: number; // minimum USD value (set to 0 for no minimum)
  lockPeriod?: number; // claim lock period in days (7 days)
  inRangeRequirement?: boolean; // whether IRM (In-Range Multiplier) is required
  fullRangeBonus?: number; // FRB parameter
  
  // Performance thresholds
  minimumTimeInRange?: number; // 80% minimum time in range
  performanceThreshold?: number; // 50% performance threshold
}

export interface AdminOperationResult {
  success: boolean;
  transactionHash?: string;
  message: string;
  error?: string;
}

export class AdminService {
  private provider: ethers.JsonRpcProvider;
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

      const { kilt } = await blockchainConfigService.getTokenAddresses();
      const kiltContract = new ethers.Contract(kilt, this.KILT_TOKEN_ABI, this.provider);
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
        // Update existing settings record with all new parameters
        const updateData = {
          programDuration: authoritativeProgramDuration, // Always use treasury config value
          
          // Core formula parameters
          liquidityWeight: settings.maxLiquidityBoost?.toString() || existingSettings.liquidityWeight,
          baseLiquidityWeight: settings.baseLiquidityWeight?.toString() || existingSettings.baseLiquidityWeight || "1.000",
          timeBoostCoefficient: settings.timeBoostCoefficient?.toString() || existingSettings.timeBoostCoefficient || "1.000",
          inRangeMultiplier: settings.inRangeMultiplier?.toString() || existingSettings.inRangeMultiplier || "1.000",
          poolFactor: settings.poolFactor?.toString() || existingSettings.poolFactor || "1.000",
          concentrationBonus: settings.concentrationBonus?.toString() || existingSettings.concentrationBonus || "1.000",
          
          // Position requirements
          minimumPositionValue: settings.minimumPositionValue?.toString() || existingSettings.minimumPositionValue,
          lockPeriod: settings.lockPeriod || existingSettings.lockPeriod,
          inRangeRequirement: settings.inRangeRequirement ?? existingSettings.inRangeRequirement,
          fullRangeBonus: settings.fullRangeBonus?.toString() || existingSettings.fullRangeBonus,
          
          // Performance thresholds
          minimumTimeInRange: settings.minimumTimeInRange?.toString() || existingSettings.minimumTimeInRange || "0.800",
          performanceThreshold: settings.performanceThreshold?.toString() || existingSettings.performanceThreshold || "0.500",
          
          updatedAt: new Date()
        };
        
        console.log('Updating with data:', updateData);
        
        await db.update(programSettings)
          .set(updateData)
          .where(eq(programSettings.id, existingSettings.id));
      } else {
        // Create new settings record with defaults for all parameters
        const insertData = {
          programDuration: authoritativeProgramDuration, // Always use treasury config value
          
          // Core formula parameters
          liquidityWeight: settings.maxLiquidityBoost?.toString() || "0.600",
          baseLiquidityWeight: settings.baseLiquidityWeight?.toString() || "1.000",
          timeBoostCoefficient: settings.timeBoostCoefficient?.toString() || "1.000",
          inRangeMultiplier: settings.inRangeMultiplier?.toString() || "1.000",
          poolFactor: settings.poolFactor?.toString() || "1.000",
          concentrationBonus: settings.concentrationBonus?.toString() || "1.000",
          
          // Position requirements
          minimumPositionValue: settings.minimumPositionValue?.toString() || "10.00000000",
          lockPeriod: settings.lockPeriod || 7,
          inRangeRequirement: settings.inRangeRequirement ?? true,
          fullRangeBonus: settings.fullRangeBonus?.toString() || "1.200",
          
          // Performance thresholds
          minimumTimeInRange: settings.minimumTimeInRange?.toString() || "0.800",
          performanceThreshold: settings.performanceThreshold?.toString() || "0.500"
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
          // Core formula parameters
          maxLiquidityBoost: parseFloat(settings.liquidityWeight) || 0.6,
          baseLiquidityWeight: parseFloat(settings.baseLiquidityWeight) || 1.0,
          timeBoostCoefficient: parseFloat(settings.timeBoostCoefficient) || 1.0,
          inRangeMultiplier: parseFloat(settings.inRangeMultiplier) || 1.0,
          poolFactor: parseFloat(settings.poolFactor) || 1.0,
          concentrationBonus: parseFloat(settings.concentrationBonus) || 1.0,
          
          // Position requirements
          minimumPositionValue: parseFloat(settings.minimumPositionValue) || 10,
          lockPeriod: settings.lockPeriod || 7,
          inRangeRequirement: settings.inRangeRequirement ?? true,
          fullRangeBonus: parseFloat(settings.fullRangeBonus) || 1.2,
          
          // Performance thresholds
          minimumTimeInRange: parseFloat(settings.minimumTimeInRange) || 0.8,
          performanceThreshold: parseFloat(settings.performanceThreshold) || 0.5
        };
      }
      
      // Return default settings if no database record exists
      return {
        // Core formula parameters
        maxLiquidityBoost: 0.6,
        baseLiquidityWeight: 1.0,
        timeBoostCoefficient: 1.0,
        inRangeMultiplier: 1.0,
        poolFactor: 1.0,
        concentrationBonus: 1.0,
        
        // Position requirements
        minimumPositionValue: 10,
        lockPeriod: 7,
        inRangeRequirement: true,
        fullRangeBonus: 1.2,
        
        // Performance thresholds
        minimumTimeInRange: 0.8,
        performanceThreshold: 0.5
      };
    } catch (error) {
      // Return default settings if database query fails
      return {
        // Core formula parameters
        maxLiquidityBoost: 0.6,
        baseLiquidityWeight: 1.0,
        timeBoostCoefficient: 1.0,
        inRangeMultiplier: 1.0,
        poolFactor: 1.0,
        concentrationBonus: 1.0,
        
        // Position requirements
        minimumPositionValue: 10,
        lockPeriod: 7,
        inRangeRequirement: true,
        fullRangeBonus: 1.2,
        
        // Performance thresholds
        minimumTimeInRange: 0.8,
        performanceThreshold: 0.5
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
      const programBudget = treasuryConf ? parseFloat(treasuryConf.total_allocation) : 2905600;
      const dailyRewardsCap = treasuryConf ? parseFloat(treasuryConf.daily_rewards_cap) : 7960;
      
      // Treasury configuration retrieved successfully
      
      // Calculate total distributed directly (simplified for debugging)
      const totalDistributed = 0; // Simplified to avoid dynamic import issues
      
      return {
        treasury: {
          balance: treasuryBalance.balance,
          address: treasuryBalance.address,
          programBudget,
          dailyRewardsCap,
          programDuration: treasuryConf ? treasuryConf.program_duration_days : 365,
          programEndDate: treasuryConf && treasuryConf.program_end_date ? new Date(treasuryConf.program_end_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: treasuryConf ? treasuryConf.is_active : true,
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