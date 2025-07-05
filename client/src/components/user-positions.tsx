import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/wallet-context';
import { useUserPositions, useUserRewards } from '@/hooks/use-pool-data';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Layers, 
  Gift, 
  Award, 
  Plus, 
  Minus, 
  DollarSign, 
  TrendingUp, 
  ExternalLink,
  RefreshCw,
  Settings,
  Eye,
  Loader2
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { TOKENS } from '@/lib/uniswap-v3';

export function UserPositions() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPosition, setSelectedPosition] = useState<bigint | null>(null);
  const [managementMode, setManagementMode] = useState<'increase' | 'decrease' | 'collect' | null>(null);
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');

  // Uniswap V3 Integration
  const {
    userPositions,
    kiltEthPositions: realKiltEthPositions,
    poolData,
    kiltBalance,
    wethBalance,
    isLoading: uniswapLoading,
    increaseLiquidity,
    decreaseLiquidity,
    collectFees,
    burnPosition,
    isIncreasing,
    isDecreasing,
    isCollecting,
    isBurning,
    formatTokenAmount,
    parseTokenAmount,
    calculatePositionValue,
    isPositionInRange
  } = useUniswapV3();

  // Mock data for demonstration
  const mockPositions = isConnected ? [
    {
      tokenId: BigInt(123456),
      nonce: BigInt(1),
      operator: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      token0: TOKENS.KILT,
      token1: TOKENS.WETH,
      fee: 3000,
      tickLower: -887220,
      tickUpper: 887220,
      liquidity: BigInt("5000000000000000000"),
      tokensOwed0: BigInt("2500000000000000000"),
      tokensOwed1: BigInt("1250000000000000000"),
      feeGrowthInside0LastX128: BigInt("0"),
      feeGrowthInside1LastX128: BigInt("0")
    },
    {
      tokenId: BigInt(789012),
      nonce: BigInt(2),
      operator: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      token0: TOKENS.KILT,
      token1: TOKENS.WETH,
      fee: 500,
      tickLower: -60000,
      tickUpper: 60000,
      liquidity: BigInt("12000000000000000000"),
      tokensOwed0: BigInt("8500000000000000000"),
      tokensOwed1: BigInt("4200000000000000000"),
      feeGrowthInside0LastX128: BigInt("0"),
      feeGrowthInside1LastX128: BigInt("0")
    },
    {
      tokenId: BigInt(345678),
      nonce: BigInt(3),
      operator: "0x0000000000000000000000000000000000000000" as `0x${string}`,
      token0: TOKENS.KILT,
      token1: TOKENS.WETH,
      fee: 10000,
      tickLower: -200000,
      tickUpper: 200000,
      liquidity: BigInt("7500000000000000000"),
      tokensOwed0: BigInt("3800000000000000000"),
      tokensOwed1: BigInt("1900000000000000000"),
      feeGrowthInside0LastX128: BigInt("0"),
      feeGrowthInside1LastX128: BigInt("0")
    }
  ] : [];

  // Use mock data if no real positions, otherwise use real data
  const kiltEthPositions = realKiltEthPositions && realKiltEthPositions.length > 0 
    ? realKiltEthPositions 
    : mockPositions;

  // Mock position value calculation for demo
  const mockCalculatePositionValue = (position: any) => {
    const kiltAmount = parseFloat(formatTokenAmount(position.tokensOwed0, 18));
    const ethAmount = parseFloat(formatTokenAmount(position.tokensOwed1, 18));
    return (kiltAmount * 0.016) + (ethAmount * 2800);
  };

  // Mock in-range calculation for demo
  const mockIsPositionInRange = (position: any) => {
    return position.tokenId.toString() !== "789012"; // Make middle position out of range for demo
  };

  // Mock balances for demo
  const mockKiltBalance = BigInt("15000000000000000000"); // 15 KILT
  const mockWethBalance = BigInt("5000000000000000000");  // 5 ETH

  // Database rewards integration
  const { data: userData } = useQuery({
    queryKey: [`/api/users/${address}`],
    enabled: !!address,
  });

  const typedUserData = userData as { id: number } | undefined;
  const { data: rewards = [] } = useUserRewards(typedUserData?.id || null);

  const claimRewardsMutation = useMutation({
    mutationFn: async () => {
      if (!typedUserData?.id) throw new Error('User not found');
      const response = await apiRequest('POST', `/api/rewards/claim/${typedUserData.id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rewards Claimed",
        description: "Your rewards have been successfully claimed.",
      });
      if (typedUserData?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/rewards/user/${typedUserData.id}`] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim rewards",
        variant: "destructive",
      });
    },
  });

  const handleLiquidityManagement = async () => {
    if (!selectedPosition || !managementMode) return;

    try {
      switch (managementMode) {
        case 'increase':
          await increaseLiquidity({
            tokenId: selectedPosition,
            amount0Desired: parseTokenAmount(amount0, 18),
            amount1Desired: parseTokenAmount(amount1, 18),
            amount0Min: BigInt("0"),
            amount1Min: BigInt("0"),
            deadline: BigInt(Math.floor(Date.now() / 1000) + 3600)
          });
          break;
        case 'decrease':
          await decreaseLiquidity({
            tokenId: selectedPosition,
            liquidity: parseTokenAmount(liquidityAmount, 18),
            amount0Min: BigInt("0"),
            amount1Min: BigInt("0"),
            deadline: BigInt(Math.floor(Date.now() / 1000) + 3600)
          });
          break;
        case 'collect':
          await collectFees({
            tokenId: selectedPosition,
            recipient: address as `0x${string}`,
            amount0Max: BigInt(2) ** BigInt(128) - BigInt(1),
            amount1Max: BigInt(2) ** BigInt(128) - BigInt(1)
          });
          break;
      }
      
      setManagementMode(null);
      setSelectedPosition(null);
      setAmount0('');
      setAmount1('');
      setLiquidityAmount('');
      
      toast({
        title: "Success",
        description: `Position ${managementMode} completed successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${managementMode} position`,
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-8 text-center">
          <p className="text-white/60">Connect your wallet to view your positions</p>
        </CardContent>
      </Card>
    );
  }

  if (uniswapLoading) {
    return (
      <Card className="cluely-card rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <Layers className="h-5 w-5 text-blue-400" />
            <span>Your LP Positions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4">
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

  const unclaimedRewards = Array.isArray(rewards) ? rewards.filter((r: any) => !r.claimedAt) : [];
  const totalUnclaimed = unclaimedRewards.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {/* Main Positions Grid */}
      <Card className="cluely-card rounded-2xl min-h-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <Layers className="h-5 w-5 text-blue-400" />
              <span>Your LP Positions</span>
            </CardTitle>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="border-white/20 hover:border-white/30"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <div className="flex items-center space-x-2 text-sm text-white/60">
                <span>Total Positions:</span>
                <span className="text-white font-bold tabular-nums">{kiltEthPositions?.length || 0}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!kiltEthPositions || kiltEthPositions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60">No LP positions found</p>
              <p className="text-white/40 text-sm">Add liquidity to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kiltEthPositions && kiltEthPositions.map((position) => {
                const positionValue = realKiltEthPositions && realKiltEthPositions.length > 0 
                  ? calculatePositionValue(position) 
                  : mockCalculatePositionValue(position);
                const inRange = realKiltEthPositions && realKiltEthPositions.length > 0 
                  ? isPositionInRange(position) 
                  : mockIsPositionInRange(position);
                
                return (
                  <Card key={position.tokenId.toString()} className="bg-white/5 border-white/10 rounded-xl hover:bg-white/10 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                            <Award className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="text-white font-bold tabular-nums">NFT #{position.tokenId.toString()}</div>
                            <Badge 
                              variant={inRange ? "default" : "secondary"}
                              className={inRange ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}
                            >
                              {inRange ? 'In Range' : 'Out of Range'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold tabular-nums text-lg">
                            ${positionValue.toFixed(2)}
                          </div>
                          <div className="text-emerald-400 text-sm font-bold tabular-nums">
                            {formatTokenAmount(position.liquidity, 18) || '0'} L
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/60">KILT Amount</span>
                          <span className="text-white font-bold tabular-nums">
                            {formatTokenAmount(position.tokensOwed0, 18) || '0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">ETH Amount</span>
                          <span className="text-white font-bold tabular-nums">
                            {formatTokenAmount(position.tokensOwed1, 18) || '0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60">Fee Tier</span>
                          <span className="text-white font-bold tabular-nums">
                            {position.fee / 10000}%
                          </span>
                        </div>
                      </div>

                      {/* Position Management Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPosition(position.tokenId);
                            setManagementMode('increase');
                          }}
                          className="flex-1 border-white/20 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPosition(position.tokenId);
                            setManagementMode('decrease');
                          }}
                          className="flex-1 border-white/20 hover:border-red-400 text-red-400 hover:text-red-300"
                        >
                          <Minus className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPosition(position.tokenId);
                            setManagementMode('collect');
                          }}
                          className="flex-1 border-white/20 hover:border-blue-400 text-blue-400 hover:text-blue-300"
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          Collect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Position Management Modal */}
      {selectedPosition && managementMode && (
        <Card className="cluely-card rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <Settings className="h-5 w-5 text-blue-400" />
              <span>Manage Position #{selectedPosition.toString()}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {managementMode === 'increase' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/60">KILT Amount</Label>
                  <Input
                    type="number"
                    value={amount0}
                    onChange={(e) => setAmount0(e.target.value)}
                    placeholder="0.0"
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <div className="text-xs text-white/40 mt-1">
                    Balance: {formatTokenAmount((kiltBalance || mockKiltBalance), 18) || '0'} KILT
                  </div>
                </div>
                <div>
                  <Label className="text-white/60">ETH Amount</Label>
                  <Input
                    type="number"
                    value={amount1}
                    onChange={(e) => setAmount1(e.target.value)}
                    placeholder="0.0"
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <div className="text-xs text-white/40 mt-1">
                    Balance: {formatTokenAmount((wethBalance || mockWethBalance), 18) || '0'} ETH
                  </div>
                </div>
              </div>
            )}

            {managementMode === 'decrease' && (
              <div>
                <Label className="text-white/60">Liquidity Amount</Label>
                <Input
                  type="number"
                  value={liquidityAmount}
                  onChange={(e) => setLiquidityAmount(e.target.value)}
                  placeholder="0.0"
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
            )}

            {managementMode === 'collect' && (
              <div className="text-center py-4">
                <p className="text-white/60">Collect all earned fees for this position</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleLiquidityManagement}
                disabled={isIncreasing || isDecreasing || isCollecting}
                className="flex-1 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600"
              >
                {(isIncreasing || isDecreasing || isCollecting) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {managementMode === 'increase' && 'Add Liquidity'}
                {managementMode === 'decrease' && 'Remove Liquidity'}
                {managementMode === 'collect' && 'Collect Fees'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setManagementMode(null);
                  setSelectedPosition(null);
                  setAmount0('');
                  setAmount1('');
                  setLiquidityAmount('');
                }}
                className="border-white/20 hover:border-white/30"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rewards Summary */}
      {totalUnclaimed > 0 && (
        <Card className="cluely-card rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Gift className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-bold">Total Rewards Available</div>
                  <div className="text-white/60 text-sm">Ready to claim from all positions</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 tabular-nums">
                  {totalUnclaimed.toFixed(1)} KILT
                </div>
                <Button 
                  onClick={() => claimRewardsMutation.mutate()}
                  disabled={claimRewardsMutation.isPending}
                  className="mt-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600"
                >
                  {claimRewardsMutation.isPending ? 'Claiming...' : 'Claim All'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
