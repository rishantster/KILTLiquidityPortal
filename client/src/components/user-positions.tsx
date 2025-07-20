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
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { useFastPositionData } from '@/hooks/use-fast-position-data';
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

  // Mobile device detection for performance optimization
  const isMobile = typeof window !== 'undefined' && (
    window.innerWidth <= 768 || 
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  // Mobile-optimized blazing fast position loading
  const mobileOptimizedConfig = isMobile ? {
    staleTime: 2 * 60 * 1000, // 2 minutes for mobile to save bandwidth
    gcTime: 10 * 60 * 1000, // 10 minutes retention
    refetchInterval: false, // No background refresh on mobile to save battery
    refetchOnWindowFocus: false,
    retry: 2, // Fewer retries for mobile
    networkMode: 'online' as const,
  } : {
    staleTime: 30 * 1000, // 30 seconds for desktop
    gcTime: 5 * 60 * 1000, // 5 minutes retention
    refetchInterval: 60 * 1000, // Background refresh for desktop
    refetchOnWindowFocus: false,
    retry: 3,
    networkMode: 'online' as const,
  };

  // Blazing fast wallet positions with mobile optimization
  const { data: walletPositions, isLoading: walletPositionsLoading } = useQuery({
    queryKey: ['/api/positions/wallet/' + address],
    enabled: !!address && isConnected,
    ...mobileOptimizedConfig
  });

  // Legacy Uniswap integration for management functions
  const {
    userPositions,
    kiltEthPositions: legacyKiltEthPositions,
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

  // Use real wallet positions from the blazing fast API endpoint
  const allKiltPositions = walletPositions || [];
  const positionsData = walletPositions || [];
  

  
  // Filter positions based on toggle state
  const kiltPositions = showClosedPositions 
    ? allKiltPositions 
    : allKiltPositions.filter(pos => pos.liquidity > 0n);
    

  
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
          // Calculate actual liquidity amount from percentage
          const currentPosition = walletPositions?.find(pos => pos.tokenId === selectedPosition);
          if (!currentPosition) {
            throw new Error('Position not found');
          }
          
          const percentage = parseFloat(liquidityAmount) / 100;
          const actualLiquidityAmount = (BigInt(currentPosition.liquidity) * BigInt(Math.floor(percentage * 100)) / BigInt(100)).toString();
          
          await decreaseLiquidity({
            tokenId: selectedPosition,
            liquidity: actualLiquidityAmount,
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
      
      // INSTANT UI UPDATE - Remove position immediately from UI
      if (managementMode === 'decrease' && liquidityAmount === '100') {
        // For 100% removal, immediately remove position from UI
        queryClient.setQueryData([`/api/positions/wallet/${address}`], (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.filter((pos: any) => pos.tokenId !== selectedPosition);
        });
      }
      
      // BLAZING FAST CACHE INVALIDATION - Force refresh positions data
      queryClient.invalidateQueries({ queryKey: [`/api/positions/wallet/${address}`] });
      queryClient.refetchQueries({ queryKey: [`/api/positions/wallet/${address}`] });
      
      // Also force refresh unified dashboard data
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/program-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards/user-apr', address] });
      
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

  if (walletPositionsLoading || uniswapLoading) {
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
  const totalUnclaimed = unclaimedRewards.reduce((sum: number, r: { amount: string | number }) => {
    // Safe null check before toString()
    const amount = r.amount;
    if (amount === null || amount === undefined) return sum;
    return sum + parseFloat(amount.toString());
  }, 0);

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {/* Main Positions Grid */}
      <Card key={`positions-${allKiltPositions?.length || 0}`} className="cluely-card rounded-lg min-h-0">
        <CardHeader className="flex flex-col space-y-1.5 p-6 pb-4 from-slate-900/50 to-slate-800/50 backdrop-blur-sm border-b border-white/10 bg-[#000000]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left Side - Title and Stats */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/20 rounded-xl flex items-center justify-center border border-[#ff0066]/30 shadow-lg shadow-[#ff0066]/10">
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
                  <span className="text-white text-sm numeric-mono">{allKiltPositions.length}</span>
                  <span className="text-white/60 text-sm">total</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-emerald-400 text-sm numeric-mono">{openPositions.length}</span>
                  <span className="text-white/60 text-sm">active</span>
                </div>
                {closedPositions.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-400 text-sm numeric-mono">{closedPositions.length}</span>
                    <span className="text-white/60 text-sm">closed</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge className="bg-black/20 backdrop-blur-sm text-white border-white/20 px-3 py-1.5 text-xs font-medium">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (address) {
                      queryClient.invalidateQueries({ queryKey: [`/api/positions/wallet/${address}`] });
                      toast({
                        title: "Refreshing Positions",
                        description: "Updated position data loading...",
                      });
                    }
                  }}
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
                      ? 'bg-gradient-to-r from-[#ff0066] to-[#ff0066] shadow-lg shadow-[#ff0066]/25' 
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
          {!allKiltPositions || allKiltPositions.length === 0 ? (
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
              {(showClosedPositions ? allKiltPositions : allKiltPositions.filter(pos => pos.liquidity > 0n)).map((position) => {
                const positionValue = position.currentValueUSD || calculatePositionValue(position);
                const inRange = position.isInRange; // Use backend-calculated range status
                const isClosed = position.liquidity === 0n;
                const ethAmount = position.token0Amount ? (parseFloat(position.token0Amount) / 1e18).toFixed(3) : '0.000';
                const kiltAmount = position.token1Amount ? (parseFloat(position.token1Amount) / 1e18).toFixed(0) : '0';
                const ethFees = position.fees?.token0 ? (parseFloat(position.fees.token0) / 1e18).toFixed(4) : '0.0000';
                const kiltFees = position.fees?.token1 ? (parseFloat(position.fees.token1) / 1e18).toFixed(2) : '0.00';
                
                return (
                  <div key={position.tokenId.toString()} className="relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] from-slate-900/90 to-slate-800/70 border-[#ff0066]/50 hover:border-[#ff0066]/80 shadow-lg shadow-[#ff0066]/20 hover:shadow-[#ff0066]/40 hover:shadow-2xl bg-[#000000]" style={!isClosed ? {
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
                        <span className="text-white font-bold text-sm" style={{
                          color: '#ffffff',
                          textShadow: '0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.4)'
                        }}>Position</span>
                        <Badge 
                          variant={inRange ? "default" : "secondary"}
                          className={`${inRange ? "bg-emerald-500/30 text-emerald-300 border-emerald-400/50" : "bg-amber-500/30 text-amber-300 border-amber-400/50"} text-sm px-3 py-1 font-bold`}
                          style={{
                            textShadow: '0 0 4px rgba(255, 255, 255, 0.6)'
                          }}
                        >
                          {inRange ? 'In Range' : 'Out of Range'}
                        </Badge>
                      </div>
                      <div className="text-2xl text-white relative numeric-large">
                        <span className="relative z-10" style={{
                          textShadow: '0 0 8px rgba(255, 255, 255, 0.9), 0 0 16px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 0, 102, 0.4)',
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
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-shrink-0 w-4 h-4 bg-[#ff0066]/30 rounded-full flex items-center justify-center border border-[#ff0066]/50">
                              <svg className="w-3 h-3" viewBox="0 0 256 417" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'brightness(1.5) contrast(1.2) drop-shadow(0 0 2px rgba(255,255,255,0.3))' }}>
                                <path d="M127.961 0L125.44 8.55656V285.168L127.961 287.688L255.922 212.32L127.961 0Z" fill="#8A92B2"/>
                                <path d="M127.962 0L0 212.32L127.962 287.688V153.864V0Z" fill="#62688F"/>
                                <path d="M127.961 312.187L126.385 314.154V415.484L127.961 417L255.922 237.832L127.961 312.187Z" fill="#8A92B2"/>
                                <path d="M127.962 417V312.187L0 237.832L127.962 417Z" fill="#62688F"/>
                                <path d="M127.961 287.688L255.922 212.32L127.961 153.864V287.688Z" fill="#454A75"/>
                                <path d="M0 212.32L127.962 287.688V153.864L0 212.32Z" fill="#8A92B2"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm numeric-display" style={{
                                color: '#ffffff',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.4)'
                              }}>
                                {ethAmount} WETH
                              </div>
                              <div className="text-white font-medium text-sm numeric-mono" style={{
                                color: '#ffffff',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.6)'
                              }}>
                                ${(parseFloat(ethAmount) * 3635).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-shrink-0 w-4 h-4 bg-[#ff0066]/30 rounded-full flex items-center justify-center border border-[#ff0066]/50">
                              <img 
                                src="/attached_assets/KILT_400x400_transparent_1751723574123.png" 
                                alt="KILT" 
                                className="w-3 h-3"
                                style={{ 
                                  filter: 'brightness(1.5) contrast(1.2) drop-shadow(0 0 2px rgba(255,255,255,0.3))'
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm numeric-display" style={{
                                color: '#ffffff',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.4)'
                              }}>
                                {kiltAmount} KILT
                              </div>
                              <div className="text-white font-medium text-sm numeric-mono" style={{
                                color: '#ffffff',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.6)'
                              }}>
                                ${(parseFloat(kiltAmount) * 0.01816).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fees Earned */}
                      <div className="bg-white/5 rounded-lg p-2 mb-2 relative overflow-hidden" style={{
                        boxShadow: 'inset 0 0 10px rgba(255, 0, 102, 0.1)',
                        border: '1px solid rgba(255, 0, 102, 0.2)'
                      }}>
                        <div className="text-white font-bold text-sm mb-2" style={{
                          color: '#ffffff',
                          textShadow: '0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.4)'
                        }}>Fees earned</div>
                        <div className="text-lg text-white mb-2 relative numeric-large">
                          <span style={{
                            textShadow: '0 0 6px rgba(255, 255, 255, 0.9), 0 0 12px rgba(255, 255, 255, 0.6), 0 0 18px rgba(255, 0, 102, 0.4)',
                            color: '#ffffff'
                          }}>
                            ${(parseFloat(ethFees) * 3635 + parseFloat(kiltFees) * 0.01816).toFixed(2)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="flex-shrink-0 w-3 h-3 bg-[#ff0066]/30 rounded-full flex items-center justify-center border border-[#ff0066]/50">
                                <svg className="w-2 h-2" viewBox="0 0 256 417" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'brightness(1.5) contrast(1.2)' }}>
                                  <path d="M127.961 0L125.44 8.55656V285.168L127.961 287.688L255.922 212.32L127.961 0Z" fill="#8A92B2"/>
                                  <path d="M127.962 0L0 212.32L127.962 287.688V153.864V0Z" fill="#62688F"/>
                                  <path d="M127.961 312.187L126.385 314.154V415.484L127.961 417L255.922 237.832L127.961 312.187Z" fill="#8A92B2"/>
                                  <path d="M127.962 417V312.187L0 237.832L127.962 417Z" fill="#62688F"/>
                                  <path d="M127.961 287.688L255.922 212.32L127.961 153.864V287.688Z" fill="#454A75"/>
                                  <path d="M0 212.32L127.962 287.688V153.864L0 212.32Z" fill="#8A92B2"/>
                                </svg>
                              </div>
                              <span className="text-white text-sm numeric-mono" style={{
                                color: '#ffffff',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.6)'
                              }}>48.99%</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white text-sm numeric-mono" style={{
                                color: '#ffffff',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.8)'
                              }}>${(parseFloat(ethFees) * 3635).toFixed(2)}</div>
                              <div className="text-white font-medium text-sm numeric-mono" style={{
                                color: '#ffffff',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.6)'
                              }}>{ethFees} WETH</div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <div className="flex-shrink-0 w-3 h-3 bg-[#ff0066]/30 rounded-full flex items-center justify-center border border-[#ff0066]/50">
                                <img 
                                  src="/attached_assets/KILT_400x400_transparent_1751723574123.png" 
                                  alt="KILT" 
                                  className="w-2 h-2"
                                  style={{ 
                                    filter: 'brightness(1.5) contrast(1.2)'
                                  }}
                                />
                              </div>
                              <span className="text-white text-sm numeric-mono" style={{
                                color: '#ffffff',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.6)'
                              }}>51.01%</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white text-sm numeric-mono" style={{
                                color: '#ffffff',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.8)'
                              }}>${(parseFloat(kiltFees) * 0.01816).toFixed(2)}</div>
                              <div className="text-white font-medium text-sm numeric-mono" style={{
                                color: '#ffffff',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.6)'
                              }}>{kiltFees} KILT</div>
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
                              className="flex-1 bg-gradient-to-r from-[#ff0066] to-[#ff0066] hover:from-[#ff0066] hover:to-[#ff0066] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-8 text-sm font-bold relative overflow-hidden"
                              style={{
                                boxShadow: '0 0 6px rgba(16, 185, 129, 0.5), 0 0 12px rgba(16, 185, 129, 0.3)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.4)'
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
                              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-8 text-sm font-bold relative overflow-hidden"
                              style={{
                                boxShadow: '0 0 6px rgba(239, 68, 68, 0.5), 0 0 12px rgba(239, 68, 68, 0.3)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.4)'
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
                              className="flex-1 bg-gradient-to-r from-[#ff0066] to-[#ff0066] hover:from-[#ff0066] hover:to-[#ff0066] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 h-8 text-sm font-bold relative overflow-hidden"
                              style={{
                                boxShadow: '0 0 6px rgba(59, 130, 246, 0.5), 0 0 12px rgba(59, 130, 246, 0.3)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                textShadow: '0 0 4px rgba(255, 255, 255, 0.8), 0 0 8px rgba(255, 255, 255, 0.4)'
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
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="text-white font-bold mb-1" style={{
                              color: '#ffffff',
                              textShadow: '0 0 4px rgba(255, 255, 255, 0.6)'
                            }}>NFT ID</div>
                            <div className="text-white font-bold" style={{
                              color: '#ffffff',
                              textShadow: '0 0 4px rgba(255, 255, 255, 0.8)'
                            }}>#{position.tokenId}</div>
                          </div>
                          <div>
                            <div className="text-white font-bold mb-1" style={{
                              color: '#ffffff',
                              textShadow: '0 0 4px rgba(255, 255, 255, 0.6)'
                            }}>Fee Tier</div>
                            <div className="text-white font-bold" style={{
                              color: '#ffffff',
                              textShadow: '0 0 4px rgba(255, 255, 255, 0.8)'
                            }}>{(position.fee / 10000).toFixed(2)}%</div>
                          </div>
                          <div>
                            <div className="text-white font-bold mb-1" style={{
                              color: '#ffffff',
                              textShadow: '0 0 4px rgba(255, 255, 255, 0.6)'
                            }}>Range</div>
                            <div className="text-white font-bold" style={{
                              color: '#ffffff',
                              textShadow: '0 0 4px rgba(255, 255, 255, 0.8)'
                            }}>
                              {position.tickLower === -887220 && position.tickUpper === 887220 
                                ? 'Full Range' 
                                : 'Concentrated'
                              }
                            </div>
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
      {/* Uniswap-Style Position Management Modal */}
      {selectedPosition && managementMode && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {managementMode === 'increase' && 'Add Liquidity'}
                  {managementMode === 'decrease' && 'Remove Liquidity'}
                  {managementMode === 'collect' && 'Collect Fees'}
                </h2>
                <p className="text-sm text-gray-400 mt-1">Position #{selectedPosition}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPosition(null);
                  setManagementMode(null);
                  setAmount0('');
                  setAmount1('');
                  setLiquidityAmount('');
                }}
                className="text-gray-400 hover:text-white hover:bg-gray-800 p-2"
              >
                ×
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              {managementMode === 'increase' && (
                <div className="space-y-4">
                  {/* ETH Input */}
                  <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">Ξ</span>
                        </div>
                        <span className="text-white font-medium">ETH</span>
                      </div>
                      <span className="text-gray-400 text-sm">Balance: 0.0000</span>
                    </div>
                    <Input
                      type="number"
                      value={amount1}
                      onChange={(e) => setAmount1(e.target.value)}
                      placeholder="0.0"
                      className="bg-transparent border-0 text-white text-2xl font-medium p-0 h-auto focus:ring-0 focus:outline-0"
                    />
                  </div>

                  {/* KILT Input */}
                  <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">K</span>
                        </div>
                        <span className="text-white font-medium">KILT</span>
                      </div>
                      <span className="text-gray-400 text-sm">Balance: 0.0000</span>
                    </div>
                    <Input
                      type="number"
                      value={amount0}
                      onChange={(e) => setAmount0(e.target.value)}
                      placeholder="0.0"
                      className="bg-transparent border-0 text-white text-2xl font-medium p-0 h-auto focus:ring-0 focus:outline-0"
                    />
                  </div>
                </div>
              )}

              {managementMode === 'decrease' && (
                <div className="space-y-4">
                  <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">Amount to Remove</span>
                      <span className="text-gray-400 text-sm">Max</span>
                    </div>
                    <Input
                      type="number"
                      value={liquidityAmount}
                      onChange={(e) => setLiquidityAmount(e.target.value)}
                      placeholder="0"
                      className="bg-transparent border-0 text-white text-2xl font-medium p-0 h-auto focus:ring-0 focus:outline-0 mb-3"
                    />
                    <span className="text-gray-400 text-sm">%</span>
                    
                    <div className="flex gap-2 mt-4">
                      {[25, 50, 75, 100].map((percentage) => (
                        <Button
                          key={percentage}
                          variant="outline"
                          size="sm"
                          onClick={() => setLiquidityAmount(percentage.toString())}
                          className={`flex-1 ${
                            liquidityAmount === percentage.toString()
                              ? 'bg-pink-600 border-pink-600 text-white'
                              : 'border-gray-600 text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          {percentage}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {managementMode === 'collect' && (
                <div className="space-y-4">
                  <p className="text-gray-400 text-sm">Available fees to collect:</p>
                  <div className="space-y-2">
                    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">Ξ</span>
                          </div>
                          <span className="text-white">ETH</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white">0.001</div>
                          <div className="text-gray-400 text-sm">$3.64</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">K</span>
                          </div>
                          <span className="text-white">KILT</span>
                        </div>
                        <div className="text-right">
                          <div className="text-white">234</div>
                          <div className="text-gray-400 text-sm">$4.22</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-6">
                <Button
                  onClick={handleLiquidityManagement}
                  disabled={isProcessing || 
                    (managementMode === 'increase' && (!amount0 || !amount1)) ||
                    (managementMode === 'decrease' && !liquidityAmount)
                  }
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-medium py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {managementMode === 'increase' && 'Add Liquidity'}
                      {managementMode === 'decrease' && 'Remove Liquidity'}
                      {managementMode === 'collect' && 'Collect Fees'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
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
