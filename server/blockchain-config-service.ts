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
  rewardWalletAddress?: string;
  uniswapV3Factory?: string;
  uniswapV3Router?: string;
  positionManager?: string;
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
        rewardWalletAddress: treasuryConf.treasuryWalletAddress, // Use treasury wallet for rewards by default
        uniswapV3Factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        uniswapV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        positionManager: '0x03a520b32C04BF3bEEf7BF5d0a7B8c68b7e6e5c7',
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
        rewardWalletAddress: '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e',
        uniswapV3Factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        uniswapV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
        positionManager: '0x03a520b32C04BF3bEEf7BF5d0a7B8c68b7e6e5c7',
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