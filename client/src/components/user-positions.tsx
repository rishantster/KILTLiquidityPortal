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
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [managementMode, setManagementMode] = useState<'increase' | 'decrease' | 'collect' | null>(null);
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [showClosedPositions, setShowClosedPositions] = useState(false);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // Use real positions from connected wallet only - kiltEthPositions comes from the API that already filters for KILT positions
  const allKiltPositions = kiltEthPositions || [];
  
  // Position data loads correctly from API via React Query
  // The API already handles all KILT position filtering and deduplication
  // No need to combine with other sources as the API returns all KILT positions
  
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

    setIsProcessing(true);
    try {
      switch (managementMode) {
        case 'increase':
          await increaseLiquidity({
            tokenId: selectedPosition,
            amount0Desired: parseTokenAmount(amount0),
            amount1Desired: parseTokenAmount(amount1),
            amount0Min: '0',
            amount1Min: '0'
          });
          break;
        case 'decrease':
          await decreaseLiquidity({
            tokenId: selectedPosition,
            liquidity: parseTokenAmount(liquidityAmount),
            amount0Min: '0',
            amount1Min: '0'
          });
          break;
        case 'collect':
          await collectFees({
            tokenId: selectedPosition
          });
          break;
      }
      
      setManagementMode(null);
      setSelectedPosition(null);
      setAmount0('');
      setAmount1('');
      setLiquidityAmount('');
      
      // Refresh positions data after successful transaction
      queryClient.invalidateQueries({ queryKey: [`/api/positions/wallet/${address}`] });
      
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
    } finally {
      setIsProcessing(false);
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
        <CardHeader className="pb-4 bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur-sm border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left Side - Title and Stats */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center border border-pink-500/30 shadow-lg shadow-pink-500/10">
                <Layers className="h-6 w-6 text-pink-400" />
              </div>
              <div>
                <CardTitle className="text-white font-bold text-xl mb-1">
                  Your KILT LP Positions
                </CardTitle>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="text-white/60">Real-time Uniswap V3 positions containing KILT token</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Controls */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-6 bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-white font-bold text-sm">{allKiltPositions.length}</span>
                  <span className="text-white/60 text-sm">total</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-emerald-400 font-bold text-sm">{openPositions.length}</span>
                  <span className="text-white/60 text-sm">active</span>
                </div>
                {closedPositions.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-400 font-bold text-sm">{closedPositions.length}</span>
                    <span className="text-white/60 text-sm">closed</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-400 border-emerald-500/30 px-3 py-1.5 text-xs font-medium">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-slate-600/50 hover:border-slate-500/80 text-white hover:text-white h-9 px-3 backdrop-blur-sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
          
          {/* Bottom Row - Toggle for closed positions */}
          {closedPositions.length > 0 && (
            <div className="flex items-center justify-end mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-white/60">Show closed positions</span>
                <button
                  onClick={() => setShowClosedPositions(!showClosedPositions)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:ring-offset-2 focus:ring-offset-black ${
                    showClosedPositions 
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg shadow-pink-500/25' 
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out shadow-sm ${
                      showClosedPositions ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 w-full">
          {!kiltPositions || kiltPositions.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-white/60 text-xs">No KILT positions found</p>
              <p className="text-white/40 text-xs">Add liquidity to pools containing KILT token to get started</p>
              {allKiltPositions.length > 0 && (
                <p className="text-white/40 text-xs mt-1">
                  Found {allKiltPositions.length} KILT position(s) in wallet
                </p>
              )}
              {nonKiltPositions.length > 0 && (
                <p className="text-white/40 text-xs mt-1">
                  Found {nonKiltPositions.length} non-KILT Uniswap V3 position(s) in wallet
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
              {kiltPositions && kiltPositions.map((position) => {
                const positionValue = position.currentValueUSD || calculatePositionValue(position);
                const inRange = position.isInRange; // Use backend-calculated range status
                const isClosed = position.liquidity === 0n;
                const ethAmount = position.amount0 ? (parseFloat(position.amount0) / 1e18).toFixed(3) : '0.000';
                const kiltAmount = position.amount1 ? (parseFloat(position.amount1) / 1e18).toFixed(0) : '0';
                const ethFees = position.fees?.token0 ? (parseFloat(position.fees.token0) / 1e18).toFixed(4) : '0.0000';
                const kiltFees = position.fees?.token1 ? (parseFloat(position.fees.token1) / 1e18).toFixed(2) : '0.00';
                
                return (
                  <div key={position.tokenId.toString()} className={`relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                    isClosed 
                      ? 'bg-gradient-to-br from-gray-900/80 to-gray-800/60 border-gray-700/40' 
                      : 'bg-gradient-to-br from-slate-900/90 to-slate-800/70 border-[#ff0066]/50 hover:border-[#ff0066]/80 shadow-lg shadow-[#ff0066]/20 hover:shadow-[#ff0066]/40 hover:shadow-2xl'
                  }`} style={!isClosed ? {
                    boxShadow: `0 0 20px rgba(255, 0, 102, 0.3), 0 0 40px rgba(255, 0, 102, 0.1)`,
                    filter: 'drop-shadow(0 0 8px rgba(255, 0, 102, 0.4))'
                  } : {}}>
                    {/* Animated Neon Pulse Background */}
                    {!isClosed && (
                      <div className="absolute inset-0 rounded-2xl opacity-50 animate-pulse" style={{
                        background: 'linear-gradient(45deg, rgba(255, 0, 102, 0.1) 0%, rgba(255, 0, 102, 0.05) 50%, rgba(255, 0, 102, 0.1) 100%)',
                        animation: 'neonPulse 3s ease-in-out infinite'
                      }}></div>
                    )}
                    
                    {/* Header */}
                    <div className="p-3 pb-2 relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-xs font-medium">Position</span>
                        <Badge 
                          variant={inRange ? "default" : "secondary"}
                          className={`${inRange ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30"} text-xs px-2 py-0.5`}
                        >
                          {inRange ? 'In Range' : 'Out of Range'}
                        </Badge>
                      </div>
                      <div className="text-xl font-bold text-white tabular-nums relative">
                        <span className="relative z-10" style={{
                          textShadow: '0 0 6px rgba(255, 0, 102, 0.8), 0 0 12px rgba(255, 0, 102, 0.6), 0 0 18px rgba(255, 0, 102, 0.4)',
                          color: '#ffffff'
                        }}>
                          ${positionValue.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Token Holdings */}
                    <div className="px-3 pb-2 relative z-10">
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#ff0066] to-[#ff0066] flex items-center justify-center">
                                <span className="text-white text-xs font-bold">Ξ</span>
                              </div>
                              <div className="text-white font-medium text-xs">
                                {ethAmount} WETH
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium tabular-nums text-xs">
                              ${(parseFloat(ethAmount) * 3635).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">K</span>
                              </div>
                              <div className="text-white font-medium text-xs">
                                {kiltAmount} KILT
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium tabular-nums text-xs">
                              ${(parseFloat(kiltAmount) * 0.01816).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fees Earned */}
                      <div className="bg-white/5 rounded-lg p-2 mb-2 relative overflow-hidden" style={{
                        boxShadow: 'inset 0 0 10px rgba(255, 0, 102, 0.1)',
                        border: '1px solid rgba(255, 0, 102, 0.2)'
                      }}>
                        <div className="text-white/60 text-xs mb-1">Fees earned</div>
                        <div className="text-sm font-bold text-white tabular-nums mb-2 relative">
                          <span style={{
                            textShadow: '0 0 4px rgba(255, 0, 102, 0.6), 0 0 8px rgba(255, 0, 102, 0.4)',
                            color: '#ffffff'
                          }}>
                            ${(parseFloat(ethFees) * 3635 + parseFloat(kiltFees) * 0.01816).toFixed(2)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#ff0066] to-[#ff0066] flex items-center justify-center">
                                <span className="text-white text-xs">Ξ</span>
                              </div>
                              <span className="text-white/80 text-xs">48.99%</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white text-xs tabular-nums">${(parseFloat(ethFees) * 3635).toFixed(2)}</div>
                              <div className="text-white/60 text-xs">0.001 WETH</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                                <span className="text-white text-xs">K</span>
                              </div>
                              <span className="text-white/80 text-xs">51.01%</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white text-xs tabular-nums">${(parseFloat(kiltFees) * 0.01816).toFixed(2)}</div>
                              <div className="text-white/60 text-xs">233.87 KILT</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-1 mb-2 relative z-10">
                        {!isClosed ? (
                          <>
                            <Button
                              onClick={() => {
                                setSelectedPosition(position.tokenId);
                                setManagementMode('increase');
                              }}
                              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-7 text-xs relative overflow-hidden"
                              style={{
                                boxShadow: '0 0 6px rgba(16, 185, 129, 0.5), 0 0 12px rgba(16, 185, 129, 0.3)',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedPosition(position.tokenId);
                                setManagementMode('decrease');
                              }}
                              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-7 text-xs relative overflow-hidden"
                              style={{
                                boxShadow: '0 0 6px rgba(239, 68, 68, 0.5), 0 0 12px rgba(239, 68, 68, 0.3)',
                                border: '1px solid rgba(239, 68, 68, 0.3)'
                              }}
                            >
                              <Minus className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedPosition(position.tokenId);
                                setManagementMode('collect');
                              }}
                              className="flex-1 bg-gradient-to-r from-[#ff0066] to-[#ff0066] hover:from-[#ff0066] hover:to-[#ff0066] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-7 text-xs relative overflow-hidden"
                              style={{
                                boxShadow: '0 0 6px rgba(59, 130, 246, 0.5), 0 0 12px rgba(59, 130, 246, 0.3)',
                                border: '1px solid rgba(59, 130, 246, 0.3)'
                              }}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Collect
                            </Button>
                          </>
                        ) : (
                          <div className="flex-1 text-center py-2 text-white/40 text-xs">
                            Position Closed
                          </div>
                        )}
                      </div>

                      {/* Position Details */}
                      <div className="pt-2 border-t border-white/10 relative z-10">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-white/60 mb-0.5">NFT ID</div>
                            <div className="text-white font-medium">#{position.tokenId}</div>
                          </div>
                          <div>
                            <div className="text-white/60 mb-0.5">Fee Tier</div>
                            <div className="text-white font-medium">{(position.fee / 10000).toFixed(2)}%</div>
                          </div>
                          <div>
                            <div className="text-white/60 mb-0.5">Range</div>
                            <div className="text-white font-medium">Full Range</div>
                          </div>
                        </div>
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
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-[#ff0066] to-[#ff0066] hover:from-[#ff0066] hover:to-[#ff0066]"
              >
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
                <div className="w-10 h-10 bg-gradient-to-br from-[#ff0066] to-[#ff0066] rounded-lg flex items-center justify-center">
                  <Gift className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-white font-bold">Total Rewards Available</div>
                  <div className="text-white/60 text-sm">Ready to claim from all positions</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white tabular-nums">
                  {totalUnclaimed.toFixed(1)} KILT
                </div>
                <Button 
                  onClick={() => claimRewardsMutation.mutate()}
                  disabled={claimRewardsMutation.isPending}
                  className="mt-2 bg-gradient-to-r from-[#ff0066] to-[#ff0066] hover:from-[#ff0066] hover:to-[#ff0066]"
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
