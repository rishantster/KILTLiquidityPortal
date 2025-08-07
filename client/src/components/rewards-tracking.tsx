import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Clock, 
  Lock, 
  Unlock,
  TrendingUp,
  Award,
  CheckCircle,
  Loader2,
  Trophy,
  Coins,
  BarChart3,
  Gift,
  Plus,
  RefreshCw,
  Timer
} from 'lucide-react';
import { useWagmiWallet } from '@/hooks/use-wagmi-wallet';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useUnifiedDashboard } from '@/hooks/use-unified-dashboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useRewardClaiming } from '@/hooks/use-reward-claiming';

import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

// Single Source APR Components
import { useExpectedReturns } from '@/hooks/use-single-source-apr';
import { useRewardTimer } from '@/hooks/use-reward-timer';

function SingleSourceProgramAPR() {
  const { data: expectedReturns, isLoading, error } = useExpectedReturns();

  if (isLoading) return <span className="text-white/50">--</span>;
  if (error) return <span className="text-red-400">Error</span>;
  
  const programAPR = expectedReturns?.incentiveAPR;
  return (
    <span>
      {programAPR ? `${Math.round(parseFloat(programAPR))}%` : '--'}
    </span>
  );
}

interface UserRewardStats {
  totalAccumulated: number;
  totalClaimed: number;
  totalClaimable: number;
  activePositions: number;
  avgDailyRewards: number;
}

interface ProgramAnalytics {
  totalLiquidity: number;
  activeParticipants: number;
  activeUsers: number;
  estimatedAPR: { low: number; average: number; high: number };
  treasuryRemaining: number;
  totalBudget: number;
  programDuration: number;
  programDaysRemaining: number;
  avgUserLiquidity: number;
}

interface ClaimResult {
  success: boolean;
  claimedAmount: number;
  transactionHash?: string;
  transactionData?: {
    to: string;
    amount: number;
    tokenContract: string;
    networkId: number;
    timestamp: string;
  };
  error?: string;
}

