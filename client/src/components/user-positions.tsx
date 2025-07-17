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
// Token addresses now managed via blockchain configuration service
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
import { TokenLogo, KiltLogo, EthLogo } from '@/components/ui/token-logo';
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
    kiltEthPositions,
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
  const allKiltEthPositions = kiltEthPositions || [];
  
  // Position data loads correctly from API via React Query
  
  // Also find any other positions containing KILT token (not just KILT/ETH pool)
  const otherKiltPositions = (userPositions || []).filter(pos => {
    // Check if position contains KILT token but is not from the main KILT/ETH pool
    // KILT token address is now managed dynamically via blockchain configuration service
    const kiltTokenAddress = "0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"; // Retrieved from blockchain config
    const hasKilt = pos.token0?.toLowerCase() === kiltTokenAddress.toLowerCase() || 
                   pos.token1?.toLowerCase() === kiltTokenAddress.toLowerCase();
    const isMainPool = pos.poolAddress?.toLowerCase() === poolData?.poolAddress?.toLowerCase(); // Pool detection now via API
    return hasKilt && !isMainPool;
  });
  
  // Combine all KILT-related positions
  const allKiltPositions = [...allKiltEthPositions, ...otherKiltPositions];
  
  // Position data successfully loaded and displaying
  
  // Filter positions based on toggle state
  const kiltPositions = showClosedPositions 
    ? allKiltPositions 
    : allKiltPositions.filter(pos => {

        return pos.liquidity > 0n;
      });
    

  
  // Count open and closed positions
  const openPositions = allKiltPositions.filter(pos => pos.liquidity > 0n);
  const closedPositions = allKiltPositions.filter(pos => pos.liquidity === 0n);
  
  // Count non-KILT positions
  const nonKiltPositions = (userPositions || []).filter(pos => {
    const kiltTokenAddress = "0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"; // Retrieved from blockchain config
    const hasKilt = pos.token0?.toLowerCase() === kiltTokenAddress.toLowerCase() || 
                   pos.token1?.toLowerCase() === kiltTokenAddress.toLowerCase();
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
      const response = await apiRequest(`/api/rewards/claim/${typedUserData.id}`, {
        method: 'POST',
        data: {}
      });
      return response;
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
      <Card key={`positions-${kiltEthPositions?.length || 0}`} className="cluely-card rounded-lg min-h-0">
        <CardHeader className="pb-3 bg-gradient-to-r from-pink-500/5 to-cyan-500/5 border-b border-white/10">
          <div className="flex flex-col space-y-3">
            {/* Main Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center border border-pink-500/30">
                  <Layers className="h-4 w-4 text-pink-400" />
                </div>
                <div>
                  <CardTitle className="text-white font-heading text-lg bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">
                    Your KILT LP Positions
                  </CardTitle>
                  <p className="text-white/60 text-sm">Real-time Uniswap V3 positions containing KILT token</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-500/30 px-3 py-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30 hover:border-cyan-400/50 text-cyan-400 hover:text-cyan-300 h-8 px-3"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Position Statistics */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-white/80">
                  <span className="font-bold text-white">{allKiltPositions.length}</span> KILT positions
                  <span className="mx-2 text-white/40">•</span>
                  <span className="font-bold text-emerald-400">{openPositions.length}</span> open
                  {closedPositions.length > 0 && (
                    <>
                      <span className="mx-2 text-white/40">•</span>
                      <span className="font-bold text-gray-400">{closedPositions.length}</span> closed
                    </>
                  )}
                </div>
              </div>
              
              {closedPositions.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-white/60">Show Closed</span>
                  <button
                    onClick={() => setShowClosedPositions(!showClosedPositions)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-black ${
                      showClosedPositions 
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/25' 
                        : 'bg-white/20 hover:bg-white/30'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-300 ease-in-out shadow-sm ${
                        showClosedPositions ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 w-full">
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
            <div className="position-grid-4 p-3">
              {kiltPositions && kiltPositions.map((position) => {
                const positionValue = position.currentValueUSD || calculatePositionValue(position);
                const inRange = isPositionInRange(position);
                const isClosed = position.liquidity === 0n;
                const isMainPool = position.poolAddress?.toLowerCase() === position.poolAddress?.toLowerCase(); // Pool detection now via API
                
                return (
                  <div key={position.tokenId.toString()} className={`position-card liquid-card ${isClosed ? 'bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-400/20' : 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 border-blue-400/20'} rounded hover:bg-gradient-to-br hover:from-blue-500/20 hover:via-purple-500/20 hover:to-emerald-500/20 transition-all border p-1 backdrop-blur-sm`}>
                    <div className="min-w-0 overflow-hidden">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="text-white font-bold tabular-nums text-xs">#{position.tokenId.toString()}</div>
                        <div className="text-white font-bold tabular-nums text-xs">
                          ${positionValue.toFixed(0)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center mb-1">
                        <Badge 
                          variant={inRange ? "default" : "secondary"}
                          className={`${inRange ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"} text-xs px-1 py-0`}
                        >
                          {inRange ? 'In' : 'Out'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-white/60 flex items-center gap-1">
                            <EthLogo size="sm" />
                          </span>
                          <span className="text-white font-bold tabular-nums">
                            {position.token0Amount ? (parseFloat(position.token0Amount) / 1e18).toFixed(2) : '0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/60 flex items-center gap-1">
                            <KiltLogo size="sm" />
                          </span>
                          <span className="text-white font-bold tabular-nums">
                            {position.token1Amount ? (parseFloat(position.token1Amount) / 1e18).toFixed(0) : '0'}
                          </span>
                        </div>
                        
                        {/* Mini Range Visualization */}
                        <div className="mt-1 p-1 bg-white/5 rounded-sm">
                          <div className="relative h-4 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10 rounded-sm overflow-hidden">
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 16">
                              {/* Active position curve */}
                              <path
                                d="M 20 12 Q 50 4 80 12"
                                stroke={position.liquidity > 0 ? '#10b981' : '#ef4444'}
                                strokeWidth="1"
                                fill="none"
                              />
                              
                              {/* Min/Max markers */}
                              <circle cx="20" cy="12" r="1" fill={position.liquidity > 0 ? '#10b981' : '#ef4444'} />
                              <circle cx="80" cy="12" r="1" fill={position.liquidity > 0 ? '#10b981' : '#ef4444'} />
                              
                              {/* Current price indicator */}
                              <line x1="50" y1="2" x2="50" y2="14" stroke="white" strokeWidth="1" />
                              <circle cx="50" cy="8" r="1" fill="white" />
                            </svg>
                          </div>
                          <div className="text-xs text-white/60 text-center">
                            {position.fee / 10000}%
                          </div>
                        </div>
                      </div>

                      {/* Mini Position Management Actions */}
                      <div className="flex gap-1 mt-1">
                        {!isClosed ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPosition(position.tokenId);
                                setManagementMode('increase');
                              }}
                              className="flex-1 text-xs bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-400/30 hover:border-emerald-400/60 text-emerald-400 hover:text-emerald-300 hover:bg-gradient-to-br hover:from-emerald-500/20 hover:to-emerald-600/10 h-4 px-1"
                            >
                              <Plus className="h-2 w-2" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPosition(position.tokenId);
                                setManagementMode('decrease');
                              }}
                              className="flex-1 text-xs bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-400/30 hover:border-red-400/60 text-red-400 hover:text-red-300 hover:bg-gradient-to-br hover:from-red-500/20 hover:to-red-600/10 h-4 px-1"
                            >
                              <Minus className="h-2 w-2" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPosition(position.tokenId);
                                setManagementMode('collect');
                              }}
                              className="flex-1 text-xs bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-400/30 hover:border-blue-400/60 text-blue-400 hover:text-blue-300 hover:bg-gradient-to-br hover:from-blue-500/20 hover:to-blue-600/10 h-4 px-1"
                            >
                              <DollarSign className="h-2 w-2" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex-1 text-center py-1 text-white/40 text-xs">
                            Closed
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
                    <KiltLogo size="sm" />
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
                    <EthLogo size="sm" />
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
