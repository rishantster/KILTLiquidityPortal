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
  Gift
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
    <div className="space-y-2">
      {/* Ultra Compact Reward Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="bg-yellow-500/5 border-yellow-500/20 rounded-lg">
          <CardContent className="p-2">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-white font-medium text-xs">Total Earned</h3>
              <Award className="h-3 w-3 text-yellow-400" />
            </div>
            <div className="text-sm font-bold tabular-nums text-white flex items-center gap-1">
              {rewardStats?.totalAccumulated?.toFixed(2) || '0.00'}
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className="h-3 w-3"
              />
            </div>
            <div className="text-xs text-white/60">
              {rewardStats?.activePositions || 0} positions
            </div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20 rounded-lg">
          <CardContent className="p-2">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-white font-medium text-xs">Claimable</h3>
              <Unlock className="h-3 w-3 text-emerald-400" />
            </div>
            <div className="text-sm font-bold tabular-nums text-white flex items-center gap-1">
              {totalClaimableAmount.toFixed(2)}
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className="h-3 w-3"
              />
            </div>
            <div className="text-xs text-white/60">
              Ready to claim
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20 rounded-lg">
          <CardContent className="p-2">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-white font-medium text-xs">Daily Rate</h3>
              <TrendingUp className="h-3 w-3 text-blue-400" />
            </div>
            <div className="text-sm font-bold tabular-nums text-white">
              {rewardStats?.avgDailyRewards?.toFixed(3) || '0.000'}
            </div>
            <div className="text-xs text-white/60">
              Per day avg
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/5 border-purple-500/20 rounded-lg">
          <CardContent className="p-2">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="text-white font-medium text-xs">Claimed</h3>
              <CheckCircle className="h-3 w-3 text-purple-400" />
            </div>
            <div className="text-sm font-bold tabular-nums text-white">
              {rewardStats?.totalClaimed?.toFixed(2) || '0.00'}
            </div>
            <div className="text-xs text-white/60">
              Total claimed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ultra Compact Action Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Ultra Compact Claim Rewards */}
        <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20 rounded-lg">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center space-x-1 text-white font-heading text-xs">
              <Award className="h-3 w-3 text-yellow-400" />
              <span>Claim</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-2">
            {/* Ultra Compact Claimable Amount */}
            <div className="text-center py-2 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
              <div className="text-white/60 text-xs mb-0.5 font-medium">Available</div>
              <div className="text-white text-sm font-bold tabular-nums mb-0.5 flex items-center justify-center gap-1">
                {totalClaimableAmount.toFixed(2)} 
                <img 
                  src={kiltLogo} 
                  alt="KILT" 
                  className="h-3 w-3"
                />
              </div>
              <div className="text-white/50 text-xs mb-1">
                ≈ ${(totalClaimableAmount * kiltData.price).toFixed(2)} USD
              </div>
              
              <Button 
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending || totalClaimableAmount === 0}
                className={`w-full font-semibold py-2 px-3 rounded-lg text-xs transition-all duration-300 ${
                  totalClaimableAmount > 0 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-gray-600 text-gray-300 cursor-not-allowed'
                }`}
              >
                {claimMutation.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
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
                <div className="text-white/60 text-xs text-center mt-1 p-1 bg-white/5 rounded">
                  <p className="font-medium">Add liquidity to earn rewards</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ultra Compact Program Analytics */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 rounded-lg">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center space-x-1 text-white font-heading text-xs">
              <BarChart3 className="h-3 w-3 text-blue-400" />
              <span>Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid grid-cols-2 gap-1 mb-2">
              <div className="text-center p-1 bg-blue-500/10 rounded border border-blue-500/20">
                <div className="text-blue-400 text-xs">TVL</div>
                <div className="text-xs font-bold text-white">${programAnalytics?.totalLiquidity?.toLocaleString() || '0'}</div>
              </div>
              <div className="text-center p-1 bg-purple-500/10 rounded border border-purple-500/20">
                <div className="text-purple-400 text-xs">Users</div>
                <div className="text-xs font-bold text-white">{programAnalytics?.activeParticipants || 0}</div>
              </div>
            </div>
            <div className="text-center p-1 bg-emerald-500/10 rounded border border-emerald-500/20">
              <div className="text-emerald-400 text-xs">APR Range</div>
              <div className="text-xs font-bold text-emerald-100">{programAnalytics?.estimatedAPR?.low || 5}% - {programAnalytics?.estimatedAPR?.high || 50}%</div>
            </div>
          </CardContent>
        </Card>

        {/* Ultra Compact Treasury Status */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 rounded-lg">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center space-x-1 text-white font-heading text-xs">
              <Building2 className="h-3 w-3 text-purple-400" />
              <span>Treasury</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="text-center p-1 bg-purple-500/10 rounded border border-purple-500/20 mb-1">
              <div className="text-purple-400 text-xs">Allocation</div>
              <div className="text-xs font-bold text-white flex items-center justify-center gap-1">
                2.9M <img src={kiltLogo} alt="KILT" className="h-3 w-3" />
              </div>
            </div>
            <Progress value={((2905600 - (programAnalytics?.treasuryRemaining || 2905600)) / 2905600) * 100} className="h-1 rounded-full mb-1" />
            <div className="text-center text-xs text-white/60">
              {programAnalytics?.daysRemaining || 365} days remaining
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
