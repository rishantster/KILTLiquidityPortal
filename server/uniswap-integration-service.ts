import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';

// Base Network Configuration
const BASE_CHAIN_ID = 8453;
const BASE_RPC_URL = 'https://mainnet.base.org';

// Uniswap V3 Contract Addresses on Base
const UNISWAP_V3_FACTORY = '0x33128a8fC17869897dcE68Ed026d694621f6FDeD';
const UNISWAP_V3_POOL_KILT_ETH = '0x123'; // Replace with actual pool address
const UNISWAP_V3_NONFUNGIBLE_POSITION_MANAGER = '0x03a520b32C04BF3bEEf7BF5d1C1e1C7AB9E7F7B';

// Token Addresses
const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';
const WETH_TOKEN_ADDRESS = '0x4200000000000000000000000000000000000006';

// Create Base network client
const baseClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL),
});

export interface UniswapV3Position {
  tokenId: string;
  poolAddress: string;
  token0: string;
  token1: string;
  token0Amount: string;
  token1Amount: string;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  feeTier: number;
  isActive: boolean;
  currentValueUSD: number;
  fees: {
    token0: string;
    token1: string;
  };
}

export interface PoolData {
  address: string;
  token0: string;
  token1: string;
  feeTier: number;
  tickCurrent: number;
  sqrtPriceX96: string;
  liquidity: string;
  token0Price: number;
  token1Price: number;
  tvlUSD: number;
  volume24hUSD: number;
  feesUSD24h: number;
}

export class UniswapIntegrationService {
  private client = baseClient;

  /**
   * Get all Uniswap V3 positions for a user address
   */
  async getUserPositions(userAddress: string): Promise<UniswapV3Position[]> {
    try {
      // Get user's NFT token IDs from Position Manager
      const tokenIds = await this.getUserTokenIds(userAddress);
      
      // Fetch position data for each token ID
      const positions: UniswapV3Position[] = [];
      for (const tokenId of tokenIds) {
        const position = await this.getPositionData(tokenId);
        if (position) {
          positions.push(position);
        }
      }
      
      return positions;
    } catch (error) {
      console.error('Error fetching user positions:', error);
      return [];
    }
  }

