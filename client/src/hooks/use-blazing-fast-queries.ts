import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export interface BlazingDashboardData {
  kiltPrice: number;
  poolData: any;
  programAnalytics: any;
  tradingFeesAPR: any;
  maxAPR: any;
  userPositions?: any[];
  userStats?: any;
}

/**
 * BLAZING FAST unified dashboard hook - loads all data in parallel
 */
export function useBlazingDashboard(userAddress?: string) {
  // Single parallel query for all dashboard data
  const dashboardQuery = useQuery({
    queryKey: ['/api/dashboard/unified', userAddress],
    enabled: !!userAddress,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Background refresh every minute
    refetchOnWindowFocus: false,
  });

  // Individual optimized queries with aggressive caching
  const kiltDataQuery = useQuery({
    queryKey: ['/api/kilt-data'],
    staleTime: 30 * 1000, // 30 seconds - matches server cache
    gcTime: 2 * 60 * 1000,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    refetchOnWindowFocus: false,
  });

  const programAnalyticsQuery = useQuery({
    queryKey: ['/api/rewards/program-analytics'],
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const maxAPRQuery = useQuery({
    queryKey: ['/api/rewards/maximum-apr'],
    staleTime: 3 * 60 * 1000, // 3 minutes - stable calculation
    gcTime: 10 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const tradingFeesQuery = useQuery({
    queryKey: ['/api/trading-fees/pool-apr'],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const userPositionsQuery = useQuery({
    queryKey: ['/api/positions/wallet', userAddress],
    enabled: !!userAddress,
    staleTime: 30 * 1000, // 30 seconds - matches server cache
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const userStatsQuery = useQuery({
    queryKey: ['/api/rewards/user', userAddress && userAddress !== 'undefined' ? userAddress : 'none', 'stats'],
    enabled: !!userAddress && userAddress !== 'undefined',
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Blazing fast calculations with memoization
  const calculations = useMemo(() => {
    const kiltPrice = kiltDataQuery.data?.price || 0.01779;
    const feeAPR = tradingFeesQuery.data?.tradingFeesAPR || 0.11;
    const poolTVL = tradingFeesQuery.data?.poolTVL || programAnalyticsQuery.data?.totalLiquidity || 92145.4;
    const incentiveAPR = maxAPRQuery.data?.maxAPR || 1691;
    const totalAPR = feeAPR + (incentiveAPR / 100); // Convert basis points
    
    const marketCap = kiltPrice * 276970000; // Circulating supply
    const activeUsers = programAnalyticsQuery.data?.activeUsers || 1;
    const totalLiquidity = programAnalyticsQuery.data?.totalLiquidity || poolTVL;
    
    return {
      kiltPrice,
      feeAPR,
      incentiveAPR: incentiveAPR / 100, // Convert to percentage
      totalAPR,
      marketCap,
      poolTVL,
      activeUsers,
      totalLiquidity,
      aprRange: `${(incentiveAPR / 100).toFixed(0)}%`, // Simplified range display
    };
  }, [
    kiltDataQuery.data,
    tradingFeesQuery.data,
    maxAPRQuery.data,
    programAnalyticsQuery.data,
  ]);

  // Loading states with optimistic loading
  const isLoading = kiltDataQuery.isLoading || programAnalyticsQuery.isLoading || maxAPRQuery.isLoading;
  const isUserDataLoading = userPositionsQuery.isLoading || userStatsQuery.isLoading;

  return {
    // Unified dashboard data (if using parallel endpoint)
    dashboardData: dashboardQuery.data,
    isDashboardLoading: dashboardQuery.isLoading,
    
    // Individual data sources
    kiltData: kiltDataQuery.data,
    programAnalytics: programAnalyticsQuery.data,
    maxAPR: maxAPRQuery.data,
    tradingFees: tradingFeesQuery.data,
    userPositions: userPositionsQuery.data,
    userStats: userStatsQuery.data,
    
    // Computed values
    calculations,
    
    // Loading states
    isLoading,
    isUserDataLoading,
    isAnyLoading: isLoading || isUserDataLoading,
    
    // Performance indicators
    isCached: {
      kilt: !kiltDataQuery.isFetching && !!kiltDataQuery.data,
      analytics: !programAnalyticsQuery.isFetching && !!programAnalyticsQuery.data,
      apr: !maxAPRQuery.isFetching && !!maxAPRQuery.data,
      positions: !userPositionsQuery.isFetching && !!userPositionsQuery.data,
    },
    
    // Manual refresh capability
    refresh: () => {
      kiltDataQuery.refetch();
      programAnalyticsQuery.refetch();
      maxAPRQuery.refetch();
      tradingFeesQuery.refetch();
      if (userAddress) {
        userPositionsQuery.refetch();
        userStatsQuery.refetch();
      }
    },
  };
}

/**
 * Lightning fast positions-only hook for positions tab
 */
export function useBlazingPositions(userAddress?: string) {
  return useQuery({
    queryKey: ['/api/positions/wallet', userAddress],
    enabled: !!userAddress,
    staleTime: 15 * 1000, // 15 seconds for fastest position updates
    gcTime: 60 * 1000,
    refetchInterval: 30 * 1000, // Background refresh every 30 seconds
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: true, // Keep refreshing in background
  });
}

/**
 * Ultra-fast APR calculation hook
 */
export function useBlazingAPR() {
  return useQuery({
    queryKey: ['/api/rewards/maximum-apr'],
    staleTime: 5 * 60 * 1000, // 5 minutes - very stable
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: true,
  });
}