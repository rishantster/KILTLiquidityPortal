import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/wallet-context';
import { useUserPositions, useUserRewards } from '@/hooks/use-pool-data';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useUnifiedDashboard } from '@/hooks/use-unified-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { KILT_TOKEN_ADDRESS, KILT_ETH_POOL_ADDRESS } from '@/lib/constants';
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
import { useState, useEffect } from 'react';
import { TOKENS } from '@/lib/uniswap-v3';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

// Ethereum logo component
const EthereumLogo = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 256 417" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M127.961 0L125.44 8.55656V285.168L127.961 287.688L255.922 212.32L127.961 0Z" fill="#343434"/>
    <path d="M127.962 0L0 212.32L127.962 287.688V153.864V0Z" fill="#8C8C8C"/>
    <path d="M127.961 312.187L126.385 314.154V415.484L127.961 417L255.922 237.832L127.961 312.187Z" fill="#3C3C3B"/>
    <path d="M127.962 417V312.187L0 237.832L127.962 417Z" fill="#8C8C8C"/>
    <path d="M127.961 287.688L255.922 212.32L127.961 153.864V287.688Z" fill="#141114"/>
    <path d="M0 212.32L127.962 287.688V153.864L0 212.32Z" fill="#393939"/>
  </svg>
);
import { useKiltTokenData } from '@/hooks/use-kilt-data';

