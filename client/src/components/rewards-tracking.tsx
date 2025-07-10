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
  BarChart3
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
    <div className="space-y-4">
      {/* Compact Reward Overview */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-yellow-500/5 border-yellow-500/20 rounded-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Total Earned</h3>
              <Award className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-lg font-bold tabular-nums text-white flex items-center gap-2">
              {rewardStats?.totalAccumulated?.toFixed(2) || '0.00'}
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className="h-4 w-4"
              />
            </div>
            <div className="text-xs text-white/60 mt-1">
              {rewardStats?.activePositions || 0} positions
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20 rounded-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Claimable</h3>
              <Unlock className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold tabular-nums text-white flex items-center gap-2">
              {totalClaimableAmount.toFixed(2)}
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className="h-4 w-4"
              />
            </div>
            <div className="text-xs text-white/60 mt-1">
              Ready to claim
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20 rounded-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Daily Rate</h3>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold tabular-nums text-white">
              {rewardStats?.avgDailyRewards?.toFixed(3) || '0.000'}
            </div>
            <div className="text-xs text-white/60 mt-1">
              Per day average
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/5 border-purple-500/20 rounded-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">Claimed</h3>
              <CheckCircle className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-lg font-bold tabular-nums text-white">
              {rewardStats?.totalClaimed?.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-white/60 mt-1">
              Total claimed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2-Column Action Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column: Claim Rewards */}
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20 rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-white font-heading text-base">
              <Award className="h-4 w-4 text-yellow-400" />
              <span>Claim Rewards</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {/* Claimable Amount Display */}
            <div className="text-center py-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
              <div className="text-white/60 text-sm mb-2 font-medium">Available to Claim</div>
              <div className="text-white text-2xl font-bold tabular-nums mb-2 flex items-center justify-center gap-3">
                {totalClaimableAmount.toFixed(2)} 
                <img 
                  src={kiltLogo} 
                  alt="KILT" 
                  className={`h-6 w-6 logo-hover ${!logoAnimationComplete ? 'logo-reveal-large-enhanced' : 'logo-float logo-glow'}`}
                />
              </div>
              <div className="text-white/50 text-sm mb-4">
                ≈ ${(totalClaimableAmount * kiltData.price).toFixed(2)} USD
              </div>
              
              <Button 
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || totalClaimableAmount === 0}
                className={`w-full font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-300 ${
                  totalClaimableAmount > 0 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl' 
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
                <div className="text-white/60 text-sm text-center mt-3 p-3 bg-white/5 rounded-lg">
                  <p className="mb-1 font-medium">Add liquidity to start earning rewards</p>
                  <p className="text-white/40 text-xs">
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
                  <div className="text-sm text-white/70">
                    <strong className="text-blue-300">90-Day Lock:</strong> Rewards claimable after 90 days from liquidity addition.
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-white/70">
                    <strong className="text-green-300">In-Range Requirement:</strong> Only in-range positions earn full rewards.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Personal APR + Program Analytics */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-gray-500/10 to-emerald-500/10 border-gray-500/20 rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white font-heading text-base">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span>Personal APR</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <UserPersonalAPR />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 rounded-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white font-heading text-base">
                <BarChart3 className="h-4 w-4 text-blue-400" />
                <span>Program Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="text-blue-400 text-xs mb-1 font-medium">Total Liquidity</div>
                    <div className="text-lg font-bold tabular-nums text-white">
                      ${programAnalytics?.totalLiquidity?.toLocaleString() || '0'}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="text-purple-400 text-xs mb-1 font-medium">Active Users</div>
                    <div className="text-lg font-bold tabular-nums text-white">
                      {programAnalytics?.activeParticipants || 0}
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="text-emerald-400 text-xs mb-1 font-medium">Average APR</div>
                  <div className="text-lg font-bold tabular-nums text-emerald-100">
                    {programAnalytics?.estimatedAPR?.average?.toFixed(1) || '15.0'}%
                  </div>
                </div>
                
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="h-3 w-3 text-yellow-400" />
                    <span className="text-yellow-400 font-medium text-xs">Daily Budget</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold tabular-nums text-yellow-100">7,960</div>
                    <img 
                      src={kiltLogo} 
                      alt="KILT" 
                      className="h-4 w-4"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Treasury Status */}
      <Card className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-red-500/10 border-purple-500/20 rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
          <CardTitle className="flex items-center space-x-3 text-white font-heading text-2xl">
            <Building2 className="h-7 w-7 text-purple-400" />
            <span>Treasury Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          {/* Main Treasury Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 bg-purple-500/10 rounded-2xl border border-purple-500/20">
              <div className="text-purple-400 text-base mb-3 font-medium">Total Allocation</div>
              <div className="text-3xl font-bold tabular-nums text-white flex items-center justify-center gap-3">
                2,905,600 
                <img src={kiltLogo} alt="KILT" className="h-8 w-8" />
              </div>
              <div className="text-purple-200/70 text-sm mt-2">
                ≈ ${(2905600 * kiltData.price).toFixed(0)} USD
              </div>
            </div>
            
            <div className="text-center p-6 bg-pink-500/10 rounded-2xl border border-pink-500/20">
              <div className="text-pink-400 text-base mb-3 font-medium">Remaining</div>
              <div className="text-3xl font-bold tabular-nums text-white flex items-center justify-center gap-3">
                {programAnalytics?.treasuryRemaining?.toLocaleString() || '2,905,600'} 
                <img src={kiltLogo} alt="KILT" className="h-8 w-8" />
              </div>
              <div className="text-pink-200/70 text-sm mt-2">
                {programAnalytics?.daysRemaining || 365} days remaining
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-4">
            <Progress value={((2905600 - (programAnalytics?.treasuryRemaining || 2905600)) / 2905600) * 100} className="h-4 rounded-full" />
            <div className="text-center">
              <div className="text-white font-bold text-lg">
                {(((2905600 - (programAnalytics?.treasuryRemaining || 2905600)) / 2905600) * 100).toFixed(1)}% allocated
              </div>
              <div className="text-white/60 text-sm">
                90-day lock period • ${kiltData?.price.toFixed(4) || '0.0289'} per KILT
              </div>
            </div>
          </div>

          {/* Enhanced Reward Features */}
          <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-6 w-6 text-purple-400" />
              <span className="text-purple-400 font-semibold text-lg">Reward Features</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="text-white/80 text-sm">Daily reward accumulation</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className="text-white/80 text-sm">Proportional rewards for all participants</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span className="text-white/80 text-sm">Sustainable rewards for 365 days</span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                <span className="flex items-center gap-2 text-white/80 text-sm">
                  Automatic 
                  <img src={kiltLogo} alt="KILT" className="w-4 h-4" />
                  KILT distribution
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}