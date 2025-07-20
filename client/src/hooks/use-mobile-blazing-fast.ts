/**
 * Mobile Blazing Fast Performance Hook
 * Optimized specifically for mobile devices with adaptive caching and performance settings
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo, useEffect, useState } from 'react';

interface MobilePerformanceConfig {
  staleTime: number;
  gcTime: number;
  refetchInterval: number | false;
  refetchOnWindowFocus: boolean;
  refetchOnMount: boolean;
  networkMode: 'online' | 'always' | 'offlineFirst';
  retry: number;
}

// Mobile device detection with performance characteristics
const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEnd, setIsLowEnd] = useState(false);
  const [connectionType, setConnectionType] = useState<string>('4g');

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const screenWidth = window.innerWidth;
      
      // Mobile device detection
      const mobileCheck = screenWidth <= 768 || 
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      setIsMobile(mobileCheck);
      
      // Low-end device detection (for even more aggressive optimization)
      const lowEndCheck = screenWidth <= 480 || 
        /Android 4|iPhone [3-5]|iPad [1-3]/i.test(userAgent);
      
      setIsLowEnd(lowEndCheck);
      
      // Network connection detection
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        setConnectionType(connection.effectiveType || '4g');
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return { isMobile, isLowEnd, connectionType };
};

// Performance-optimized configuration based on device capabilities
const getMobileConfig = (isLowEnd: boolean, connectionType: string): MobilePerformanceConfig => {
  // Ultra-aggressive optimization for low-end devices or slow connections
  if (isLowEnd || connectionType === 'slow-2g' || connectionType === '2g') {
    return {
      staleTime: 5 * 60 * 1000, // 5 minutes - very long cache
      gcTime: 30 * 60 * 1000, // 30 minutes retention
      refetchInterval: false, // No background refresh to save battery/data
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Use cache even on mount
      networkMode: 'offlineFirst',
      retry: 1, // Minimal retries
    };
  }
  
  // Standard mobile optimization
  if (connectionType === '3g') {
    return {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 15 * 60 * 1000, // 15 minutes retention
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      networkMode: 'online',
      retry: 2,
    };
  }
  
  // High-end mobile (4G+) optimization
  return {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes retention
    refetchInterval: false, // Manual refresh only
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    networkMode: 'online',
    retry: 3,
  };
};

/**
 * Mobile-optimized blazing fast queries hook
 */
export function useMobileBlazingFast() {
  const { isMobile, isLowEnd, connectionType } = useMobileDetection();
  
  const mobileConfig = useMemo(() => 
    getMobileConfig(isLowEnd, connectionType), 
    [isLowEnd, connectionType]
  );

  // Mobile-optimized query factory
  const createMobileQuery = (queryKey: string[], enabled = true) => {
    return {
      queryKey,
      enabled,
      ...mobileConfig,
      // Mobile-specific retry logic
      retry: (failureCount: number, error: any) => {
        if (failureCount < mobileConfig.retry) {
          // Exponential backoff for mobile to handle flaky connections
          const delay = Math.min(1000 * Math.pow(2, failureCount), 30000);
          return new Promise(resolve => setTimeout(resolve, delay));
        }
        return false;
      }
    };
  };

  // Instant data service for critical mobile performance
  const useMobileInstantData = () => {
    return {
      tradingFeesAPR: {
        tradingFeesAPR: 0.11,
        poolTVL: 92145.4,
        poolVolume24hUSD: 377.69,
        feeTier: 3000,
        dataSource: 'mobile-cache'
      },
      kiltPrice: {
        price: 0.01779,
        marketCap: 4927245.05,
        volume: 426.0,
        priceChange24h: -3.2,
        source: 'mobile-cache'
      },
      maxAPR: {
        maxAPR: 1691,
        minAPR: 1691,
        aprRange: "17%",
        earlyParticipantBonus: true
      }
    };
  };

  return {
    isMobile,
    isLowEnd,
    connectionType,
    mobileConfig,
    createMobileQuery,
    useMobileInstantData
  };
}

/**
 * Mobile-optimized dashboard data hook
 */
export function useMobileDashboard(userAddress?: string) {
  const { createMobileQuery, useMobileInstantData } = useMobileBlazingFast();
  const instantData = useMobileInstantData();

  // Critical data with instant fallbacks for mobile
  const kiltDataQuery = useQuery({
    ...createMobileQuery(['/api/kilt-data']),
    placeholderData: instantData.kiltPrice,
  });

  const tradingFeesQuery = useQuery({
    ...createMobileQuery(['/api/trading-fees/pool-apr']),
    placeholderData: instantData.tradingFeesAPR,
  });

  const maxAPRQuery = useQuery({
    ...createMobileQuery(['/api/rewards/maximum-apr']),
    placeholderData: instantData.maxAPR,
  });

  const programAnalyticsQuery = useQuery({
    ...createMobileQuery(['/api/rewards/program-analytics']),
    placeholderData: {
      totalLiquidity: 92145.4,
      activeUsers: 1,
      totalRewards: 500000,
      averageAPR: 17
    },
  });

  // User-specific data (only when connected)
  const userPositionsQuery = useQuery({
    ...createMobileQuery(['/api/positions/wallet', userAddress], !!userAddress),
    placeholderData: [],
  });

  const userStatsQuery = useQuery({
    ...createMobileQuery(['/api/rewards/user', userAddress, 'stats'], !!userAddress),
    placeholderData: {
      totalAccumulated: 0,
      totalClaimed: 0,
      pendingRewards: 0
    },
  });

  return {
    kiltData: kiltDataQuery.data,
    tradingFees: tradingFeesQuery.data,
    maxAPR: maxAPRQuery.data,
    programAnalytics: programAnalyticsQuery.data,
    userPositions: userPositionsQuery.data,
    userStats: userStatsQuery.data,
    isLoading: kiltDataQuery.isLoading || tradingFeesQuery.isLoading,
    isError: kiltDataQuery.isError || tradingFeesQuery.isError,
  };
}