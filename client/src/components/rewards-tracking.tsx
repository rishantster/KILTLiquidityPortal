import { useState } from 'react';
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

interface Top100Analytics {
  totalLiquidity: number;
  activeParticipants: number;
  top100Participants: number;
  estimatedAPR: { rank1: number; rank50: number; rank100: number };
  treasuryRemaining: number;
  daysRemaining: number;
  dailyDistribution: number;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user from address
  const { data: user } = useQuery({
    queryKey: ['user', address],
    queryFn: async () => {
      if (!address) return null;
      const response = await fetch(`/api/users/${address}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!address && isConnected
  });

  // Get user reward statistics
  const { data: rewardStats } = useQuery<UserRewardStats>({
    queryKey: ['reward-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/rewards/user/${user.id}/stats`);
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  // Get Top 100 ranking analytics
  const { data: top100Analytics } = useQuery({
    queryKey: ['top100-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/rewards/top100-analytics');
      if (!response.ok) throw new Error('Failed to fetch Top 100 analytics');
      return response.json();
    },
    refetchInterval: 30000
  });

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

  const totalClaimableAmount = claimableRewards?.reduce((total: number, reward: any) => {
    const accumulated = Number(reward.accumulatedAmount);
    const claimed = Number(reward.claimedAmount || 0);
    return total + (accumulated - claimed);
  }, 0) || 0;

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
              {rewardStats?.totalAccumulated.toFixed(2) || '0.00'} KILT
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
              {rewardStats?.avgDailyRewards.toFixed(3) || '0.000'} KILT
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
              {rewardStats?.totalClaimed.toFixed(2) || '0.00'} KILT
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
                <img src={kiltLogo} alt="KILT" className="h-[0.8em] w-auto inline-block" />
                <span>KILT</span>
              </div>
              
              {totalClaimableAmount > 0 ? (
                <Button 
                  onClick={() => claimMutation.mutate()}
                  disabled={claimMutation.isPending}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg transition-all duration-200"
                >
                  {claimMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 mr-2" />
                      Claim Rewards
                    </>
                  )}
                </Button>
              ) : (
                <div className="text-white/60 text-sm">
                  No rewards available to claim yet
                </div>
              )}
            </div>

            {/* Important Notes */}
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-white/70">
                  <strong>90-Day Lock:</strong> Rewards can only be claimed after 90 days from the date you added liquidity to the pool. However, you earn rewards daily as long as your position remains active.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bonding Curve Analytics */}
        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <span>Bonding Curve Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Total Liquidity</span>
                  <span className="text-white font-bold tabular-nums">
                    ${top100Analytics?.totalLiquidity?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Active Users</span>
                  <span className="text-white font-bold tabular-nums">
                    {top100Analytics?.activeParticipants || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Max APR (Rank 1)</span>
                  <span className="text-white font-bold tabular-nums">
                    {top100Analytics?.estimatedAPR?.rank1?.toFixed(1) || '0.0'}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Slots Filled</span>
                  <span className="text-white font-bold tabular-nums">
                    {top100Analytics?.top100Participants || 0}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Daily Budget</span>
                  <span className="text-white font-bold tabular-nums">
                    {top100Analytics?.dailyDistribution?.toLocaleString() || '7,960'} KILT
                  </span>
                </div>
              </div>

              <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-white/70">
                    <strong>Top 100 Ranking:</strong> Only the top 100 participants by liquidity value earn rewards, with APR decreasing by rank (1-100). 
                    Currently {top100Analytics?.top100Participants || 0} out of 100 slots filled with {top100Analytics?.activeParticipants || 0} total active participants.
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
                <span className="text-white font-bold tabular-nums">
                  {top100Analytics?.treasuryRemaining?.toLocaleString() || '2,905,600'} 
                  <img src={kiltLogo} alt="KILT" className="w-3 h-3 inline-block mx-1" />
                  <span>KILT</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Days Remaining</span>
                <span className="text-white font-bold tabular-nums">
                  {top100Analytics?.daysRemaining || 365} days
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

            <Progress value={30} className="h-2" />
            <div className="text-xs text-white/60 text-center">
              30% of treasury allocated
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
                  <span>Top 100 ranking system with tier-based APR</span>
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