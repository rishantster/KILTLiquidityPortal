import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { PriceService } from './price-service';

/**
 * Simple Fee Service - Get authentic unclaimed fees matching Uniswap interface
 */
export class SimpleFeeService {
  // Multiple RPC endpoints for fallback when rate limited
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
   * Get unclaimed fees using collect simulation with RPC fallback (exactly like Uniswap interface)
   */
  static async getUnclaimedFees(tokenId: string): Promise<{ 
    token0: string; 
    token1: string; 
    usdValue?: number;
    ethPrice?: number;
    kiltPrice?: number;
  }> {
    console.log(`🚀 SimpleFeeService.getUnclaimedFees called for token ${tokenId}`);
    
    // Try each RPC endpoint until one works
    for (let rpcIndex = 0; rpcIndex < this.rpcEndpoints.length; rpcIndex++) {
      try {
        console.log(`⚠️ RPC attempt ${rpcIndex + 1} using ${this.rpcEndpoints[rpcIndex]}`);
        
        const client = this.getClient(rpcIndex);
        
        // Use the same method as Uniswap interface - simulate collect with max amounts
        const collectParams: [bigint, `0x${string}`, bigint, bigint] = [
          BigInt(tokenId),                                           // tokenId
          '0x0000000000000000000000000000000000000000',              // recipient (zero for simulation)
          BigInt('340282366920938463463374607431768211455'),         // amount0Max (uint128 max)
          BigInt('340282366920938463463374607431768211455')          // amount1Max (uint128 max)
        ];

        // Simulate the collect call to get unclaimed fees
        const result = await client.simulateContract({
          address: this.POSITION_MANAGER as `0x${string}`,
          abi: [{
            inputs: [
              { name: 'tokenId', type: 'uint256' },
              { name: 'recipient', type: 'address' },
              { name: 'amount0Max', type: 'uint128' },
              { name: 'amount1Max', type: 'uint128' }
            ],
            name: 'collect',
            outputs: [
              { name: 'amount0', type: 'uint256' },
              { name: 'amount1', type: 'uint256' }
            ],
            stateMutability: 'payable',
            type: 'function'
          }],
          functionName: 'collect',
          args: collectParams
        });

        const [amount0, amount1] = result.result as [bigint, bigint];

        // Convert to USD using real-time prices
        const feeConversion = await PriceService.convertFeesToUSD(
          amount0.toString(),
          amount1.toString()
        );

        if (rpcIndex > 0) {
          console.log(`✅ RPC recovery successful on attempt ${rpcIndex + 1}`);
        }

        console.log(`✅ Position ${tokenId} fees: { token0: '${amount0.toString()}', token1: '${amount1.toString()}', usdValue: ${feeConversion.totalUSD} }`);

        return {
          token0: amount0.toString(),
          token1: amount1.toString(),
          usdValue: feeConversion.totalUSD,
          ethPrice: feeConversion.ethPrice,
          kiltPrice: feeConversion.kiltPrice
        };

      } catch (error: any) {
        console.log(`⚠️ RPC attempt ${rpcIndex + 1} failed:`, error.shortMessage || error.message);
        
        // If this is the last RPC endpoint, throw the error
        if (rpcIndex === this.rpcEndpoints.length - 1) {
          console.error(`❌ All RPC endpoints failed for position ${tokenId}. Last error:`, error);
          throw error;
        }
        
        // Continue to next RPC endpoint
        continue;
      }
    }

    // Fallback if all RPC endpoints fail
    console.error(`❌ All RPC endpoints exhausted for position ${tokenId}`);
    return {
      token0: '0',
      token1: '0',
      usdValue: 0
    };
  }

  /**
   * Get fees for multiple positions in parallel
   */
  static async getBatchUnclaimedFees(tokenIds: string[]): Promise<Record<string, { token0: string; token1: string }>> {
    const promises = tokenIds.map(async (tokenId) => {
      const fees = await this.getUnclaimedFees(tokenId);
      return { tokenId, fees };
    });

    const results = await Promise.all(promises);
    
    return results.reduce((acc, { tokenId, fees }) => {
      acc[tokenId] = fees;
      return acc;
    }, {} as Record<string, { token0: string; token1: string }>);
  }
}