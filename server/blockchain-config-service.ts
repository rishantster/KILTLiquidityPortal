import { db } from './db';
import { tokenPoolConfig, treasuryConfig, TokenPoolConfig, TreasuryConfig } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface BlockchainConfiguration {
  kiltTokenAddress: string;
  wethTokenAddress: string;
  poolAddress: string;
  poolFeeRate: number;
  networkId: number;
  treasuryWalletAddress: string;
  isActive: boolean;
}

export class BlockchainConfigService {
  private static instance: BlockchainConfigService;
  private configCache: BlockchainConfiguration | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): BlockchainConfigService {
    if (!BlockchainConfigService.instance) {
      BlockchainConfigService.instance = new BlockchainConfigService();
    }
    return BlockchainConfigService.instance;
  }

  /**
   * Get current blockchain configuration from admin panel
   */
  async getConfiguration(): Promise<BlockchainConfiguration> {
    // Check cache first
    if (this.configCache && Date.now() < this.cacheExpiry) {
      return this.configCache;
    }

    try {
      // Get token/pool configuration
      const [tokenPoolConf] = await db.select().from(tokenPoolConfig)
        .where(eq(tokenPoolConfig.isActive, true))
        .limit(1);

      // Get treasury configuration
      const [treasuryConf] = await db.select().from(treasuryConfig)
        .where(eq(treasuryConfig.isActive, true))
        .limit(1);

      if (!tokenPoolConf || !treasuryConf) {
        throw new Error('Blockchain configuration not found in admin panel');
      }

      const config: BlockchainConfiguration = {
        kiltTokenAddress: tokenPoolConf.kiltTokenAddress,
        wethTokenAddress: tokenPoolConf.wethTokenAddress,
        poolAddress: tokenPoolConf.poolAddress,
        poolFeeRate: tokenPoolConf.poolFeeRate,
        networkId: tokenPoolConf.networkId,
        treasuryWalletAddress: treasuryConf.treasuryWalletAddress,
        isActive: tokenPoolConf.isActive && treasuryConf.isActive,
      };

      // Cache the configuration
      this.configCache = config;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return config;
    } catch (error) {
      console.error('Error fetching blockchain configuration:', error);
      
      // NO FALLBACK VALUES - Real blockchain integration only
      throw new Error('Failed to fetch blockchain configuration from admin panel');
    }
  }

  /**
   * Update token/pool configuration (admin only)
   */
  async updateTokenPoolConfig(config: {
    kiltTokenAddress: string;
    wethTokenAddress: string;
    poolAddress: string;
    poolFeeRate: number;
    networkId: number;
    updatedBy: string;
  }): Promise<void> {
    try {
      await db.update(tokenPoolConfig).set({
        kiltTokenAddress: config.kiltTokenAddress,
        wethTokenAddress: config.wethTokenAddress,
        poolAddress: config.poolAddress,
        poolFeeRate: config.poolFeeRate,
        networkId: config.networkId,
        updatedAt: new Date(),
      });

      // Clear cache to force reload
      this.configCache = null;
      this.cacheExpiry = 0;
    } catch (error) {
      // Error updating token/pool configuration
      throw error;
    }
  }

  /**
   * Get configuration for specific service needs
   */
  async getTokenAddresses(): Promise<{ kilt: string; weth: string }> {
    const config = await this.getConfiguration();
    return {
      kilt: config.kiltTokenAddress,
      weth: config.wethTokenAddress,
    };
  }

  async getPoolAddress(): Promise<string> {
    const config = await this.getConfiguration();
    return config.poolAddress;
  }

  async getTreasuryWalletAddress(): Promise<string> {
    const config = await this.getConfiguration();
    return config.treasuryWalletAddress;
  }

  async getNetworkId(): Promise<number> {
    const config = await this.getConfiguration();
    return config.networkId;
  }

  /**
   * Update treasury wallet address (admin only)
   */
  async updateTreasuryWalletAddress(treasuryWalletAddress: string, updatedBy: string): Promise<void> {
    try {
      await db.update(treasuryConfig).set({
        treasuryWalletAddress: treasuryWalletAddress,
        updatedAt: new Date(),
      });

      // Clear cache to force reload
      this.configCache = null;
      this.cacheExpiry = 0;
    } catch (error) {
      // Error updating treasury wallet address
      throw error;
    }
  }

  /**
   * Clear configuration cache (useful for testing)
   */
  clearCache(): void {
    this.configCache = null;
    this.cacheExpiry = 0;
  }
}

export const blockchainConfigService = BlockchainConfigService.getInstance();