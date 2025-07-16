import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

/**
 * Production-grade real-time data hook with automatic refresh
 * Fetches live TVL, APR, and liquidity data from authentic sources
 */
export function useRealTimePoolData() {
  return useQuery({
    queryKey: ['/api/pools/0x82Da478b1382B951cBaD01Beb9eD459cDB16458E/info'],
    refetchInterval: 30000, // 30 seconds
    staleTime: 25000, // 25 seconds
    cacheTime: 60000, // 1 minute
  });
}

export function useRealTimeKiltPrice() {
  return useQuery({
    queryKey: ['/api/kilt-data'],
    refetchInterval: 15000, // 15 seconds  
    staleTime: 10000, // 10 seconds
    cacheTime: 30000, // 30 seconds
  });
}

export function useRealTimeUserAPR(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['/api/rewards/user-apr', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 60000, // 1 minute
    staleTime: 45000, // 45 seconds
    cacheTime: 120000, // 2 minutes
  });
}

export function useRealTimeUserPositions(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['/api/positions/wallet', walletAddress],
    enabled: !!walletAddress,
    refetchInterval: 45000, // 45 seconds
    staleTime: 30000, // 30 seconds
    cacheTime: 90000, // 1.5 minutes
  });
}

export function useRealTimeUserStats(userId: number | undefined) {
  return useQuery({
    queryKey: ['/api/rewards/user', userId, 'stats'],
    enabled: !!userId,
    refetchInterval: 60000, // 1 minute
    staleTime: 45000, // 45 seconds
    cacheTime: 120000, // 2 minutes
  });
}

export function useRealTimeProgramAnalytics() {
  return useQuery({
    queryKey: ['/api/rewards/program-analytics'],
    refetchInterval: 120000, // 2 minutes
    staleTime: 90000, // 1.5 minutes
    cacheTime: 300000, // 5 minutes
    retry: 3,
    retryDelay: 1000,
  });
}

export function useRealTimeMaximumAPR() {
  return useQuery({
    queryKey: ['/api/rewards/maximum-apr'],
    refetchInterval: 120000, // 2 minutes
    staleTime: 90000, // 1.5 minutes
    cacheTime: 300000, // 5 minutes
    retry: 3,
    retryDelay: 1000,
  });
}

/**
 * Comprehensive dashboard data hook
 * Aggregates all real-time data sources
 */
export function useRealTimeDashboard(walletAddress: string | undefined, userId: number | undefined) {
  const poolData = useRealTimePoolData();
  const kiltPrice = useRealTimeKiltPrice();
  const userAPR = useRealTimeUserAPR(walletAddress);
  const userPositions = useRealTimeUserPositions(walletAddress);
  const userStats = useRealTimeUserStats(userId);
  const programAnalytics = useRealTimeProgramAnalytics();
  const maximumAPR = useRealTimeMaximumAPR();

  const isLoading = poolData.isLoading || kiltPrice.isLoading || userAPR.isLoading || 
                   userPositions.isLoading || userStats.isLoading || programAnalytics.isLoading || 
                   maximumAPR.isLoading;

  const hasError = poolData.isError || kiltPrice.isError || userAPR.isError || 
                  userPositions.isError || userStats.isError || programAnalytics.isError || 
                  maximumAPR.isError;

  return {
    poolData: poolData.data,
    kiltPrice: kiltPrice.data,
    userAPR: userAPR.data,
    userPositions: userPositions.data,
    userStats: userStats.data,
    programAnalytics: programAnalytics.data,
    maximumAPR: maximumAPR.data,
    isLoading,
    hasError,
    // Individual loading states for granular control
    poolDataLoading: poolData.isLoading,
    kiltPriceLoading: kiltPrice.isLoading,
    userAPRLoading: userAPR.isLoading,
    userPositionsLoading: userPositions.isLoading,
    userStatsLoading: userStats.isLoading,
    programAnalyticsLoading: programAnalytics.isLoading,
    maximumAPRLoading: maximumAPR.isLoading,
    // Last updated timestamps
    poolDataUpdated: poolData.dataUpdatedAt,
    kiltPriceUpdated: kiltPrice.dataUpdatedAt,
    userAPRUpdated: userAPR.dataUpdatedAt,
    userPositionsUpdated: userPositions.dataUpdatedAt,
    userStatsUpdated: userStats.dataUpdatedAt,
    programAnalyticsUpdated: programAnalytics.dataUpdatedAt,
    maximumAPRUpdated: maximumAPR.dataUpdatedAt,
  };
}