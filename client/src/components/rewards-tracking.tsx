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
  Loader2
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
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
  const { address, isConnected } = useWallet();
  const { data: kiltData } = useKiltTokenData();
  const unifiedData = useUnifiedDashboard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Get claimable rewards
  const { data: claimableRewards } = useQuery({
    queryKey: ['claimable-rewards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetch(`/api/rewards/user/${user.id}/claimable`);
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  // Claim rewards mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !address) throw new Error('User not found or wallet not connected');
      const response = await fetch(`/api/rewards/claim/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim rewards');
      }
      
      return response.json() as Promise<ClaimResult>;
    },
    onSuccess: (result) => {
      toast({
        title: "Rewards Claimed!",
        description: `Successfully claimed ${result.claimedAmount.toFixed(2)} KILT tokens`,
      });
      queryClient.invalidateQueries({ queryKey: ['reward-stats'] });
      queryClient.invalidateQueries({ queryKey: ['claimable-rewards'] });
    },
    onError: (error) => {
      toast({
        title: "Claim Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const totalClaimableAmount = Array.isArray(claimableRewards) ? claimableRewards.reduce((total: number, reward: any) => {
    const accumulated = Number(reward.accumulatedAmount);
    const claimed = Number(reward.claimedAmount || 0);
    return total + (accumulated - claimed);
  }, 0) : 0;

  if (!isConnected) {
    return (
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-12 text-center">
          <Lock className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-white font-heading text-xl mb-2">Connect Wallet</h3>
          <p className="text-white/60">Connect your wallet to view and manage rewards</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reward Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cluely-card rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Total Earned</h3>
              <Award className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {rewardStats?.totalAccumulated?.toFixed(2) || '0.00'} KILT
            </div>
            <div className="text-sm text-white/60 mt-1 font-medium">
              From {rewardStats?.activePositions || 0} positions
            </div>
          </CardContent>
        </Card>

        <Card className="cluely-card rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Claimable</h3>
              <Unlock className="h-5 w-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {totalClaimableAmount.toFixed(2)} KILT
            </div>
            <div className="text-sm text-white/60 mt-1 font-medium">
              Ready to claim
            </div>
          </CardContent>
        </Card>

        <Card className="cluely-card rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Daily Rate</h3>
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {rewardStats?.avgDailyRewards?.toFixed(3) || '0.000'} KILT
            </div>
            <div className="text-sm text-white/60 mt-1 font-medium">
              Average per day
            </div>
          </CardContent>
        </Card>

        <Card className="cluely-card rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Claimed</h3>
              <CheckCircle className="h-5 w-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold tabular-nums text-white">
              {rewardStats?.totalClaimed?.toFixed(2) || '0.00'} KILT
            </div>
            <div className="text-sm text-white/60 mt-1 font-medium">
              Total claimed
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Claim Rewards */}
        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-white font-semibold">
              <Award className="h-5 w-5 text-yellow-400" />
              <span>Claim Rewards</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Claimable Amount */}
            <div className="text-center p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
              <div className="text-white/60 text-sm mb-2 font-medium">Available to Claim</div>
              <div className="text-white text-3xl font-bold tabular-nums mb-4 flex items-center justify-center gap-2">
                {totalClaimableAmount.toFixed(2)} 
                <div className="logo-container flex items-center">
                  <img 
                    src={kiltLogo} 
                    alt="KILT" 
                    className={`h-6 w-6 logo-hover ${!logoAnimationComplete ? 'logo-reveal-large-enhanced' : 'logo-float logo-glow'}`}
                  />
                </div>
                <span>KILT</span>
              </div>
              
              <Button 
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || totalClaimableAmount === 0}
                className={`w-full font-semibold py-2 px-4 rounded-lg transition-all duration-200 ${
                  totalClaimableAmount > 0 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white' 
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                }`}
              >
                {claimMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Claiming...
                  </>
                ) : totalClaimableAmount > 0 ? (
                  <>
                    <Award className="h-4 w-4 mr-2" />
                    Claim Rewards
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    No Rewards Available
                  </>
                )}
              </Button>
              
              {totalClaimableAmount === 0 && (
                <div className="text-white/60 text-xs text-center mt-2">
                  <p className="mb-1">Add liquidity to start earning rewards</p>
                  <p className="text-white/40">
                    Rewards accumulate daily based on your liquidity contribution
                  </p>
                </div>
              )}
            </div>

            {/* Important Notes */}
            <div className="space-y-3">
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-white/70">
                    <strong>90-Day Lock:</strong> Rewards can only be claimed after 90 days from the date you added liquidity to the pool. However, you earn rewards daily as long as your position remains active.
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-white/70">
                    <strong>In-Range Requirement:</strong> Only positions that are actively in-range earn full rewards. Out-of-range positions earn 0% rewards since they don't provide liquidity to traders.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bonding Curve Analytics */}
        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <span>Program Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Total Liquidity</span>
                  <span className="text-white font-bold tabular-nums">
                    ${programAnalytics?.totalLiquidity?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Active Users</span>
                  <span className="text-white font-bold tabular-nums">
                    {programAnalytics?.activeParticipants || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Average APR</span>
                  <span className="text-white font-bold tabular-nums">
                    {programAnalytics?.estimatedAPR?.average?.toFixed(1) || '15.0'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">APR Range</span>
                  <span className="text-white font-bold tabular-nums">
                    {programAnalytics?.estimatedAPR?.low || 5}% - {programAnalytics?.estimatedAPR?.high || 50}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Daily Budget</span>
                  <span className="text-white font-bold tabular-nums">
                    7,960 KILT
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-white/70">
                    <strong>Proportional Rewards:</strong> All participants earn rewards proportional to their liquidity contribution and time-in-range performance. 
                    Currently {programAnalytics?.activeParticipants || 0} total active participants.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Treasury Status */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <Building2 className="h-5 w-5 text-purple-400" />
            <span>Treasury Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/60">Total Allocation</span>
                <span className="text-white font-bold tabular-nums flex items-center gap-1">
                  2,905,600 
                  <img src={kiltLogo} alt="KILT" className="w-3 h-3" />
                  <span>KILT</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Remaining</span>
                <span className="text-white font-bold tabular-nums flex items-center gap-1">
                  {programAnalytics?.treasuryRemaining?.toLocaleString() || '2,905,600'} 
                  <img src={kiltLogo} alt="KILT" className="w-3 h-3" />
                  <span>KILT</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Days Remaining</span>
                <span className="text-white font-bold tabular-nums">
                  {programAnalytics?.daysRemaining || 365} days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Lock Period</span>
                <span className="text-white font-bold tabular-nums">90 days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">KILT Price</span>
                <span className="text-white font-bold tabular-nums">${kiltData?.price.toFixed(4) || '0.0289'}</span>
              </div>
            </div>

            <Progress value={((2905600 - (programAnalytics?.treasuryRemaining || 2905600)) / 2905600) * 100} className="h-2" />
            <div className="text-xs text-white/60 text-center">
              {(((2905600 - (programAnalytics?.treasuryRemaining || 2905600)) / 2905600) * 100).toFixed(1)}% of treasury allocated
            </div>

            {/* Reward Features */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-heading text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span>Reward Features</span>
              </div>
              
              <div className="space-y-2 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                  <span>Daily reward accumulation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                  <span>Proportional rewards for all participants</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  <span>Sustainable rewards for 365 days</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  <span className="flex items-center gap-1">
                    Automatic 
                    <img src={kiltLogo} alt="KILT" className="w-3 h-3" />
                    <span>KILT token distribution</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}