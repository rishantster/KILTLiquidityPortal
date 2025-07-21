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
  Plus
} from 'lucide-react';
import { useWalletWagmi } from '@/hooks/use-wallet-wagmi';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useUnifiedDashboard } from '@/hooks/use-unified-dashboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

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
  const { address, isConnected } = useWalletWagmi();
  const { data: kiltData } = useKiltTokenData();
  const unifiedData = useUnifiedDashboard();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get maximum APR data for accurate display (same source as main dashboard)
  const { data: maxAPRData } = useQuery({
    queryKey: ['maxAPR'],
    queryFn: async () => {
      const response = await fetch('/api/rewards/maximum-apr');
      if (!response.ok) throw new Error('Failed to fetch APR data');
      return response.json();
    },
    refetchInterval: 3000, // Blazing fast refresh every 3 seconds for admin changes
    staleTime: 1000, // Consider data stale after 1 second for instant updates
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

  // Use unified dashboard data
  const { user, rewardStats, programAnalytics } = unifiedData;

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

  // Claim rewards mutation (smart contract secured)
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Wallet not connected');
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim rewards');
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({
          title: "Rewards Claimed!",
          description: `Successfully claimed ${result.amount.toFixed(2)} KILT tokens`,
        });
      } else {
        toast({
          title: "Claim Failed",
          description: result.error,
          variant: "destructive"
        });
      }
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

  return (
    <div className="space-y-4">
      {/* Detailed Reward Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-black/40 backdrop-blur-sm border border-matrix-green/50 rounded-lg cluely-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-super-bright font-medium text-sm">Total Earned</h3>
              <Award className="h-4 w-4 text-matrix-green" />
            </div>
            <div className="text-lg text-matrix-bright flex items-center gap-2 mb-1 numeric-large">
              {rewardStats?.totalAccumulated?.toFixed(2) || '0.00'}
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className="h-4 w-4"
              />
            </div>
            <div className="text-xs text-white/60 mb-1">
              {rewardStats?.activePositions || 0} positions
            </div>
            <div className="text-xs text-matrix-green font-medium">
              ≈ ${((rewardStats?.totalAccumulated || 0) * (kiltData?.price || 0)).toFixed(2)} USD
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border border-matrix-green/50 rounded-lg cluely-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-super-bright font-medium text-sm">Claimable</h3>
              <Unlock className="h-4 w-4 text-matrix-green" />
            </div>
            <div className="text-lg font-bold tabular-nums text-matrix-bright flex items-center gap-2 mb-1">
              {totalClaimableAmount.toFixed(2)}
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className="h-4 w-4"
              />
            </div>
            <div className="text-xs text-white/60 mb-1">
              Ready to claim
            </div>
            <div className="text-xs text-matrix-green font-medium">
              ≈ ${(totalClaimableAmount * (kiltData?.price || 0)).toFixed(2)} USD
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg cluely-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Daily Rate</h3>
              <TrendingUp className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-lg text-white mb-1 numeric-large">
              {rewardStats?.avgDailyRewards?.toFixed(3) || '0.000'}
            </div>
            <div className="text-xs text-white/60 mb-1">
              Per day avg
            </div>
            <div className="text-xs text-indigo-400 font-medium">
              {((rewardStats?.avgDailyRewards || 0) * 30).toFixed(1)} KILT/month
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg cluely-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Claimed</h3>
              <CheckCircle className="h-4 w-4 text-violet-400" />
            </div>
            <div className="text-lg text-white mb-1 numeric-large">
              {rewardStats?.totalClaimed?.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-white/60 mb-1">
              Total claimed
            </div>
            <div className="text-xs text-violet-400 font-medium">
              {rewardStats?.totalClaimed ? `${(((rewardStats.totalClaimed || 0) / (rewardStats.totalAccumulated || 1)) * 100).toFixed(1)}% of earned` : '0% of earned'}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Enhanced Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Enhanced Claim Rewards */}
        <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg cluely-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-white font-heading text-sm">
              <Award className="h-4 w-4 text-yellow-400" />
              <span>{(rewardStats?.totalAccumulated || 0) > 0 ? 'Claim Rewards' : 'Reward Status'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <div className="text-center py-3 from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20 bg-[#000000]">
              <div className="text-white/60 text-xs mb-1 font-medium">
                {(rewardStats?.totalAccumulated || 0) > 0 ? 'Available Now' : 'Status'}
              </div>
              <div className="text-white text-xl mb-2 flex items-center justify-center gap-2 numeric-large">
                {totalClaimableAmount.toFixed(2)} 
                <img 
                  src={kiltLogo} 
                  alt="KILT" 
                  className="h-5 w-5"
                />
              </div>
              <div className="text-white/50 text-sm mb-3">
                ≈ ${(totalClaimableAmount * (kiltData?.price || 0)).toFixed(2)} USD
              </div>
              
              <Button 
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || !canClaim}
                className={`w-full font-semibold py-3 px-4 rounded-lg text-sm transition-all duration-300 ${
                  canClaim 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                }`}
              >
                {claimMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : canClaim ? (
                  <>
                    <Award className="h-4 w-4 mr-2" />
                    Claim Rewards
                  </>
                ) : lockExpired ? (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    No Rewards Available
                  </>
                ) : (rewardStats?.totalAccumulated || 0) > 0 ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    {daysRemaining} days remaining
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    No rewards accumulated yet
                  </>
                )}
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
            
            {!canClaim && daysRemaining > 0 && (
              <div className="text-white/60 text-xs text-center mt-2 p-2 rounded bg-[#000000]" style={{ borderColor: 'rgba(255, 0, 102, 0.2)' }}>
                <p className="font-medium">Claim available in {daysRemaining} days</p>
                <p className="text-white/40">You'll be able to claim all accumulated rewards at once</p>
              </div>
            )}
            
            {totalClaimableAmount === 0 && lockExpired && (
              <div className="text-white/60 text-xs text-center mt-2 p-2 bg-white/5 rounded">
                <p className="font-medium">Add liquidity to earn rewards</p>
              </div>
            )}
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
                  <div className="text-sm text-white numeric-display">{programAnalytics?.activeParticipants || 0}</div>
                </div>
              </div>
              
              <div className="text-center p-2 bg-matrix-green-glow rounded border border-matrix-green">
                <div className="text-matrix-green text-xs mb-1">Program APR</div>
                <div className="text-sm text-matrix-green numeric-display">{maxAPRData?.maxAPR || 48}%</div>
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
        <Card className="bg-black/20 backdrop-blur-xl border-white/10 rounded-lg cluely-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-white font-heading text-sm">
              <Building2 className="h-4 w-4 text-purple-400" />
              <span>Treasury Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-3">
              <div className="text-center p-2 rounded border border-purple-500/20 bg-[#000000]">
                <div className="text-purple-400 text-xs mb-1">Program Budget</div>
                <div className="text-sm text-white flex items-center justify-center gap-2 numeric-display">
                  {programAnalytics?.totalBudget !== undefined && programAnalytics?.totalBudget !== null ? (programAnalytics.totalBudget >= 1000000 ? ((programAnalytics.totalBudget / 1000000).toFixed(1) + 'M') : ((programAnalytics.totalBudget / 1000).toFixed(0) + 'K')) : '...'} <img src={kiltLogo} alt="KILT" className="h-4 w-4" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Remaining:</span>
                  <span className="text-white">{programAnalytics?.treasuryRemaining ? programAnalytics.treasuryRemaining.toLocaleString() : '...'} KILT</span>
                </div>
                <Progress value={programAnalytics?.totalBudget ? ((programAnalytics.totalBudget - (programAnalytics.treasuryRemaining || 0)) / programAnalytics.totalBudget * 100) : 0} className="h-2 rounded-full bg-[#ffc4c4]" />
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Distributed:</span>
                  <span className="text-white">{programAnalytics?.totalBudget ? (programAnalytics.totalBudget - (programAnalytics.treasuryRemaining || 0)).toLocaleString() : '...'} KILT</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Program Duration:</span>
                  <span className="text-white">{programAnalytics?.programDuration || 365} days</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Days Remaining:</span>
                  <span className="text-white">{programAnalytics?.programDaysRemaining || 365} days</span>
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
