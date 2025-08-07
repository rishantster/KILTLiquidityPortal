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
    <div className="space-y-6">
      {/* Beautiful Large Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Earned - Large Beautiful Card */}
        <Card className="bg-black/40 backdrop-blur-xl border border-[#ff0066]/30 rounded-xl p-6 group relative hover:border-[#ff0066]/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff0066]/20 to-transparent rounded-xl blur-xl transition-all duration-300 group-hover:from-[#ff0066]/30"></div>
          <CardContent className="relative p-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/10 border border-[#ff0066]/30 flex items-center justify-center">
                  <Award className="h-5 w-5 text-[#ff0066]" />
                </div>
                <h3 className="text-white/80 text-lg font-medium">Total Earned</h3>
              </div>
              <div className={`text-xs flex items-center gap-1 ${isNearNextReward ? 'text-yellow-400' : 'text-green-400'}`}>
                <Timer className="h-3 w-3" />
                {timeUntilNextReward}
              </div>
            </div>
            <div className="text-white text-3xl font-bold flex items-center gap-3 mb-2 numeric-large">
              {rewardStats?.totalAccumulated?.toFixed(2) || '0.00'}
              <img src={kiltLogo} alt="KILT" className="h-6 w-6" />
            </div>
            <div className="text-[#ff0066] text-sm font-medium mb-2">
              ≈ ${((rewardStats?.totalAccumulated || 0) * (kiltData?.price || 0)).toFixed(2)} USD
            </div>
            <div className="text-white/60 text-sm">
              From {eligibleData?.registeredCount || 0} active positions
            </div>
            <div className="text-green-400/80 text-xs mt-2">
              Rewards accumulate hourly
            </div>
          </CardContent>
        </Card>

        {/* Claimable Rewards - Large Beautiful Card */}
        <Card className="bg-black/40 backdrop-blur-xl border border-emerald-400/30 rounded-xl p-6 group relative hover:border-emerald-400/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent rounded-xl blur-xl transition-all duration-300 group-hover:from-emerald-400/30"></div>
          <CardContent className="relative p-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400/20 to-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
                  <Unlock className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-white/80 text-lg font-medium">Claimable Now</h3>
              </div>
            </div>
            <div className="text-white text-3xl font-bold flex items-center gap-3 mb-2 numeric-large">
              {claimability?.canClaim 
                ? (rewardStats?.totalAccumulated || 0).toFixed(2)
                : '0.00'}
              <img src={kiltLogo} alt="KILT" className="h-6 w-6" />
            </div>
            <div className="text-emerald-400 text-sm font-medium mb-2">
              {claimability?.canClaim 
                ? `≈ $${((rewardStats?.totalAccumulated || 0) * (kiltData?.price || 0)).toFixed(2)} USD`
                : (rewardStats?.totalAccumulated || 0) > 0
                  ? `≈ $${((rewardStats?.totalAccumulated || 0) * (kiltData?.price || 0)).toFixed(2)} USD locked`
                  : 'Connect positions to earn'
              }
            </div>
            <div className="text-white/60 text-sm">
              {(rewardStats?.totalAccumulated || 0) > 0
                ? claimability?.canClaim 
                  ? 'Available now'
                  : claimability?.daysRemaining 
                    ? `Available in ${claimability.daysRemaining} days`
                    : 'Checking availability...'
                : 'Start earning rewards'
              }
            </div>
            {(rewardStats?.totalAccumulated || 0) > 0 && claimability && (
              <div className="text-xs flex items-center gap-1 text-blue-400 mt-2">
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
          </CardContent>
        </Card>

        {/* Daily Rewards - Large Beautiful Card */}
        <Card className="bg-black/40 backdrop-blur-xl border border-purple-400/30 rounded-xl p-6 group relative hover:border-purple-400/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent rounded-xl blur-xl transition-all duration-300 group-hover:from-purple-400/30"></div>
          <CardContent className="relative p-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400/20 to-purple-400/10 border border-purple-400/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="text-white/80 text-lg font-medium">Daily Rate</h3>
              </div>
            </div>
            <div className="text-white text-3xl font-bold mb-2 numeric-large">
              {rewardStats?.avgDailyRewards?.toFixed(1) || '0.0'}
            </div>
            <div className="text-purple-400 text-sm font-medium mb-2">
              KILT per day average
            </div>
            <div className="text-white/60 text-sm">
              ~{((rewardStats?.avgDailyRewards || 0) * 30).toFixed(0)} KILT/month
            </div>
            <div className="text-purple-400/80 text-xs mt-2">
              Based on active positions
            </div>
          </CardContent>
        </Card>

        {/* Total Claimed - Large Beautiful Card */}
        <Card className="bg-black/40 backdrop-blur-xl border border-green-400/30 rounded-xl p-6 group relative hover:border-green-400/50 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-transparent rounded-xl blur-xl transition-all duration-300 group-hover:from-green-400/30"></div>
          <CardContent className="relative p-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400/20 to-green-400/10 border border-green-400/30 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="text-white/80 text-lg font-medium">Total Claimed</h3>
              </div>
            </div>
            <div className="text-white text-3xl font-bold mb-2 numeric-large">
              {rewardStats?.totalClaimed?.toFixed(1) || '0.0'}
            </div>
            <div className="text-green-400 text-sm font-medium mb-2">
              KILT successfully claimed
            </div>
            <div className="text-white/60 text-sm">
              {rewardStats?.totalClaimed ? `${(((rewardStats.totalClaimed || 0) / ((rewardStats.totalClaimed || 0) + (rewardStats.totalAccumulated || 0))) * 100).toFixed(1)}% of total earned` : '0% of total earned'}
            </div>
            <div className="text-green-400/80 text-xs mt-2">
              Smart contract verified
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Beautiful Claim Action Section */}
      <div className="mt-8">
        <Card className="bg-black/40 backdrop-blur-xl border border-[#ff0066]/30 rounded-2xl p-8 group relative hover:border-[#ff0066]/50 transition-all duration-300 max-w-2xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff0066]/20 to-transparent rounded-2xl blur-xl transition-all duration-300 group-hover:from-[#ff0066]/30"></div>
          <CardContent className="relative p-0">
            <div className="text-center">
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/10 border border-[#ff0066]/30 flex items-center justify-center">
                  <Award className="h-6 w-6 text-[#ff0066]" />
                </div>
                <h3 className="text-white text-2xl font-bold">
                  {(rewardStats?.totalAccumulated || 0) > 0 ? 'Claim Your Rewards' : 'Reward Center'}
                </h3>
              </div>

              <div className="mb-8">
                <div className="text-white/60 text-sm mb-2">
                  {claimability?.canClaim ? 'Available to Claim Now' : 'Current Status'}
                </div>
                <div className="text-white text-4xl font-bold flex items-center justify-center gap-4 mb-4 numeric-large">
                  {claimability?.canClaim 
                    ? (rewardStats?.totalAccumulated || 0).toFixed(2)
                    : (rewardStats?.totalAccumulated || 0).toFixed(2)}
                  <img src={kiltLogo} alt="KILT" className="h-8 w-8" />
                </div>
                <div className="text-[#ff0066] text-lg font-medium mb-4">
                  ≈ ${((rewardStats?.totalAccumulated || 0) * (kiltData?.price || 0)).toFixed(2)} USD
                </div>
              </div>
              
              <Button 
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || isClaiming || !claimability?.canClaim || (rewardStats?.totalAccumulated || 0) <= 0}
                className={`w-full max-w-md mx-auto font-semibold py-6 px-8 rounded-xl text-lg transition-all duration-300 ${
                  claimability?.canClaim && (rewardStats?.totalAccumulated || 0) > 0
                    ? 'bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff1a75] hover:to-[#e60059] text-white shadow-lg hover:shadow-xl shadow-[#ff0066]/20 hover:scale-105' 
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                }`}
              >
                {(claimMutation.isPending || isClaiming) ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    {isClaiming ? 'Processing Transaction...' : 'Claiming Rewards...'}
                  </>
                ) : claimability?.canClaim && (rewardStats?.totalAccumulated || 0) > 0 ? (
                  <>
                    <Award className="h-5 w-5 mr-3" />
                    Claim {(rewardStats?.totalAccumulated || 0).toFixed(2)} KILT
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 mr-3" />
                    {(rewardStats?.totalAccumulated || 0) > 0 
                      ? claimability?.daysRemaining 
                        ? `Available in ${claimability.daysRemaining} days`
                        : 'Checking availability...'
                      : 'Add liquidity to start earning'
                    }
                  </>
                )}
              </Button>

              {/* Status Messages */}
              <div className="mt-6">
                {claimability?.canClaim && (rewardStats?.totalAccumulated || 0) > 0 && (
                  <div className="text-green-400 text-sm text-center p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                    <p className="font-semibold mb-1">🎉 Ready to Claim!</p>
                    <p className="text-green-300/80 text-xs">
                      Smart contract will distribute {(rewardStats?.totalAccumulated || 0).toFixed(2)} KILT to your wallet
                    </p>
                  </div>
                )}
                
                {!claimability?.canClaim && (rewardStats?.totalAccumulated || 0) > 0 && (
                  <div className="text-yellow-400 text-sm text-center p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <p className="font-semibold mb-1">⏳ Rewards Accumulating</p>
                    <p className="text-yellow-300/80 text-xs">
                      24-hour security lock - rewards will be available for claiming soon
                    </p>
                  </div>
                )}
                
                {(rewardStats?.totalAccumulated || 0) === 0 && (
                  <div className="text-blue-400 text-sm text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <p className="font-semibold mb-1">🚀 Start Earning</p>
                    <p className="text-blue-300/80 text-xs">
                      Add liquidity to KILT/ETH pool to begin earning treasury rewards
                    </p>
                  </div>
                )}
              </div>

              {/* Network Info */}
              <div className="grid grid-cols-2 gap-4 mt-6 text-xs text-white/60">
                <div className="text-center">
                  <div className="font-medium">Network</div>
                  <div className="text-white">Base</div>
                </div>
                <div className="text-center">
                  <div className="font-medium">Gas Fee</div>
                  <div className="text-white">~$0.04</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
