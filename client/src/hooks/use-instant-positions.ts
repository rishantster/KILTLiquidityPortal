import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/contexts/wallet-context';
import { instantCache } from '@/utils/instant-cache';
import { uniswapAPI } from '@/lib/uniswap-api';
import { Address } from 'viem';

interface InstantPosition {
  tokenId: string;
  nftTokenId: string;
  token0Address: string;
  token1Address: string;
  amount0: string;
  amount1: string;
  liquidity: string;
  currentValueUSD?: number;
  poolAddress: string;
  feeTier: number;
  tickLower: number;
  tickUpper: number;
  isActive: boolean;
  createdAt: string;
  token0Symbol?: string;
  token1Symbol?: string;
  collectedFeesToken0?: string;
  collectedFeesToken1?: string;
}

// Ultra-fast position loading hook using Uniswap API directly
export function useInstantPositions() {
  const { address, isConnected } = useWallet();

  return useQuery<InstantPosition[]>({
    queryKey: ['instant-positions', address],
    queryFn: async () => {
      if (!address) return [];

      // First check instant cache for blazing speed
      const cached = instantCache.getInstant(`positions-${address}`);
      if (cached) {
        return cached;
      }

      try {
        // Use Uniswap API directly for blazing fast response
        const positions = await uniswapAPI.getKiltPositions(address as Address);
        
        // Convert to display format
        const converted = positions.map(pos => uniswapAPI.convertPositionToDisplay(pos));
        
        // Cache immediately for instant subsequent loads
        instantCache.set(`positions-${address}`, converted);
        
        return converted;
      } catch (error) {
        console.error('Error fetching instant positions:', error);
        return [];
      }
    },
    enabled: !!address && isConnected,
    staleTime: 5000, // 5 seconds for ultra-fresh data
    refetchInterval: 15000, // 15 seconds
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1
  });
}

// Preload positions for instant loading using Uniswap API
export function preloadPositions(address: string) {
  if (!address) return;

  // Background preload using Uniswap API
  uniswapAPI.getKiltPositions(address as Address)
    .then(positions => {
      const converted = positions.map(pos => uniswapAPI.convertPositionToDisplay(pos));
      instantCache.set(`positions-${address}`, converted);
    })
    .catch(error => {
      console.error('Preload positions failed:', error);
    });
}