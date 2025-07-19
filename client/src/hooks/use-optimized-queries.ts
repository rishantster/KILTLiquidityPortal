import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

// Optimized query hook with aggressive caching and background updates
export function useOptimizedQueries() {
  // Cache KILT data for 2 minutes with background updates
  const kiltData = useQuery({
    queryKey: ['/api/kilt-data'],
    staleTime: 2 * 60 * 1000, // 2 minutes
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

  // Memoized calculations to prevent unnecessary re-renders
  const calculations = useMemo(() => {
    const dailyVolume = kiltData.data?.volume || 426;
    const poolTVL = programAnalytics.data?.totalLiquidity || 91431.8;
    const feeTier = 0.003; // 0.3%
    const dailyFees = dailyVolume * feeTier;
    const annualFees = dailyFees * 365;
    const feeAPR = poolTVL > 0 ? (annualFees / poolTVL) * 100 : 0;
    const kiltRewardAPR = aprData.data?.maxAPR || 112;
    const totalAPR = feeAPR + kiltRewardAPR;

    return {
      feeAPR: feeAPR.toFixed(1),
      kiltRewardAPR,
      totalAPR: totalAPR.toFixed(0),
      dailyVolume,
      poolTVL,
    };
  }, [kiltData.data, programAnalytics.data, aprData.data]);

  return {
    kiltData,
    programAnalytics,
    aprData,
    calculations,
    isLoading: kiltData.isLoading || programAnalytics.isLoading || aprData.isLoading,
  };
}