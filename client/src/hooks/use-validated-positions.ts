import { useQuery } from '@tanstack/react-query';
import { useWagmiWallet } from './use-wagmi-wallet';

/**
 * Hook that validates registered database positions against live blockchain data
 * This ensures we only show positions that are both:
 * 1. Registered in our database (reward-eligible)
 * 2. Actually active on the blockchain (not closed/burned)
 */
export function useValidatedPositions(userId: number | undefined) {
  const { address, isConnected } = useWagmiWallet();

  return useQuery({
    queryKey: ['validated-positions', userId, address],
    queryFn: async () => {
      if (!userId || !address) return [];

      try {
        // Get registered positions from database
        const registeredResponse = await fetch(`/api/positions/user/${userId}`);
        if (!registeredResponse.ok) {
          throw new Error('Failed to fetch registered positions');
        }
        const registeredPositions = await registeredResponse.json();

        // Get live blockchain positions
        const blockchainResponse = await fetch(`/api/positions/wallet/${address}`);
        if (!blockchainResponse.ok) {
          throw new Error('Failed to fetch blockchain positions');
        }
        const blockchainPositions = await blockchainResponse.json();

        // Cross-validate: only include registered positions that still exist on blockchain
        const validatedPositions = registeredPositions.map((dbPosition: any) => {
          const blockchainPosition = blockchainPositions.find((bcPosition: any) => 
            bcPosition.tokenId === dbPosition.nftTokenId
          );
          
          // Position must exist on blockchain
          if (!blockchainPosition) {
            console.warn(`Registered position ${dbPosition.nftTokenId} not found on blockchain - may have been burned`);
            return null;
          }

          // Check if position is still active (has liquidity)
          const hasLiquidity = blockchainPosition.liquidity && BigInt(blockchainPosition.liquidity) > 0n;
          if (!hasLiquidity) {
            console.warn(`Registered position ${dbPosition.nftTokenId} has no liquidity on blockchain - may have been closed`);
          }

          // Merge database and blockchain data for complete position info
          return {
            ...dbPosition,
            // Use fresh blockchain data for critical fields
            liquidity: blockchainPosition.liquidity,
            token0Amount: blockchainPosition.token0Amount,
            token1Amount: blockchainPosition.token1Amount,
            currentValueUSD: blockchainPosition.currentValueUSD,
            isInRange: blockchainPosition.isInRange,
            fees: blockchainPosition.fees,
            isActive: hasLiquidity,
            // Include APR data from blockchain position
            totalAPR: blockchainPosition.totalAPR,
            tradingFeeAPR: blockchainPosition.tradingFeeAPR,
            aprBreakdown: blockchainPosition.aprBreakdown,
            // Keep database fields for reward tracking
            rewardEligible: dbPosition.rewardEligible,
            createdViaApp: dbPosition.createdViaApp,
            verificationStatus: dbPosition.verificationStatus
          };
        }).filter(Boolean); // Remove null entries

        console.log(`🔍 Position validation: ${registeredPositions.length} registered, ${blockchainPositions.length} on blockchain, ${validatedPositions.length} validated`);
        console.log('📋 Validated positions:', validatedPositions.map(p => ({ tokenId: p.nftTokenId, liquidity: p.liquidity, active: p.isActive })));
        
        return validatedPositions;
        
      } catch (error) {
        console.error('Failed to validate positions:', error);
        return [];
      }
    },
    enabled: !!userId && !!address && isConnected,
    staleTime: 30 * 1000, // 30 seconds - frequent validation to catch position changes
    gcTime: 2 * 60 * 1000, // 2 minutes retention
    refetchInterval: 60 * 1000, // Refresh every minute to detect closed positions
    refetchOnWindowFocus: true, // Revalidate when user returns to app
    retry: 2,
    networkMode: 'online' as const,
  });
}