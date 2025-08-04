/**
 * SINGLE SOURCE OF TRUTH APR HOOK
 * 
 * This hook provides the ONLY authoritative APR data for all frontend components.
 * Replaces all other APR-related hooks and calculations.
 */

import { useQuery } from '@tanstack/react-query';

interface SingleSourceAPRData {
  // Program-wide APR (official values)
  programAPR: number;
  tradingAPR: number;
  totalProgramAPR: number;
  
  // User-specific APR (if available)
  userTradingAPR?: number;
  userIncentiveAPR?: number;
  userTotalAPR?: number;
  
  // Maximum theoretical APR
  maxTheoreticalAPR: number;
  
  // Metadata
  source: string;
  timestamp: number;
  totalParticipants: number;
  totalProgramTVL: number;
}

interface ExpectedReturnsDisplay {
  tradingAPR: string;
  incentiveAPR: string;
  totalAPR: string;
  source: string;
}

/**
 * Get official program APR - use this for all Expected Returns displays
 */
export function useOfficialAPR() {
  return useQuery<SingleSourceAPRData>({
    queryKey: ['official-apr'],
    queryFn: async () => {
      // Fetch real data from existing endpoints
      const [tradingResponse, maxAPRResponse, analyticsResponse] = await Promise.all([
        fetch('/api/trading-fees/pool-apr'),
        fetch('/api/rewards/maximum-apr'),
        fetch('/api/rewards/program-analytics')
      ]);

      if (!tradingResponse.ok || !maxAPRResponse.ok || !analyticsResponse.ok) {
        throw new Error('Failed to fetch official APR data');
      }

      const tradingData = await tradingResponse.json();
      const maxAPRData = await maxAPRResponse.json();
      const analyticsData = await analyticsResponse.json();

      return {
        programAPR: maxAPRData.maxAPR || 0,
        tradingAPR: tradingData.tradingFeesAPR || 0,
        totalProgramAPR: (tradingData.tradingFeesAPR || 0) + (maxAPRData.maxAPR || 0),
        maxTheoreticalAPR: maxAPRData.maxAPR || 0,
        source: 'Real blockchain data',
        timestamp: Date.now(),
        totalParticipants: analyticsData.activeParticipants || 0,
        totalProgramTVL: analyticsData.totalLiquidity || 0
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * Get formatted Expected Returns data - use this for Expected Returns components
 */
export function useExpectedReturns() {
  return useQuery<ExpectedReturnsDisplay>({
    queryKey: ['expected-returns'],
    queryFn: async () => {
      // Fetch real data from existing endpoints
      const [tradingResponse, maxAPRResponse] = await Promise.all([
        fetch('/api/trading-fees/pool-apr'),
        fetch('/api/rewards/maximum-apr')
      ]);

      if (!tradingResponse.ok || !maxAPRResponse.ok) {
        throw new Error('Failed to fetch APR data');
      }

      const tradingData = await tradingResponse.json();
      const maxAPRData = await maxAPRResponse.json();

      return {
        tradingAPR: tradingData.tradingFeesAPR?.toFixed(1) || '0.0',
        incentiveAPR: maxAPRData.maxAPR?.toString() || '0',
        totalAPR: ((tradingData.tradingFeesAPR || 0) + (maxAPRData.maxAPR || 0)).toFixed(1),
        source: 'Real blockchain data'
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * Get user-specific APR data - use this for user wallet analysis
 */
export function useUserAPR(address?: string) {
  return useQuery<SingleSourceAPRData>({
    queryKey: ['user-apr', address],
    queryFn: async () => {
      if (!address) throw new Error('Address required');
      
      // Fetch real user data from existing endpoints
      const [tradingResponse, maxAPRResponse, userAPRResponse] = await Promise.all([
        fetch('/api/trading-fees/pool-apr'),
        fetch('/api/rewards/maximum-apr'),
        fetch(`/api/rewards/user-apr/${address}`)
      ]);

      if (!tradingResponse.ok || !maxAPRResponse.ok || !userAPRResponse.ok) {
        throw new Error('Failed to fetch user APR data');
      }

      const tradingData = await tradingResponse.json();
      const maxAPRData = await maxAPRResponse.json();
      const userAPRData = await userAPRResponse.json();

      return {
        programAPR: maxAPRData.maxAPR || 0,
        tradingAPR: tradingData.tradingFeesAPR || 0,
        totalProgramAPR: (tradingData.tradingFeesAPR || 0) + (maxAPRData.maxAPR || 0),
        userTradingAPR: userAPRData.tradingAPR,
        userIncentiveAPR: userAPRData.incentiveAPR,
        userTotalAPR: userAPRData.totalAPR,
        maxTheoreticalAPR: maxAPRData.maxAPR || 0,
        source: 'Real blockchain data',
        timestamp: Date.now(),
        totalParticipants: 0,
        totalProgramTVL: 0
      };
    },
    enabled: !!address,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
}

/**
 * LEGACY REPLACEMENT: Single hook that replaces useOptimizedQueries
 * This maintains backward compatibility while using single source
 */
export function useSingleSourceAPR(address?: string) {
  // Get expected returns (program-wide APR)
  const { data: expectedReturns, isLoading: expectedLoading, error: expectedError } = useExpectedReturns();
  
  // Get user-specific APR if address provided
  const { data: userAPR, isLoading: userLoading } = useUserAPR(address);

  // Return formatted data for backward compatibility
  const calculations = {
    feeAPR: expectedReturns?.tradingAPR || '0.00',
    kiltRewardAPR: expectedReturns?.incentiveAPR || '0.00',
    totalAPR: expectedReturns?.totalAPR || '0.00'
  };

  return {
    calculations,
    aprData: userAPR || null,
    isLoading: expectedLoading || userLoading,
    error: expectedError ? 'Failed to load APR data' : null,
    source: 'single-source-apr'
  };
}