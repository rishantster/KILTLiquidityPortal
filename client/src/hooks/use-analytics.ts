import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Types for analytics data
export interface PositionSnapshot {
  id: number;
  positionId: number;
  liquidityAmount: string;
  token0Amount: string;
  token1Amount: string;
  totalValueUSD: string;
  feesEarned0: string;
  feesEarned1: string;
  currentTick: number;
  inRange: boolean;
  snapshotAt: string;
}

export interface PoolMetricsHistory {
  id: number;
  poolAddress: string;
  timestamp: string;
  price: string;
  tvl: string;
  volume24h: string;
  liquidity: string;
  tick: number;
  feeGrowthGlobal0: string;
  feeGrowthGlobal1: string;
}

export interface UserAnalytics {
  id: number;
  userId: number;
  date: string;
  totalPositions: number;
  totalValueUSD: string;
  totalFeesEarnedUSD: string;
  totalRewardsEarnedUSD: string;
  avgPositionSize: string;
  bestPerformingPositionId: number | null;
}

export interface FeeEvent {
  id: number;
  positionId: number;
  transactionHash: string;
  blockNumber: number;
  amount0: string;
  amount1: string;
  amountUSD: string;
  gasUsed: number;
  gasPrice: string;
  eventType: string;
  timestamp: string;
}

export interface PerformanceMetrics {
  id: number;
  positionId: number;
  date: string;
  impermanentLoss: string;
  feesVsHolding: string;
  annualizedReturn: string;
  timeInRange: string;
  volumeContributed: string;
}

// Hook for position performance history
export function usePositionHistory(positionId: number | null, days = 30) {
  return useQuery<PositionSnapshot[]>({
    queryKey: ['position-history', positionId, days],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/position/${positionId}/history?days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch position history');
      return response.json();
    },
    enabled: !!positionId,
    refetchInterval: 60000, // Refetch every minute
  });
}

// Hook for position snapshots
export function usePositionSnapshots(positionId: number | null, limit = 100) {
  return useQuery<PositionSnapshot[]>({
    queryKey: ['position-snapshots', positionId, limit],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/position/${positionId}/snapshots?limit=${limit}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!positionId,
    refetchInterval: 30000,
  });
}

// Hook for position performance metrics
export function usePositionPerformance(positionId: number | null, days = 30) {
  return useQuery<PerformanceMetrics[]>({
    queryKey: ['position-performance', positionId, days],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/position/${positionId}/performance?days=${days}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!positionId,
    refetchInterval: 300000,
  });
}

// Hook for position fee events
export function usePositionFees(positionId: number | null, limit = 50) {
  return useQuery<{events: FeeEvent[], totals: {amount0: string, amount1: string, amountUSD: string}}>({
    queryKey: ['position-fees', positionId, limit],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/position/${positionId}/fees?limit=${limit}`);
      if (!response.ok) return { events: [], totals: { amount0: '0', amount1: '0', amountUSD: '0' } };
      return response.json();
    },
    enabled: !!positionId,
    refetchInterval: 30000,
  });
}

// Hook for pool price history
export function usePoolPriceHistory(poolAddress: string | null, hours = 24) {
  return useQuery<PoolMetricsHistory[]>({
    queryKey: ['pool-price-history', poolAddress, hours],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/pool/${poolAddress}/price-history?hours=${hours}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000',
    refetchInterval: 60000,
  });
}

// Hook for pool TVL history
export function usePoolTVLHistory(poolAddress: string | null, days = 7) {
  return useQuery<PoolMetricsHistory[]>({
    queryKey: ['pool-tvl-history', poolAddress, days],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/pool/${poolAddress}/tvl-history?days=${days}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000',
    refetchInterval: 300000,
  });
}

// Hook for user analytics dashboard
export function useUserAnalyticsDashboard(userId: number | null) {
  return useQuery<{
    metrics: UserAnalytics,
    topPositions: any[],
    history: UserAnalytics[]
  }>({
    queryKey: ['user-analytics-dashboard', userId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/user/${userId}/dashboard`);
      if (!response.ok) return { metrics: {} as UserAnalytics, topPositions: [], history: [] };
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 600000,
  });
}

// Hook for user analytics history
export function useUserAnalyticsHistory(userId: number | null, days = 30) {
  return useQuery<UserAnalytics[]>({
    queryKey: ['user-analytics-history', userId, days],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/user/${userId}/history?days=${days}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 600000,
  });
}

// Helper functions for data processing
export const AnalyticsUtils = {
  // Calculate percentage change between two values
  calculatePercentageChange: (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  },

  // Calculate average from array of numbers
  calculateAverage: (values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  },

  // Format large numbers with K, M, B suffixes
  formatLargeNumber: (value: number): string => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  },

  // Format percentage with proper sign
  formatPercentage: (value: number, decimals = 2): string => {
    const formatted = value.toFixed(decimals);
    return value > 0 ? `+${formatted}%` : `${formatted}%`;
  },

  // Calculate ROI based on initial investment and current value
  calculateROI: (currentValue: number, initialValue: number, fees: number = 0): number => {
    if (initialValue === 0) return 0;
    return ((currentValue + fees - initialValue) / initialValue) * 100;
  },

  // Calculate time-weighted average price from snapshots
  calculateTWAP: (snapshots: PositionSnapshot[], hours = 24): number => {
    if (snapshots.length === 0) return 0;
    
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const recentSnapshots = snapshots.filter(s => 
      new Date(s.snapshotAt).getTime() >= cutoffTime
    );
    
    if (recentSnapshots.length === 0) return 0;
    
    const totalValue = recentSnapshots.reduce((sum, snapshot) => 
      sum + parseFloat(snapshot.totalValueUSD), 0
    );
    
    return totalValue / recentSnapshots.length;
  },

  // Calculate impermanent loss percentage
  calculateImpermanentLoss: (
    currentPrice: number, 
    entryPrice: number, 
    token0Amount: number, 
    token1Amount: number
  ): number => {
    if (entryPrice === 0) return 0;
    
    const priceRatio = currentPrice / entryPrice;
    const sqrtPriceRatio = Math.sqrt(priceRatio);
    
    // Simplified IL calculation for 50/50 pools
    const hodlValue = token0Amount * currentPrice + token1Amount;
    const lpValue = 2 * sqrtPriceRatio * token0Amount * entryPrice;
    
    return ((lpValue - hodlValue) / hodlValue) * 100;
  },

  // Calculate fee yield (fees earned / liquidity provided)
  calculateFeeYield: (feesEarned: number, liquidityProvided: number, days: number): number => {
    if (liquidityProvided === 0 || days === 0) return 0;
    const annualizedFees = (feesEarned / days) * 365;
    return (annualizedFees / liquidityProvided) * 100;
  },

  // Group data by time periods (hourly, daily, weekly)
  groupByTimePeriod: <T extends { timestamp?: string; snapshotAt?: string }>(
    data: T[], 
    period: 'hour' | 'day' | 'week'
  ): T[][] => {
    const groups: { [key: string]: T[] } = {};
    
    data.forEach(item => {
      const timestamp = item.timestamp || item.snapshotAt;
      if (!timestamp) return;
      
      const date = new Date(timestamp);
      let key: string;
      
      switch (period) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        default:
          key = timestamp;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    
    return Object.values(groups);
  }
};