  /**
   * Get specific position data by NFT token ID
   */
  async getPositionData(tokenId: string): Promise<UniswapV3Position | null> {
    try {
      // Call the positions function on the Position Manager
      const positionData = await this.client.readContract({
        address: UNISWAP_V3_NONFUNGIBLE_POSITION_MANAGER as `0x${string}`,
        abi: [
          {
            inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
            name: 'positions',
            outputs: [
              { internalType: 'uint96', name: 'nonce', type: 'uint96' },
              { internalType: 'address', name: 'operator', type: 'address' },
              { internalType: 'address', name: 'token0', type: 'address' },
              { internalType: 'address', name: 'token1', type: 'address' },
              { internalType: 'uint24', name: 'fee', type: 'uint24' },
              { internalType: 'int24', name: 'tickLower', type: 'int24' },
              { internalType: 'int24', name: 'tickUpper', type: 'int24' },
              { internalType: 'uint128', name: 'liquidity', type: 'uint128' },
              { internalType: 'uint256', name: 'feeGrowthInside0LastX128', type: 'uint256' },
              { internalType: 'uint256', name: 'feeGrowthInside1LastX128', type: 'uint256' },
              { internalType: 'uint128', name: 'tokensOwed0', type: 'uint128' },
              { internalType: 'uint128', name: 'tokensOwed1', type: 'uint128' },
            ],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'positions',
        args: [BigInt(tokenId)],
      });

      // Extract position data
      const [nonce, operator, token0, token1, fee, tickLower, tickUpper, liquidity, feeGrowthInside0LastX128, feeGrowthInside1LastX128, tokensOwed0, tokensOwed1] = positionData as any[];

      // Only process KILT positions
      if (token0.toLowerCase() !== KILT_TOKEN_ADDRESS.toLowerCase() && 
          token1.toLowerCase() !== KILT_TOKEN_ADDRESS.toLowerCase()) {
        return null;
      }

      // Get pool address
      const poolAddress = await this.getPoolAddress(token0, token1, fee);
      
      // Get current pool state
      const poolData = await this.getPoolData(poolAddress);
      
      // Calculate token amounts
      const { token0Amount, token1Amount } = await this.calculateTokenAmounts(
        liquidity.toString(),
        tickLower,
        tickUpper,
        poolData.tickCurrent,
        poolData.sqrtPriceX96
      );

      // Calculate current value in USD
      const currentValueUSD = await this.calculatePositionValueUSD(
        token0Amount,
        token1Amount,
        token0,
        token1
      );

      return {
        tokenId,
        poolAddress,
        token0,
        token1,
        token0Amount,
        token1Amount,
        liquidity: liquidity.toString(),
        tickLower,
        tickUpper,
        feeTier: fee,
        isActive: liquidity > 0,
        currentValueUSD,
        fees: {
          token0: tokensOwed0.toString(),
          token1: tokensOwed1.toString(),
        },
      };
    } catch (error) {
      console.error(`Error fetching position data for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Get pool address for token pair and fee tier
   */
  private async getPoolAddress(token0: string, token1: string, fee: number): Promise<string> {
    try {
      const poolAddress = await this.client.readContract({
        address: UNISWAP_V3_FACTORY as `0x${string}`,
        abi: [
          {
            inputs: [
              { internalType: 'address', name: 'tokenA', type: 'address' },
              { internalType: 'address', name: 'tokenB', type: 'address' },
              { internalType: 'uint24', name: 'fee', type: 'uint24' },
            ],
            name: 'getPool',
            outputs: [{ internalType: 'address', name: 'pool', type: 'address' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'getPool',
        args: [token0 as `0x${string}`, token1 as `0x${string}`, fee],
      });

      return poolAddress as string;
    } catch (error) {
      console.error('Error getting pool address:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive pool data
   */
  async getPoolData(poolAddress: string): Promise<PoolData> {
    try {
      // Get pool slot0 data
      const slot0Data = await this.client.readContract({
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
      const liquidity = await this.client.readContract({
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

      // Get token addresses and fee
      const token0 = await this.client.readContract({
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

      const token1 = await this.client.readContract({
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

      const fee = await this.client.readContract({
        address: poolAddress as `0x${string}`,
        abi: [
          {
            inputs: [],
            name: 'fee',
            outputs: [{ internalType: 'uint24', name: '', type: 'uint24' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'fee',
      });

      // Calculate prices
      const { token0Price, token1Price } = this.calculatePricesFromSqrtPriceX96(
        sqrtPriceX96.toString()
      );

      // Get additional metrics (TVL, volume) from external sources if needed
      const tvlUSD = await this.calculatePoolTVL(poolAddress, token0 as string, token1 as string, liquidity as bigint);
      const volume24hUSD = 0; // Placeholder - would need historical data
      const feesUSD24h = 0; // Placeholder - would need historical data

      return {
        address: poolAddress,
        token0: token0 as string,
        token1: token1 as string,
        feeTier: fee as number,
        tickCurrent: tick,
        sqrtPriceX96: sqrtPriceX96.toString(),
        liquidity: (liquidity as bigint).toString(),
        token0Price,
        token1Price,
        tvlUSD,
        volume24hUSD,
        feesUSD24h,
      };
    } catch (error) {
      console.error('Error getting pool data:', error);
      throw error;
    }
  }

  /**
   * Calculate token amounts from liquidity and tick range
   */
  private async calculateTokenAmounts(
    liquidity: string,
    tickLower: number,
    tickUpper: number,
    tickCurrent: number,
    sqrtPriceX96: string
  ): Promise<{ token0Amount: string; token1Amount: string }> {
    // Complex calculation involving tick math
    // This is a simplified version - full implementation would use the exact Uniswap V3 math
    
    const liquidityBN = BigInt(liquidity);
    const sqrtPrice = BigInt(sqrtPriceX96);
    
    // Calculate sqrt prices at tick boundaries
    const sqrtPriceLower = this.getSqrtRatioAtTick(tickLower);
    const sqrtPriceUpper = this.getSqrtRatioAtTick(tickUpper);
    
    let token0Amount = '0';
    let token1Amount = '0';
    
    if (tickCurrent < tickLower) {
      // All in token0
      token0Amount = this.calculateToken0Amount(liquidityBN, sqrtPriceLower, sqrtPriceUpper).toString();
    } else if (tickCurrent >= tickUpper) {
      // All in token1
      token1Amount = this.calculateToken1Amount(liquidityBN, sqrtPriceLower, sqrtPriceUpper).toString();
    } else {
      // Mixed position
      token0Amount = this.calculateToken0Amount(liquidityBN, sqrtPrice, sqrtPriceUpper).toString();
      token1Amount = this.calculateToken1Amount(liquidityBN, sqrtPriceLower, sqrtPrice).toString();
    }
    
    return { token0Amount, token1Amount };
  }

  /**
   * Calculate position value in USD
   */
  private async calculatePositionValueUSD(
    token0Amount: string,
    token1Amount: string,
    token0Address: string,
    token1Address: string
  ): Promise<number> {
    // Get token prices from external price feeds
    const token0Price = await this.getTokenPriceUSD(token0Address);
    const token1Price = await this.getTokenPriceUSD(token1Address);
    
    const token0ValueUSD = parseFloat(formatUnits(BigInt(token0Amount), 18)) * token0Price;
    const token1ValueUSD = parseFloat(formatUnits(BigInt(token1Amount), 18)) * token1Price;
    
    return token0ValueUSD + token1ValueUSD;
  }

  /**
   * Get token price in USD
   */
  private async getTokenPriceUSD(tokenAddress: string): Promise<number> {
    // Implement price fetching logic
    // For KILT, use CoinGecko API or on-chain price feeds
    // For WETH, use standard ETH price
    
    if (tokenAddress.toLowerCase() === KILT_TOKEN_ADDRESS.toLowerCase()) {
      // Use existing KILT price service
      return 0.016; // Placeholder - should use actual price feed
    } else if (tokenAddress.toLowerCase() === WETH_TOKEN_ADDRESS.toLowerCase()) {
      // Use ETH price
      return 2500; // Placeholder - should use actual price feed
    }
    
    return 0;
  }

  /**
   * Get user's NFT token IDs
   */
  private async getUserTokenIds(userAddress: string): Promise<string[]> {
    try {
      // Get user's token balance
      const balance = await this.client.readContract({
        address: UNISWAP_V3_NONFUNGIBLE_POSITION_MANAGER as `0x${string}`,
        abi: [
          {
            inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      });

      const tokenIds: string[] = [];
      const balanceNum = Number(balance);

      // Get each token ID by index
      for (let i = 0; i < balanceNum; i++) {
        const tokenId = await this.client.readContract({
          address: UNISWAP_V3_NONFUNGIBLE_POSITION_MANAGER as `0x${string}`,
          abi: [
            {
              inputs: [
                { internalType: 'address', name: 'owner', type: 'address' },
                { internalType: 'uint256', name: 'index', type: 'uint256' },
              ],
              name: 'tokenOfOwnerByIndex',
              outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'tokenOfOwnerByIndex',
          args: [userAddress as `0x${string}`, BigInt(i)],
        });

        tokenIds.push((tokenId as bigint).toString());
      }

      return tokenIds;
    } catch (error) {
      console.error('Error getting user token IDs:', error);
      return [];
    }
  }

  // Helper functions for tick math
  private getSqrtRatioAtTick(tick: number): bigint {
    // Simplified tick math - full implementation would be more complex
    const Q96 = BigInt(2) ** BigInt(96);
    const ratio = Math.pow(1.0001, tick);
    return BigInt(Math.floor(Math.sqrt(ratio) * Number(Q96)));
  }

  private calculateToken0Amount(liquidity: bigint, sqrtPriceA: bigint, sqrtPriceB: bigint): bigint {
    if (sqrtPriceA > sqrtPriceB) {
      [sqrtPriceA, sqrtPriceB] = [sqrtPriceB, sqrtPriceA];
    }
    return (liquidity * (sqrtPriceB - sqrtPriceA)) / sqrtPriceB;
  }

  private calculateToken1Amount(liquidity: bigint, sqrtPriceA: bigint, sqrtPriceB: bigint): bigint {
    if (sqrtPriceA > sqrtPriceB) {
      [sqrtPriceA, sqrtPriceB] = [sqrtPriceB, sqrtPriceA];
    }
    return liquidity * (sqrtPriceB - sqrtPriceA) / (BigInt(2) ** BigInt(96));
  }

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

  private async calculatePoolTVL(
    poolAddress: string,
    token0: string,
    token1: string,
    liquidity: bigint
  ): Promise<number> {
    // Simplified TVL calculation
    // Full implementation would get all positions and calculate total value
    return 0; // Placeholder
  }
}

export const uniswapIntegrationService = new UniswapIntegrationService();