export function UserPositions() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const unifiedData = useUnifiedDashboard();
  const [selectedPosition, setSelectedPosition] = useState<bigint | null>(null);
  const [managementMode, setManagementMode] = useState<'increase' | 'decrease' | 'collect' | null>(null);
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [showClosedPositions, setShowClosedPositions] = useState(false);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);

  // Logo animation timing - optimize with single effect
  useEffect(() => {
    const timer = setTimeout(() => setLogoAnimationComplete(true), 800);
    return () => clearTimeout(timer);
  }, []);
  
  // KILT data hook
  const { data: kiltData } = useKiltTokenData();

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

  // Optimized BigInt renderer
  const safeBigIntRender = (value: bigint | number | string) => 
    typeof value === 'bigint' ? value.toString() : value?.toString() || '0';

  // Use real positions from connected wallet only
  const allKiltEthPositions = realKiltEthPositions || [];
  
  // Also find any other positions containing KILT token (not just KILT/ETH pool)
  const otherKiltPositions = (userPositions || []).filter(pos => {
    // Check if position contains KILT token but is not from the main KILT/ETH pool
    const hasKilt = pos.token0?.toLowerCase() === KILT_TOKEN_ADDRESS.toLowerCase() || 
                   pos.token1?.toLowerCase() === KILT_TOKEN_ADDRESS.toLowerCase();
    const isMainPool = pos.poolAddress?.toLowerCase() === KILT_ETH_POOL_ADDRESS.toLowerCase();
    return hasKilt && !isMainPool;
  });
  
  // Combine all KILT-related positions
  const allKiltPositions = [...allKiltEthPositions, ...otherKiltPositions];
  
  // Filter positions based on toggle state
  const kiltPositions = showClosedPositions 
    ? allKiltPositions 
    : allKiltPositions.filter(pos => pos.liquidity > 0n);
  
  // Count open and closed positions
  const openPositions = allKiltPositions.filter(pos => pos.liquidity > 0n);
  const closedPositions = allKiltPositions.filter(pos => pos.liquidity === 0n);
  
  // Count non-KILT positions
  const nonKiltPositions = (userPositions || []).filter(pos => {
    const hasKilt = pos.token0?.toLowerCase() === KILT_TOKEN_ADDRESS.toLowerCase() || 
                   pos.token1?.toLowerCase() === KILT_TOKEN_ADDRESS.toLowerCase();
    return !hasKilt;
  });
  




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
    onError: (error: Error) => {
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
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as Error)?.message || `Failed to ${managementMode} position`,
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <Card className="cluely-card rounded-lg">
        <CardContent className="p-4 text-center">
          <p className="text-white/60 text-xs">Connect your wallet to view your positions</p>
        </CardContent>
      </Card>
    );
  }

  if (uniswapLoading) {
    return (
      <Card className="cluely-card rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-white font-heading text-sm">
            <Layers className="h-3 w-3 text-blue-400" />
            <span>Your LP Positions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-3">
                <Skeleton className="h-6 w-20 mb-2" />
                <Skeleton className="h-3 w-28 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const unclaimedRewards = Array.isArray(rewards) ? rewards.filter((r: { claimedAt?: Date | null }) => !r.claimedAt) : [];
  const totalUnclaimed = unclaimedRewards.reduce((sum: number, r: { amount: string | number }) => sum + parseFloat(r.amount.toString()), 0);

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {/* Main Positions Grid */}
      <Card className="cluely-card rounded-lg min-h-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-white font-heading text-sm">
              <Layers className="h-3 w-3 text-blue-400" />
              <span>Your KILT LP Positions</span>
            </CardTitle>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="border-white/20 hover:border-white/30 text-xs h-6 px-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              
              {/* Position counts and toggle */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-xs text-white/60">
                  <span>{allKiltPositions.length} KILT positions ({openPositions.length} open)</span>
                </div>
                
                {closedPositions.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-white/60">Display Closed</span>
                    <button
                      onClick={() => setShowClosedPositions(!showClosedPositions)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        showClosedPositions 
                          ? 'bg-blue-600' 
                          : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
                          showClosedPositions ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {!kiltPositions || kiltPositions.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-white/60 text-xs">No KILT positions found</p>
              <p className="text-white/40 text-xs">Add liquidity to pools containing KILT token to get started</p>
              {allKiltEthPositions.length > 0 && (
                <p className="text-white/40 text-xs mt-1">
                  Found {allKiltEthPositions.length} KILT/ETH position(s) in main pool
                </p>
              )}
              {otherKiltPositions.length > 0 && (
                <p className="text-white/40 text-xs mt-1">
                  Found {otherKiltPositions.length} other KILT position(s) in different pools
                </p>
              )}
              {nonKiltPositions.length > 0 && (
                <p className="text-white/40 text-xs mt-1">
                  Found {nonKiltPositions.length} non-KILT Uniswap V3 position(s) in wallet
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {kiltPositions && kiltPositions.map((position) => {
                const positionValue = calculatePositionValue(position);
                const inRange = isPositionInRange(position);
                const isClosed = position.liquidity === 0n;
                const isMainPool = position.poolAddress?.toLowerCase() === KILT_ETH_POOL_ADDRESS.toLowerCase();
                
                return (
                  <Card key={position.tokenId.toString()} className={`${isClosed ? 'bg-white/3 border-white/5' : 'bg-white/5 border-white/10'} rounded-xl hover:bg-white/10 transition-all`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 bg-gradient-to-br ${isClosed ? 'from-gray-500 to-gray-600' : 'from-blue-500 to-emerald-500'} rounded-lg flex items-center justify-center`}>
                            <Award className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="text-white font-bold tabular-nums">NFT #{position.tokenId.toString()}</div>
                              {isClosed && (
                                <Badge variant="secondary" className="bg-gray-500/20 text-gray-400 text-xs">
                                  CLOSED
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge 
                                variant={inRange ? "default" : "secondary"}
                                className={inRange ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}
                              >
                                {inRange ? 'In Range' : 'Out of Range'}
                              </Badge>
                              <Badge 
                                variant="outline" 
                                className={isMainPool ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-purple-500/20 text-purple-400 border-purple-500/30"}
                              >
                                {isMainPool ? 'KILT/ETH' : 'Other Pool'}
                              </Badge>
                            </div>
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
                          <span className="text-white/60 flex items-center gap-1">
                            <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
                            KILT
                          </span>
                          <span className="text-white font-bold tabular-nums">
                            {formatTokenAmount(position.tokensOwed0, 18) || '0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60 flex items-center gap-1">
                            <EthereumLogo className="w-5 h-5" />
                            ETH
                          </span>
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
                        
                        {/* Panoptic-style Price Range Visualization */}
                        <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white/60 text-xs">Range (ETH/KILT)</span>
                            <span className="text-white/60 text-xs">Current: {(kiltData?.price || 0.0160).toFixed(4)}</span>
                          </div>
                          
                          {/* Curved Range Visualization */}
                          <div className="relative h-16 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10 rounded-lg overflow-hidden border border-white/5">
                            {/* Price range background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-emerald-900/20"></div>
                            
                            {/* Position range visualization */}
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 64">
                              {/* Background curve */}
                              <path
                                d="M 20 50 Q 100 20 180 50"
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="1"
                                fill="none"
                                strokeDasharray="2,2"
                              />
                              
                              {/* Active position curve */}
                              <path
                                d="M 40 45 Q 100 15 160 45"
                                stroke={position.liquidity > 0 ? '#10b981' : '#ef4444'}
                                strokeWidth="3"
                                fill="none"
                                className="drop-shadow-sm"
                              />
                              
                              {/* Min price marker */}
                              <circle
                                cx="40"
                                cy="45"
                                r="4"
                                fill={position.liquidity > 0 ? '#10b981' : '#ef4444'}
                                className="drop-shadow-sm"
                              />
                              
                              {/* Max price marker */}
                              <circle
                                cx="160"
                                cy="45"
                                r="4"
                                fill={position.liquidity > 0 ? '#10b981' : '#ef4444'}
                                className="drop-shadow-sm"
                              />
                              
                              {/* Current price indicator */}
                              <line
                                x1="100"
                                y1="10"
                                x2="100"
                                y2="54"
                                stroke="white"
                                strokeWidth="2"
                                className="drop-shadow-sm"
                              />
                              <circle
                                cx="100"
                                cy="30"
                                r="3"
                                fill="white"
                                className="drop-shadow-sm"
                              />
                            </svg>
                            
                            {/* Price labels */}
                            <div className="absolute bottom-1 left-2 text-xs text-white/60">
                              Min: {((kiltData?.price || 0.0160) * 0.8).toFixed(4)}
                            </div>
                            <div className="absolute bottom-1 right-2 text-xs text-white/60">
                              Max: {((kiltData?.price || 0.0160) * 1.2).toFixed(4)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Position Management Actions */}
                      <div className="flex gap-1 mt-4">
                        {!isClosed ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPosition(position.tokenId);
                                setManagementMode('increase');
                              }}
                              className="flex-1 text-xs border-white/20 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300"
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
                              className="flex-1 text-xs border-white/20 hover:border-red-400 text-red-400 hover:text-red-300"
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
                              className="flex-1 text-xs border-white/20 hover:border-blue-400 text-blue-400 hover:text-blue-300"
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Collect
                            </Button>
                          </>
                        ) : (
                          <div className="flex-1 text-center py-2 text-white/40 text-xs">
                            Position closed - no actions available
                          </div>
                        )}
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
                  <Label className="text-white/60 flex items-center gap-1">
                    <img src={kiltLogo} alt="KILT" className="w-4 h-4" />
                    KILT
                  </Label>
                  <Input
                    type="number"
                    value={amount0}
                    onChange={(e) => setAmount0(e.target.value)}
                    placeholder="0.0"
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <div className="text-xs text-white/40 mt-1">
                    Balance: {formatTokenAmount(kiltBalance, 18) || '0'} KILT
                  </div>
                </div>
                <div>
                  <Label className="text-white/60 flex items-center gap-1">
                    <EthereumLogo className="w-4 h-4" />
                    ETH
                  </Label>
                  <Input
                    type="number"
                    value={amount1}
                    onChange={(e) => setAmount1(e.target.value)}
                    placeholder="0.0"
                    className="bg-white/5 border-white/20 text-white"
                  />
                  <div className="text-xs text-white/40 mt-1">
                    Balance: {formatTokenAmount(wethBalance, 18) || '0'} ETH
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
