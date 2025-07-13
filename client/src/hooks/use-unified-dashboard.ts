import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/contexts/wallet-context';
import { useUniswapV3 } from './use-uniswap-v3';
import { useKiltTokenData } from './use-kilt-data';

/**
 * Unified dashboard hook that provides interconnected data across all components
 * This ensures Overview, Analytics, Rewards, and Positions all share the same data sources
 */
export function useUnifiedDashboard() {
  const { address, isConnected } = useWallet();
  const { kiltEthPositions, poolData, kiltBalance, wethBalance, isLoading: uniswapLoading } = useUniswapV3();
  const { data: kiltData } = useKiltTokenData();

  // Get or create user record
  const { data: user } = useQuery({
    queryKey: ['user', address],
    queryFn: async () => {
      if (!address) return null;
      
      // Try to get existing user
      const getUserResponse = await fetch(`/api/users/${address}`);
      if (getUserResponse.ok) {
        return getUserResponse.json();
      }
      
      // Create new user if doesn't exist
      const createUserResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      if (createUserResponse.ok) {
        return createUserResponse.json();
      }
      
      return null;
    },
    enabled: !!address && isConnected
  });

  // Get user's reward statistics with proper error handling
  const { data: rewardStats } = useQuery({
    queryKey: ['rewardStats', user?.id],
    queryFn: async () => {
      if (!user?.id) return {
        totalAccumulated: 0,
        totalClaimed: 0,
        totalClaimable: 0,
        activePositions: 0,
        avgDailyRewards: 0
      };
      
      try {
        const response = await fetch(`/api/rewards/user/${user.id}/stats`);
        if (!response.ok) {
          return {
            totalAccumulated: 0,
            totalClaimed: 0,
            totalClaimable: 0,
            activePositions: 0,
            avgDailyRewards: 0
          };
        }
        return response.json();
      } catch (error) {
        return {
          totalAccumulated: 0,
          totalClaimed: 0,
          totalClaimable: 0,
          activePositions: 0,
          avgDailyRewards: 0
        };
      }
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  // Get user's personal APR
  const { data: personalAPR } = useQuery({
    queryKey: ['personalAPR', address],
    queryFn: async () => {
      if (!address) return { effectiveAPR: 0, rank: null, totalParticipants: 100 };
      const response = await fetch(`/api/rewards/user-apr/${address}`);
      if (!response.ok) return { effectiveAPR: 0, rank: null, totalParticipants: 100 };
      return response.json();
    },
    enabled: !!address && isConnected
  });

  // Get maximum APR data for realistic range
  const { data: maxAPRData } = useQuery({
    queryKey: ['maxAPR'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/rewards/maximum-apr');
        if (!response.ok) {
          return { minAPR: 29, maxAPR: 47, aprRange: "29% - 47%" };
        }
        return response.json();
      } catch (error) {
        return { minAPR: 29, maxAPR: 47, aprRange: "29% - 47%" };
      }
    },
    enabled: !!address && isConnected,
    refetchInterval: 60000,
    staleTime: 30000
  });

  // Get program analytics with proper error handling
  const { data: programAnalytics } = useQuery({
    queryKey: ['programAnalytics'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/rewards/program-analytics');
        if (!response.ok) {
          return {
            totalLiquidity: 0,
            activeParticipants: 0,
            estimatedAPR: { 
              low: maxAPRData?.minAPR || 29, 
              average: Math.round(((maxAPRData?.minAPR || 29) + (maxAPRData?.maxAPR || 47)) / 2),
              high: maxAPRData?.maxAPR || 47 
            },
            treasuryRemaining: 2905600,
            avgUserLiquidity: 0
          };
        }
        const data = await response.json();
        // Enhance data with realistic APR range
        return {
          ...data,
          estimatedAPR: {
            low: maxAPRData?.minAPR || 29,
            average: Math.round(((maxAPRData?.minAPR || 29) + (maxAPRData?.maxAPR || 47)) / 2),
            high: maxAPRData?.maxAPR || 47
          }
        };
      } catch (error) {
        return {
          totalLiquidity: 0,
          activeParticipants: 0,
          estimatedAPR: { 
            low: maxAPRData?.minAPR || 29, 
            average: Math.round(((maxAPRData?.minAPR || 29) + (maxAPRData?.maxAPR || 47)) / 2),
            high: maxAPRData?.maxAPR || 47 
          },
          treasuryRemaining: 2905600,
          avgUserLiquidity: 0
        };
      }
    },
    enabled: !!address && isConnected && !!maxAPRData,
    refetchInterval: 60000, // Reduce frequency to improve performance
    staleTime: 30000 // Cache for 30 seconds
  });

  // Get user analytics dashboard
  const { data: userAnalytics } = useQuery({
    queryKey: ['userAnalytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/analytics/user/${user.id}/dashboard`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!user?.id
  });



  // Calculate position values using consistent methodology
  const calculatePositionValue = (position: any) => {
    if (!position || !kiltData?.price) return 0;
    
    // Consistent position value calculation
    const kiltAmount = parseFloat(position.amount0 || '0');
    const ethAmount = parseFloat(position.amount1 || '0');
    const ethPrice = 2500; // Approximate ETH price
    
    return kiltAmount * kiltData.price + ethAmount * ethPrice;
  };

  // Enhanced position data with calculated values
  const enhancedPositions = kiltEthPositions?.map(position => ({
    ...position,
    valueUSD: calculatePositionValue(position),
    isKiltEth: true
  })) || [];

  // Calculate total portfolio value
  const totalPortfolioValue = enhancedPositions.reduce((sum, pos) => sum + pos.valueUSD, 0);

  // Calculate wallet balance values
  const walletBalanceValue = (() => {
    if (!kiltBalance || !wethBalance || !kiltData?.price) return 0;
    
    const kiltValue = parseFloat(kiltBalance.toString()) / (10**18) * kiltData.price;
    const ethValue = parseFloat(wethBalance.toString()) / (10**18) * 2500;
    
    return kiltValue + ethValue;
  })();

  return {
    // Core data
    user,
    kiltData,
    poolData,
    enhancedPositions,
    
    // Wallet data
    address,
    isConnected,
    kiltBalance,
    wethBalance,
    walletBalanceValue,
    
    // Reward data
    rewardStats,
    personalAPR,
    programAnalytics,
    maxAPRData,
    
    // Analytics data
    userAnalytics,
    
    // Calculated values
    totalPortfolioValue,
    calculatePositionValue,
    
    // Loading states
    isLoading: uniswapLoading || !user,
    
    // Helper functions
    formatTokenAmount: (amount: bigint | string | number) => {
      if (typeof amount === 'bigint') {
        return (parseFloat(amount.toString()) / (10**18)).toFixed(6);
      }
      return parseFloat(amount.toString()).toFixed(6);
    }
  };
}