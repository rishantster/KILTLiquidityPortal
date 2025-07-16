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

export interface AdminOperationHistoryItem {
  id: number;
  operationType: string;
  operationDetails: string;
  amount?: number;
  reason: string;
  performedBy: string;
  transactionHash?: string;
  success: boolean;
  timestamp: Date;
}

export interface AdminTreasuryStats {
  totalLiquidity: number;
  activeParticipants: number;
  treasuryBalance: number;
  programDuration: number;
  dailyRewardsCap: number;
  estimatedAPR: { low: number; average: number; high: number };
}

export interface AdminOperationLog {
  operationType: string;
  operationDetails: string;
  amount?: number;
  reason: string;
  performedBy: string;
  transactionHash?: string;
  success: boolean;
}

export interface TopPerformingPosition {
  positionId: number;
  annualizedReturn: number;
  nftTokenId: string;
  totalValueUSD: number;
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
      // Treasury configuration update error
      return {
        success: false,
        message: 'Failed to update treasury configuration',
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
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
      const balance = await kiltContract.balanceOf(config.treasury_wallet_address);
      const balanceEther = parseFloat(ethers.formatEther(balance));

      return {
        balance: balanceEther,
        address: config.treasury_wallet_address
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
      // Admin service updateProgramSettings called
      
      // Get treasury config to use as authoritative source for program duration
      const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
      const authoritativeProgramDuration = treasuryConf ? treasuryConf.programDurationDays : 365;
      
      // Using authoritative program duration from treasury config
      
      // First, get existing settings or create default values
      const [existingSettings] = await db.select().from(programSettings).limit(1);
      
      // Existing settings retrieved
      
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
        
        // Updating with data
        
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
        
        // Inserting new settings
        
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
        errorMessage: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
      });

      return {
        success: false,
        message: 'Failed to update program settings',
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
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
  async getOperationHistory(limit: number = 50): Promise<AdminOperationHistoryItem[]> {
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
   * Get treasury statistics for admin using unified APR service and real-time KILT price
   */
  async getAdminTreasuryStats(): Promise<AdminTreasuryStats> {
    try {
      const treasuryBalance = await this.getTreasuryBalance();
      const [treasuryConf] = await db.select().from(treasuryConfig).limit(1);
      const programSettings = await this.getCurrentProgramSettings();
      
      // Use actual database values with correct column names (snake_case from database)
      const programBudget = treasuryConf ? parseFloat(treasuryConf.total_allocation) : 750000;
      const dailyRewardsCap = treasuryConf ? parseFloat(treasuryConf.daily_rewards_cap) : 6250;
      const programDuration = treasuryConf ? treasuryConf.program_duration_days : 120;
      
      // Use real-time KILT price from kiltPriceService
      const { kiltPriceService } = await import('./kilt-price-service.js');
      const kiltPrice = kiltPriceService.getCurrentPrice();
      
      // Get unified APR calculation
      const { unifiedAPRService } = await import('./unified-apr-service.js');
      const aprData = await unifiedAPRService.getUnifiedAPRCalculation();
      
      // Calculate total distributed directly (simplified for debugging)
      const totalDistributed = 0; // Simplified to avoid dynamic import issues
      
      return {
        treasury: {
          balance: treasuryBalance.balance,
          address: treasuryBalance.address,
          programBudget,
          dailyRewardsCap,
          programDuration,
          programEndDate: treasuryConf && treasuryConf.program_end_date ? new Date(treasuryConf.program_end_date) : new Date(Date.now() + programDuration * 24 * 60 * 60 * 1000),
          programStartDate: treasuryConf && treasuryConf.program_start_date ? new Date(treasuryConf.program_start_date) : new Date(),
          isActive: treasuryConf ? treasuryConf.is_active : true,
          totalDistributed: Math.round(totalDistributed * 100) / 100,
          treasuryRemaining: programBudget - totalDistributed,
          kiltPrice: kiltPrice,
          aprData: aprData
        },
        settings: programSettings,
        operationHistory: await this.getOperationHistory(10)
      };
    } catch (error) {
      // Admin service error in getAdminTreasuryStats
      
      // Get real-time KILT price even in error case
      let kiltPrice = 0.016;
      try {
        const { kiltPriceService } = await import('./kilt-price-service.js');
        kiltPrice = kiltPriceService.getCurrentPrice();
      } catch (priceError) {
        // Error getting KILT price
      }
      
      return {
        treasury: { 
          balance: 0,
          programBudget: 750000, 
          address: '0x0000000000000000000000000000000000000000',
          dailyRewardsCap: 6250,
          programDuration: 120,
          programEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
          programStartDate: new Date(),
          isActive: true,
          totalDistributed: 0,
          treasuryRemaining: 750000,
          kiltPrice: kiltPrice,
          aprData: { minAPR: 31, maxAPR: 47, aprRange: '31% - 47%' }
        },
        settings: await this.getCurrentProgramSettings(),
        operationHistory: []
      };
    }
  }

  /**
   * Log admin operations for audit trail
   */
  private async logAdminOperation(operation: AdminOperationLog): Promise<void> {
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