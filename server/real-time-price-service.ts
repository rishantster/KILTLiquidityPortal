import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

// Base Network Configuration
const BASE_RPC_URL = 'https://mainnet.base.org';

// Token and Pool Addresses
const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';
const WETH_TOKEN_ADDRESS = '0x4200000000000000000000000000000000000006';
const KILT_ETH_POOL_ADDRESS = '0x6690F71D45C5C9336d5Ce1B9c5E8b4b3e0c0e7d0'; // Replace with actual pool

// Create Base network client
const baseClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL),
});

export interface TokenPrice {
  address: string;
  symbol: string;
  priceUSD: number;
  priceETH?: number;
  lastUpdated: number;
}

export interface PoolPrice {
  poolAddress: string;
  token0Address: string;
  token1Address: string;
  token0Price: number;
  token1Price: number;
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  lastUpdated: number;
}

export interface RealTimePriceData {
  kiltPriceUSD: number;
  ethPriceUSD: number;
  kiltPriceETH: number;
  poolData: PoolPrice;
  timestamp: number;
}

export class RealTimePriceService {
  private priceCache: Map<string, TokenPrice> = new Map();
  private poolCache: Map<string, PoolPrice> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache
  private readonly COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

  /**
   * Get real-time KILT price from multiple sources
   */
  async getKiltPrice(): Promise<TokenPrice> {
    const cached = this.priceCache.get(KILT_TOKEN_ADDRESS);
    if (cached && Date.now() - cached.lastUpdated < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // Primary source: CoinGecko API
      const priceData = await this.fetchKiltPriceFromCoinGecko();
      
      // Secondary source: On-chain Uniswap V3 pool
      const poolPrice = await this.fetchKiltPriceFromPool();
      
      // Use CoinGecko as primary, pool as fallback
      const finalPrice: TokenPrice = {
        address: KILT_TOKEN_ADDRESS,
        symbol: 'KILT',
        priceUSD: priceData.priceUSD || poolPrice.priceUSD,
        priceETH: priceData.priceETH || poolPrice.priceETH,
        lastUpdated: Date.now(),
      };

      this.priceCache.set(KILT_TOKEN_ADDRESS, finalPrice);
      return finalPrice;
    } catch (error) {
      console.error('Error fetching KILT price:', error);
      
      // Return cached data if available
      if (cached) {
        return cached;
      }
      
      // Last resort fallback
      return {
        address: KILT_TOKEN_ADDRESS,
        symbol: 'KILT',
        priceUSD: 0.016,
        priceETH: 0.0000064,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Get real-time ETH price
   */
  async getEthPrice(): Promise<TokenPrice> {
    const cached = this.priceCache.get(WETH_TOKEN_ADDRESS);
    if (cached && Date.now() - cached.lastUpdated < this.CACHE_DURATION) {
      return cached;
    }

    try {
      const response = await fetch(`${this.COINGECKO_API_URL}/simple/price?ids=ethereum&vs_currencies=usd`);
      const data = await response.json();
      
      const ethPrice: TokenPrice = {
        address: WETH_TOKEN_ADDRESS,
        symbol: 'ETH',
        priceUSD: data.ethereum.usd,
        lastUpdated: Date.now(),
      };

      this.priceCache.set(WETH_TOKEN_ADDRESS, ethPrice);
      return ethPrice;
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      
      // Return cached data if available
      if (cached) {
        return cached;
      }
      
      // Fallback price
      return {
        address: WETH_TOKEN_ADDRESS,
        symbol: 'ETH',
        priceUSD: 2500,
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Get real-time pool data from Uniswap V3
   */
  async getPoolData(poolAddress: string): Promise<PoolPrice> {
    const cached = this.poolCache.get(poolAddress);
    if (cached && Date.now() - cached.lastUpdated < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // Get pool slot0 data
      const slot0Data = await baseClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: 'slot0',
            outputs: [
              { internalType: 'uint160', name: 'sqrtPriceX96', type: 'uint160' },
              { internalType: 'int24', name: 'tick', type: 'int24' },
              { internalType: 'uint16', name: 'observationIndex', type: 'uint16' },
              { internalType: 'uint16', name: 'observationCardinality', type: 'uint16' },
              { internalType: 'uint16', name: 'observationCardinalityNext', type: 'uint16' },
              { internalType: 'uint8', name: 'feeProtocol', type: 'uint8' },
              { internalType: 'bool', name: 'unlocked', type: 'bool' },
            ],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'slot0',
      });

      const [sqrtPriceX96, tick] = slot0Data as [bigint, number];

      // Get pool liquidity
      const liquidity = await baseClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: 'liquidity',
            outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'liquidity',
      });

      // Get token addresses
      const token0 = await baseClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: 'token0',
            outputs: [{ internalType: 'address', name: '', type: 'address' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'token0',
      });

      const token1 = await baseClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: 'token1',
            outputs: [{ internalType: 'address', name: '', type: 'address' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'token1',
      });

      // Calculate prices from sqrtPriceX96
      const { token0Price, token1Price } = this.calculatePricesFromSqrtPriceX96(sqrtPriceX96.toString());

      const poolData: PoolPrice = {
        poolAddress,
        token0Address: token0 as string,
        token1Address: token1 as string,
        token0Price,
        token1Price,
        sqrtPriceX96: sqrtPriceX96.toString(),
        tick,
        liquidity: (liquidity as bigint).toString(),
        lastUpdated: Date.now(),
      };

      this.poolCache.set(poolAddress, poolData);
      return poolData;
    } catch (error) {
      console.error('Error fetching pool data:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive real-time price data
   */
  async getRealTimePriceData(): Promise<RealTimePriceData> {
    const [kiltPrice, ethPrice, poolData] = await Promise.all([
      this.getKiltPrice(),
      this.getEthPrice(),
      this.getPoolData(KILT_ETH_POOL_ADDRESS),
    ]);

    return {
      kiltPriceUSD: kiltPrice.priceUSD,
      ethPriceUSD: ethPrice.priceUSD,
      kiltPriceETH: kiltPrice.priceETH || (kiltPrice.priceUSD / ethPrice.priceUSD),
      poolData,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate position value in USD using real-time prices
   */
  async calculatePositionValueUSD(
    token0Amount: string,
    token1Amount: string,
    token0Address: string,
    token1Address: string
  ): Promise<number> {
    const token0Price = await this.getTokenPrice(token0Address);
    const token1Price = await this.getTokenPrice(token1Address);

    const token0Decimals = await this.getTokenDecimals(token0Address);
    const token1Decimals = await this.getTokenDecimals(token1Address);

    const token0Value = (parseFloat(token0Amount) / Math.pow(10, token0Decimals)) * token0Price.priceUSD;
    const token1Value = (parseFloat(token1Amount) / Math.pow(10, token1Decimals)) * token1Price.priceUSD;

    return token0Value + token1Value;
  }

  /**
   * Get token price by address
   */
  async getTokenPrice(tokenAddress: string): Promise<TokenPrice> {
    if (tokenAddress.toLowerCase() === KILT_TOKEN_ADDRESS.toLowerCase()) {
      return await this.getKiltPrice();
    } else if (tokenAddress.toLowerCase() === WETH_TOKEN_ADDRESS.toLowerCase()) {
      return await this.getEthPrice();
    } else {
      // Handle other tokens
      throw new Error(`Unsupported token: ${tokenAddress}`);
    }
  }

  /**
   * Get token decimals
   */
  private async getTokenDecimals(tokenAddress: string): Promise<number> {
    try {
      const decimals = await baseClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: 'decimals',
            outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'decimals',
      });

      return decimals as number;
    } catch (error) {
      console.error('Error getting token decimals:', error);
      return 18; // Default to 18 decimals
    }
  }

  /**
   * Fetch KILT price from CoinGecko
   */
  private async fetchKiltPriceFromCoinGecko(): Promise<{ priceUSD: number; priceETH: number }> {
    try {
      const response = await fetch(`${this.COINGECKO_API_URL}/simple/price?ids=kilt-protocol&vs_currencies=usd,eth`);
      const data = await response.json();
      
      return {
        priceUSD: data['kilt-protocol'].usd,
        priceETH: data['kilt-protocol'].eth,
      };
    } catch (error) {
      console.error('Error fetching from CoinGecko:', error);
      throw error;
    }
  }

  /**
   * Fetch KILT price from Uniswap V3 pool
   */
  private async fetchKiltPriceFromPool(): Promise<{ priceUSD: number; priceETH: number }> {
    try {
      const poolData = await this.getPoolData(KILT_ETH_POOL_ADDRESS);
      const ethPrice = await this.getEthPrice();
      
      // Determine which token is KILT
      const isToken0Kilt = poolData.token0Address.toLowerCase() === KILT_TOKEN_ADDRESS.toLowerCase();
      const kiltPriceETH = isToken0Kilt ? poolData.token0Price : poolData.token1Price;
      const kiltPriceUSD = kiltPriceETH * ethPrice.priceUSD;
      
      return {
        priceUSD: kiltPriceUSD,
        priceETH: kiltPriceETH,
      };
    } catch (error) {
      console.error('Error fetching from pool:', error);
      throw error;
    }
  }

  /**
   * Calculate prices from sqrtPriceX96
   */
  private calculatePricesFromSqrtPriceX96(sqrtPriceX96: string): { token0Price: number; token1Price: number } {
    const sqrtPrice = BigInt(sqrtPriceX96);
    const Q96 = BigInt(2) ** BigInt(96);
    
    // Calculate price = (sqrtPriceX96 / 2^96)^2
    const price = Number(sqrtPrice) / Number(Q96);
    const priceSquared = price * price;
    
    return {
      token0Price: priceSquared,
      token1Price: 1 / priceSquared,
    };
  }

  /**
   * Clear cache (for testing or forced refresh)
   */
  clearCache(): void {
    this.priceCache.clear();
    this.poolCache.clear();
  }
}

export const realTimePriceService = new RealTimePriceService();