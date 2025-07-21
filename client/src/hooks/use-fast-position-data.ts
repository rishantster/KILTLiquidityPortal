import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/hooks/use-wallet';
import { useMemo } from 'react';

// Ultra-fast position data hook with smart caching
export function useFastPositionData() {
  const { address, isConnected } = useWallet();

  // Cache position data aggressively
  const positionsQuery = useQuery({
    queryKey: ['/api/positions/wallet', address],
    enabled: isConnected && !!address,
    staleTime: 30 * 1000, // 30 seconds - positions don't change often
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval: 60 * 1000, // Check every minute
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Memoize processed position data to prevent recalculations
  const processedPositions = useMemo(() => {
    if (!positionsQuery.data) return [];
    
    return positionsQuery.data.map((position: any) => ({
      ...position,
      // Pre-calculate display values
      displayValue: `$${position.currentValueUSD?.toFixed(2) || '0.00'}`,
      displayFees: position.fees ? 
        `$${((position.fees.token0USD || 0) + (position.fees.token1USD || 0)).toFixed(2)}` : 
        '$0.00',
      isActive: position.isActive && position.isInRange,
      statusColor: position.isActive ? 
        (position.isInRange ? 'text-green-400' : 'text-yellow-400') : 
        'text-gray-400'
    }));
  }, [positionsQuery.data]);

  return {
    positions: processedPositions,
    isLoading: positionsQuery.isLoading,
    error: positionsQuery.error,
    refetch: positionsQuery.refetch,
  };
}