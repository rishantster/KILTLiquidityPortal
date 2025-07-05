import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { useUserPositions, useUserRewards } from '@/hooks/use-pool-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, Gift, Award } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

export function UserPositions() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: [`/api/users/${address}`],
    enabled: !!address,
  });

  const { data: positions, isLoading: positionsLoading } = useUserPositions(userData?.id);
  const { data: rewards, isLoading: rewardsLoading } = useUserRewards(userData?.id);

  const claimRewardsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/rewards/claim/${userData.id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rewards Claimed",
        description: "Your rewards have been successfully claimed.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/rewards/user/${userData.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim rewards",
        variant: "destructive",
      });
    },
  });

  if (!isConnected) {
    return (
      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-8 text-center">
          <p className="text-slate-400">Connect your wallet to view your positions</p>
        </CardContent>
      </Card>
    );
  }

  if (positionsLoading || rewardsLoading) {
    return (
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-kilt-500" />
            <span>Your LP Positions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-slate-600 rounded-lg p-4">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const unclaimedRewards = rewards?.filter(r => !r.claimedAt) || [];
  const totalUnclaimed = unclaimedRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  return (
    <Card className="bg-slate-700 border-slate-600">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-kilt-500" />
            <span>Your LP Positions</span>
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <span>Total Positions:</span>
            <span className="text-white font-semibold">{positions?.length || 0}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!positions || positions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No LP positions found</p>
            <p className="text-slate-500 text-sm">Add liquidity to get started</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {positions.map((position) => {
                const tokenIds = JSON.parse(position.tokenIds);
                const positionRewards = rewards?.filter(r => r.positionId === position.id && !r.claimedAt) || [];
                const positionRewardAmount = positionRewards.reduce((sum, r) => sum + parseFloat(r.amount), 0);
                const daysStaked = Math.floor((Date.now() - new Date(position.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={position.id} className="bg-slate-600 rounded-lg p-4 border border-slate-500 hover:border-kilt-500 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 kilt-gradient rounded-lg flex items-center justify-center">
                          <Award className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">NFT #{position.nftId}</div>
                          <div className="text-slate-400 text-sm">
                            {position.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          ${(parseFloat(position.liquidity) * 0.001).toFixed(2)}
                        </div>
                        <div className="text-emerald-500 text-sm">+5.2%</div>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Range</span>
                        <span className="text-white">
                          {parseFloat(position.minPrice).toFixed(4)} - {parseFloat(position.maxPrice).toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time Staked</span>
                        <span className="text-white">{daysStaked} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Rewards Earned</span>
                        <span className="text-kilt-500 font-medium">
                          {positionRewardAmount.toFixed(1)} KILT
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalUnclaimed > 0 && (
              <Card className="bg-gradient-to-r from-slate-600 to-slate-500 border-slate-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 kilt-gradient rounded-lg flex items-center justify-center">
                        <Gift className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">Total Rewards Available</div>
                        <div className="text-slate-400 text-sm">Ready to claim from all positions</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-kilt-500">
                        {totalUnclaimed.toFixed(1)} KILT
                      </div>
                      <Button 
                        onClick={() => claimRewardsMutation.mutate()}
                        disabled={claimRewardsMutation.isPending}
                        className="kilt-gradient hover:from-kilt-600 hover:to-kilt-700 mt-2"
                      >
                        {claimRewardsMutation.isPending ? 'Claiming...' : 'Claim All'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
