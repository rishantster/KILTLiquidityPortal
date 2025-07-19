import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

// Optimized query hook with aggressive caching and background updates
export function useOptimizedQueries(userAddress?: string) {
  // Cache KILT data for 2 minutes with background updates
  const kiltData = useQuery({
    queryKey: ['/api/kilt-data'],
    staleTime: 5 * 60 * 1000, // 5 minutes for maximum caching
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 2 * 60 * 1000, // Background refresh every 2 minutes
    refetchOnWindowFocus: false,
  });

  // Cache program analytics for 1 minute
  const programAnalytics = useQuery({
    queryKey: ['/api/rewards/program-analytics'],
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refresh every minute
    refetchOnWindowFocus: false,
  });

  // Cache APR data for 30 seconds
  const aprData = useQuery({
    queryKey: ['/api/rewards/maximum-apr'],
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    refetchOnWindowFocus: false,
  });

  // Cache user-specific APR for personalized rewards display
  const userAprData = useQuery({
    queryKey: ['/api/rewards/user-apr', userAddress],
    staleTime: 2 * 60 * 1000, // 2 minutes for user-specific data
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // Background refresh every 2 minutes
    refetchOnWindowFocus: false,
    enabled: !!userAddress, // Only fetch if user address provided
  });

  // Cache real trading fees APR data
  const tradingFeesData = useQuery({
    queryKey: ['/api/trading-fees/pool-apr'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    refetchOnWindowFocus: false,
  });

  // Memoized calculations to prevent unnecessary re-renders
  const calculations = useMemo(() => {
    // Use real trading fees APR from our service instead of flawed calculation
    const feeAPR = tradingFeesData.data?.tradingFeesAPR || 0;
    const poolTVL = tradingFeesData.data?.poolTVL || programAnalytics.data?.totalLiquidity || 91431.8;
    const dailyVolume = tradingFeesData.data?.poolVolume24hUSD || kiltData.data?.volume || 426;
    
    // Use user-specific APR if available, otherwise fall back to maximum APR
    const kiltRewardAPR = userAprData.data?.incentiveAPR || aprData.data?.maxAPR || 0;
    const totalAPR = feeAPR + kiltRewardAPR;

    return {
      feeAPR: feeAPR.toFixed(1),
      kiltRewardAPR,
      totalAPR: totalAPR.toFixed(0),
      dailyVolume,
      poolTVL,
      dataSource: tradingFeesData.data?.dataSource || 'fallback',
      feeTier: tradingFeesData.data?.feeTier || 3000,
    };
  }, [kiltData.data, programAnalytics.data, aprData.data, userAprData.data, tradingFeesData.data]);

  return {
    kiltData,
    programAnalytics,
    aprData,
    userAprData,
    tradingFeesData,
    calculations,
    isLoading: kiltData.isLoading || programAnalytics.isLoading || aprData.isLoading || tradingFeesData.isLoading,
  };
}