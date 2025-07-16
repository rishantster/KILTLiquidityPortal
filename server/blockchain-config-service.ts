import { db } from './db';
import { tokenPoolConfig, treasuryConfig, TokenPoolConfig, TreasuryConfig } from '../shared/schema';

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
        .where(tokenPoolConfig.isActive.eq(true))
        .limit(1);

      // Get treasury configuration
      const [treasuryConf] = await db.select().from(treasuryConfig)
        .where(treasuryConfig.isActive.eq(true))
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
      
      // Return fallback configuration to prevent system breakage
      return {
        kiltTokenAddress: '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8',
        wethTokenAddress: '0x4200000000000000000000000000000000000006',
        poolAddress: '0xB578b4c5539FD22D7a0E6682Ab645c623Bae9dEb',
        poolFeeRate: 3000,
        networkId: 8453,
        treasuryWalletAddress: '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e',
        isActive: true,
      };
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
      console.error('Error updating token/pool configuration:', error);
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
   * Clear configuration cache (useful for testing)
   */
  clearCache(): void {
    this.configCache = null;
    this.cacheExpiry = 0;
  }
}

export const blockchainConfigService = BlockchainConfigService.getInstance();