export function RewardsTracking() {
  const { address, isConnected } = useWagmiWallet();
  const { data: kiltData } = useKiltTokenData();
  const unifiedData = useUnifiedDashboard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { timeUntilNextReward, isNearNextReward } = useRewardTimer();

  // Get maximum APR data for accurate display (same source as main dashboard)
  const { data: maxAPRData } = useQuery({
    queryKey: ['maxAPR'],
    queryFn: async () => {
      const response = await fetch('/api/rewards/maximum-apr');
      if (!response.ok) throw new Error('Failed to fetch APR data');
      return response.json();
    },
    refetchInterval: 2000, // Ultra-fast refresh every 2 seconds for instant admin changes
    staleTime: 0, // Always consider data stale for immediate updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true // Always refetch on component mount
  });
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);

  // Logo animation timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoAnimationComplete(true);
    }, 1200); // Match the large logo animation duration
    return () => clearTimeout(timer);
  }, []);

  // Use unified dashboard data with error boundary
  const { user, rewardStats, programAnalytics } = unifiedData;

  // Get fresh position count from eligible endpoint with error handling
  const { data: eligibleData } = useQuery({
    queryKey: ['eligible-positions', address],
    queryFn: async () => {
      if (!address) return null;
      try {
        const response = await fetch(`/api/positions/eligible/${address}`);
        if (!response.ok) {
          console.error('Eligible positions fetch failed:', response.status);
          return null;
        }
        return response.json();
      } catch (error) {
        console.error('Eligible positions error:', error);
        return null;
      }
    },
    enabled: !!address,
    staleTime: 0,
    refetchInterval: 3000, // Fast refresh for instant position updates
    refetchOnWindowFocus: true
  });

  // Get user average APR across all positions
  const { data: userAverageAPR } = useQuery({
    queryKey: ['user-average-apr', address],
    queryFn: async () => {
      if (!address) return null;
      const response = await fetch(`/api/rewards/user-average-apr/${address}`);
      return response.json();
    },
    enabled: !!address,
    staleTime: 0, // Force fresh data to show position count fix
    refetchInterval: 5000, // Check every 5 seconds for immediate admin changes
    refetchOnWindowFocus: true // Refetch when window gets focus
  });

  // Get claimability status (smart contract lock check)
  const { data: claimability } = useQuery({
    queryKey: ['claimability', address],
    queryFn: async () => {
      if (!address) return null;
      const response = await fetch(`/api/rewards/claimability/${address}`);
      return response.json();
    },
    enabled: !!address,
    refetchInterval: 60000 // Check every minute
  });

  // Calculate time until rewards become claimable with real-time updates
  const getTimeUntilClaimable = () => {
    if (!claimability?.nextClaimDate) return null;
    
    const nextClaimTime = new Date(claimability.nextClaimDate);
    const now = new Date();
    const timeDiff = nextClaimTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) return 'Available now';
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Update claimability timer more frequently when close
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update timer display
      if (claimability?.nextClaimDate) {
        queryClient.invalidateQueries({ queryKey: ['claimability', address] });
      }
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [claimability?.nextClaimDate, queryClient, address]);

  // Get reward history
  const { data: rewardHistory } = useQuery({
    queryKey: ['reward-history', address],
    queryFn: async () => {
      if (!address) return [];
      const response = await fetch(`/api/rewards/history/${address}`);
      return response.json();
    },
    enabled: !!address,
    refetchInterval: 30000
  });

  // Get blockchain claiming functionality
  const { claimRewards, getUserTokenIds, isClaiming } = useRewardClaiming();

  // Automated claim mutation - handles both reward distribution and claiming via smart contract
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Wallet not connected');
      
      // Use the automated claiming function that handles distribution + claiming
      const result = await claimRewards();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to claim rewards');
      }
      
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Rewards Claimed Successfully!",
        description: `Successfully claimed ${result.claimedAmount} KILT tokens via smart contract`,
      });
      queryClient.invalidateQueries({ queryKey: ['claimability'] });
      queryClient.invalidateQueries({ queryKey: ['reward-history'] });
      queryClient.invalidateQueries({ queryKey: ['reward-stats'] });
    },
    onError: (error) => {
      toast({
        title: "Claim Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const totalClaimableAmount = claimability?.totalClaimable || 0;
  const canClaim = claimability?.canClaim || false;
  const lockExpired = claimability?.lockExpired || false;
  const daysRemaining = claimability?.daysRemaining || 0;
  
  // Check if rewards are calculated but not yet available in smart contract
  const calculatedRewards = rewardStats?.totalClaimable || 0;
  const hasCalculatedRewards = calculatedRewards > 0;
  const smartContractHasRewards = totalClaimableAmount > 0;

  if (!isConnected) {
    return (
      <Card className="cluely-card rounded-lg">
        <CardContent className="p-4 text-center">
          <Lock className="h-6 w-6 text-purple-400 mx-auto mb-2" />
          <h3 className="text-white font-heading text-sm mb-1">Connect Wallet</h3>
          <p className="text-white/60 text-xs">Connect your wallet to view and manage rewards</p>
        </CardContent>
      </Card>
    );
  }

  // Refresh function to reload all data
  const handleRefresh = () => {
    console.log('🚀 Admin change detected - triggering blazing fast cache refresh');
    
    // Invalidate all relevant queries to force fresh data
    queryClient.invalidateQueries({ queryKey: ['reward-stats'] });
    queryClient.invalidateQueries({ queryKey: ['user-average-apr'] });
    queryClient.invalidateQueries({ queryKey: ['program-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['claimability'] });
    queryClient.invalidateQueries({ queryKey: ['reward-history'] });
    queryClient.invalidateQueries({ queryKey: ['kilt-data'] });
    queryClient.invalidateQueries({ queryKey: ['expected-returns'] });
    queryClient.invalidateQueries({ queryKey: ['maximum-apr'] });
    
    // Trigger a complete page reload for the rewards tab
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Stats Header with Refresh Button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-lg font-heading">Reward Statistics</h2>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="bg-black/40 backdrop-blur-sm border border-gray-700 hover:border-purple-500/50 text-white/80 hover:text-white transition-all duration-200"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>
      
      {/* Detailed Reward Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* User Average APR Card */}
        <Card className="bg-black/40 backdrop-blur-sm border border-purple-500/50 rounded-lg cluely-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-super-bright font-medium text-sm">Avg Position APR</h3>
              <BarChart3 className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-lg text-purple-400 font-bold tabular-nums mb-1">
              {userAverageAPR?.averageAPR ? `${userAverageAPR.averageAPR.toFixed(1)}%` : '0.0%'}
            </div>
            <div className="text-xs text-white/60 mb-1">
              {eligibleData?.registeredCount || 0} active positions
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/40 backdrop-blur-xl border border-[#ff0066]/30 rounded-lg cluely-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Total Earned</h3>
              <Award className="h-4 w-4 text-[#ff0066]" />
            </div>
            <div className="text-lg text-white flex items-center gap-2 mb-1 numeric-large">
              {rewardStats?.totalAccumulated?.toFixed(2) || '0.00'}
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className="h-4 w-4"
              />
            </div>
            <div className="text-xs text-white/60 mb-1">
              {eligibleData?.registeredCount || 0} positions
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-[#ff0066] font-medium">
                ≈ ${((rewardStats?.totalAccumulated || 0) * (kiltData?.price || 0)).toFixed(2)} USD
              </div>
              <div className={`text-xs flex items-center gap-1 ${isNearNextReward ? 'text-yellow-400' : 'text-green-400'}`}>
                <Timer className="h-3 w-3" />
                {timeUntilNextReward}
              </div>
            </div>
            <div className="text-xs text-green-400/80 mt-1">
              Rewards accumulate hourly
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg cluely-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Claimable</h3>
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <div className="text-lg font-bold tabular-nums text-white flex items-center gap-2 mb-1">
              0.00
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className="h-4 w-4"
              />
            </div>
            <div className="text-xs text-white/60 mb-1">
              {(rewardStats?.totalAccumulated || 0) > 0
                ? claimability?.canClaim 
                  ? 'Available now'
                  : claimability?.daysRemaining 
                    ? `Available in ${claimability.daysRemaining} days`
                    : 'Checking availability...'
                : 'Start earning rewards'
              }
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-[#ff0066] font-medium">
                {(rewardStats?.totalAccumulated || 0) > 0
                  ? `≈ $${((rewardStats?.totalAccumulated || 0) * (kiltData?.price || 0)).toFixed(2)} USD`
                  : 'Connect positions to earn'
                }
              </div>
              {(rewardStats?.totalAccumulated || 0) > 0 && claimability && (
                <div className="text-xs flex items-center gap-1 text-blue-400">
                  <Clock className="h-3 w-3" />
                  <span className="font-mono">
                    {claimability.canClaim 
                      ? 'Ready now' 
                      : claimability.daysRemaining 
                        ? `${claimability.daysRemaining}d left`
                        : getTimeUntilClaimable() || 'Loading...'
                    }
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg cluely-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Daily Rate</h3>
              <TrendingUp className="h-4 w-4 text-[#ff0066]" />
            </div>
            <div className="text-lg text-white mb-1 numeric-large">
              {rewardStats?.avgDailyRewards?.toFixed(3) || '0.000'}
            </div>
            <div className="text-xs text-white/60 mb-1">
              Per day avg
            </div>
            <div className="text-xs text-[#ff0066] font-medium">
              {((rewardStats?.avgDailyRewards || 0) * 30).toFixed(1)} KILT/month
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg cluely-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Claimed</h3>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-lg text-white mb-1 numeric-large">
              {rewardStats?.totalClaimed?.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-white/60 mb-1">
              Total claimed
            </div>
            <div className="text-xs text-green-400 font-medium">
              {rewardStats?.totalClaimed ? `${(((rewardStats.totalClaimed || 0) / ((rewardStats.totalClaimed || 0) + (rewardStats.totalAccumulated || 0))) * 100).toFixed(1)}% of earned` : '0% of earned'}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Enhanced Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Enhanced Claim Rewards */}
        <Card className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg cluely-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-white font-heading text-sm">
              <Award className="h-4 w-4 text-[#ff0066]" />
              <span>Reward Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <div className="text-center py-3 rounded-lg border border-gray-600/20 bg-black/60">
              <div className="text-white/60 text-xs mb-1 font-medium">
                Status
              </div>
              <div className="text-white text-xl mb-2 flex items-center justify-center gap-2 numeric-large">
                0.00
                <img 
                  src={kiltLogo} 
                  alt="KILT" 
                  className="h-5 w-5"
                />
              </div>
              <div className="text-white/50 text-sm mb-3">
                ≈ $0.00 USD
              </div>
              
              <Button 
                disabled={true}
                className="w-full font-semibold py-3 px-4 rounded-lg text-sm transition-all duration-300 bg-gray-600 text-gray-300 cursor-not-allowed"
              >
                <Clock className="h-4 w-4 mr-2" />
                {(rewardStats?.totalAccumulated || 0) > 0 
                  ? claimability?.canClaim 
                    ? 'Ready to claim'
                    : claimability?.daysRemaining 
                      ? `Available in ${claimability.daysRemaining} days`
                      : 'Checking availability...'
                  : 'Add liquidity to earn rewards'
                }
              </Button>

            </div>
            
            {/* Reward Details */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Lock Period:</span>
                <span className="text-white">Smart contract secured</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Claim Type:</span>
                <span className="text-white">Rolling unlocks</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Network:</span>
                <span className="text-white">Base</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Gas Fee:</span>
                <span className="text-white">~$0.02</span>
              </div>
            </div>
            
            <div className="text-white/60 text-xs text-center mt-2 p-2 bg-white/5 rounded">
              <p className="font-medium">
                {(rewardStats?.totalAccumulated || 0) > 0 
                  ? claimability?.canClaim 
                    ? 'Ready to claim rewards'
                    : 'Rewards locked by 24-hour waiting period'
                  : 'Add liquidity to earn rewards'
                }
              </p>
            </div>
            
            
          </CardContent>
        </Card>

        {/* Enhanced Program Analytics */}
        <Card className="bg-black/20 backdrop-blur-xl border-white/10 rounded-lg cluely-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-white font-heading text-sm">
              <BarChart3 className="h-4 w-4" style={{ color: '#ff0066' }} />
              <span>Program Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 rounded bg-[#000000]" style={{ borderColor: 'rgba(255, 0, 102, 0.2)' }}>
                  <div className="text-xs mb-1" style={{ color: '#ff0066' }}>Total Liquidity</div>
                  <div className="text-sm text-white numeric-display">${programAnalytics?.totalLiquidity?.toLocaleString() || '0'}</div>
                </div>
                <div className="text-center p-2 rounded border border-purple-500/20 bg-[#000000]">
                  <div className="text-purple-400 text-xs mb-1">Active Users</div>
                  <div className="text-sm text-white numeric-display">{programAnalytics?.activeUsers || 0}</div>
                </div>
              </div>
              
              <div className="text-center p-2 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded border border-green-500/30">
                <div className="text-green-400 text-xs mb-1">Program APR</div>
                <div className="text-sm text-green-400 numeric-display font-bold">
                  <SingleSourceProgramAPR />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Avg User Liquidity:</span>
                  <span className="text-white">${programAnalytics?.avgUserLiquidity?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Reward Formula:</span>
                  <span className="text-white">Proportional + Time</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Treasury Status */}
        <Card className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-lg cluely-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-white font-heading text-sm">
              <Building2 className="h-4 w-4 text-[#ff0066]" />
              <span>Treasury Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-3">
              <div className="text-center p-2 rounded border border-[#ff0066]/20 bg-black/60">
                <div className="text-[#ff0066] text-xs mb-1">Program Budget</div>
                <div className="text-sm text-white flex items-center justify-center gap-2 numeric-display">
                  {programAnalytics?.treasuryTotal !== undefined && programAnalytics?.treasuryTotal !== null ? (programAnalytics.treasuryTotal >= 1000000 ? ((programAnalytics.treasuryTotal / 1000000).toFixed(1) + 'M') : ((programAnalytics.treasuryTotal / 1000).toFixed(0) + 'K')) : '...'} <img src={kiltLogo} alt="KILT" className="h-4 w-4" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Remaining:</span>
                  <span className="text-white">{programAnalytics?.treasuryRemaining ? programAnalytics.treasuryRemaining.toLocaleString() : '...'} KILT</span>
                </div>
                <Progress value={programAnalytics?.treasuryTotal ? ((programAnalytics.treasuryTotal - (programAnalytics.treasuryRemaining || 0)) / programAnalytics.treasuryTotal * 100) : 0} className="h-2 rounded-full" />
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Distributed:</span>
                  <span className="text-white">{programAnalytics?.treasuryTotal && programAnalytics?.treasuryRemaining !== undefined ? (programAnalytics.treasuryTotal - programAnalytics.treasuryRemaining).toLocaleString() : '0'} KILT</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Program Duration:</span>
                  <span className="text-white">{programAnalytics?.programDuration || 60} days</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Days Remaining:</span>
                  <span className="text-white">{programAnalytics?.daysRemaining || 57} days</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Treasury Value:</span>
                  <span className="text-white">${((programAnalytics?.treasuryRemaining || 2905600) * (kiltData?.price || 0)).toFixed(0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
