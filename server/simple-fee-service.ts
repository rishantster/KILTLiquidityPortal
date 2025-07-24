import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { PriceService } from './price-service';

/**
 * Simple Fee Service - Get authentic unclaimed fees matching Uniswap interface
 */
export class SimpleFeeService {
  private static client = createPublicClient({
    chain: base,
    transport: http('https://base.drpc.org')
  });

  private static readonly POSITION_MANAGER = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1' as `0x${string}`;

  /**
   * Get unclaimed fees using collect simulation (exactly like Uniswap interface)
   */
  static async getUnclaimedFees(tokenId: string): Promise<{ 
    token0: string; 
    token1: string; 
    usdValue?: number;
    ethPrice?: number;
    kiltPrice?: number;
  }> {
    console.log(`🚀 SimpleFeeService.getUnclaimedFees called for token ${tokenId}`);
    try {
      // Use the same method as Uniswap interface - simulate collect with max amounts
      const collectParams = [
        BigInt(tokenId),                                           // tokenId
        '0x0000000000000000000000000000000000000000',              // recipient (zero for simulation)
        BigInt('340282366920938463463374607431768211455'),         // amount0Max (uint128 max)
        BigInt('340282366920938463463374607431768211455')          // amount1Max (uint128 max)
      ];

      // Simulate the collect call to get unclaimed fees
      const result = await this.client.simulateContract({
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

      console.log(`💰 Position ${tokenId} fees: $${feeConversion.totalUSD.toFixed(2)} (ETH: $${feeConversion.ethUSD.toFixed(2)}, KILT: $${feeConversion.kiltUSD.toFixed(2)})`);

      return {
        token0: amount0.toString(),
        token1: amount1.toString(),
        usdValue: feeConversion.totalUSD,
        ethPrice: feeConversion.ethPrice,
        kiltPrice: feeConversion.kiltPrice
      };

    } catch (error) {
      console.error(`❌ Fee simulation failed for position ${tokenId}:`, error);
      // Avoid JSON.stringify for BigInt serialization issues
      console.error(`Full error details:`, error);
      
      // Return zero fees if simulation fails
      return {
        token0: '0',
        token1: '0',
        usdValue: 0
      };
    }
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