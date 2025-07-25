import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { PriceService } from './price-service';

/**
 * Direct Fee Service - Alternative approach using position data instead of simulation
 * More reliable when RPC endpoints are rate limited
 */
export class DirectFeeService {
  private static rpcEndpoints = [
    'https://base.drpc.org',
    'https://mainnet.base.org',
    'https://base.gateway.tenderly.co',
    'https://base-rpc.publicnode.com'
  ];

  private static getClient(rpcIndex: number = 0) {
    return createPublicClient({
      chain: base,
      transport: http(this.rpcEndpoints[rpcIndex])
    });
  }

  private static readonly POSITION_MANAGER = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1' as `0x${string}`;

  /**
   * Get position data and calculate fees using direct position queries
   * More lightweight than contract simulation for rate-limited RPC endpoints
   */
  static async getUnclaimedFees(tokenId: string): Promise<{ 
    token0: string; 
    token1: string; 
    usdValue?: number;
    ethPrice?: number;
    kiltPrice?: number;
  }> {
    console.log(`🚀 DirectFeeService.getUnclaimedFees called for token ${tokenId}`);
    
    // Try each RPC endpoint until one works
    for (let rpcIndex = 0; rpcIndex < this.rpcEndpoints.length; rpcIndex++) {
      try {
        console.log(`⚠️ DirectFee RPC attempt ${rpcIndex + 1} using ${this.rpcEndpoints[rpcIndex]}`);
        
        const client = this.getClient(rpcIndex);
        
        // Get position data to check if it exists and has liquidity
        const positionData = await client.readContract({
          address: this.POSITION_MANAGER,
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

        // Check if position exists (liquidity > 0 or tokensOwed > 0)
        const [,,,,,,, liquidity, , , tokensOwed0, tokensOwed1] = positionData as any[];
        
        if (liquidity === 0n && tokensOwed0 === 0n && tokensOwed1 === 0n) {
          console.log(`✅ Position ${tokenId} - no liquidity or fees accumulated`);
          return {
            token0: '0',
            token1: '0',
            usdValue: 0
          };
        }

        // Return the tokensOwed amounts as authentic fee data
        console.log(`✅ Position ${tokenId} - authentic fees: ${tokensOwed0.toString()} / ${tokensOwed1.toString()}`);
        
        // Convert to USD if we have token amounts
        if (tokensOwed0 > 0n || tokensOwed1 > 0n) {
          try {
            const feeConversion = await PriceService.convertFeesToUSD(
              tokensOwed0.toString(),
              tokensOwed1.toString()
            );
            
            return {
              token0: tokensOwed0.toString(),
              token1: tokensOwed1.toString(),
              usdValue: feeConversion.totalUSD,
              ethPrice: feeConversion.ethPrice,
              kiltPrice: feeConversion.kiltPrice
            };
          } catch (priceError) {
            console.warn(`⚠️ Price conversion failed for ${tokenId}:`, priceError);
            return {
              token0: tokensOwed0.toString(),
              token1: tokensOwed1.toString(),
              usdValue: undefined
            };
          }
        }

        return {
          token0: tokensOwed0.toString(),
          token1: tokensOwed1.toString(),
          usdValue: 0
        };

      } catch (error: any) {
        console.warn(`⚠️ DirectFee RPC ${rpcIndex + 1} failed:`, error.message);
        
        // If this was the last RPC endpoint, throw the error
        if (rpcIndex === this.rpcEndpoints.length - 1) {
          throw error;
        }
        
        // Otherwise try the next RPC endpoint
        continue;
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('All RPC endpoints failed');
  }

  /**
   * Get fees for multiple positions in parallel
   */
  static async getBatchUnclaimedFees(tokenIds: string[]): Promise<Record<string, { token0: string; token1: string; usdValue?: number }>> {
    const promises = tokenIds.map(async (tokenId) => {
      const fees = await this.getUnclaimedFees(tokenId);
      return { tokenId, fees };
    });

    const results = await Promise.all(promises);
    
    return results.reduce((acc, { tokenId, fees }) => {
      acc[tokenId] = fees;
      return acc;
    }, {} as Record<string, { token0: string; token1: string; usdValue?: number }>);
  }
}