import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, RefreshCw, TrendingUp, TrendingDown, Eye, DollarSign, Clock, Activity, ExternalLink, CheckCircle } from 'lucide-react';
import { useInstantPositions } from '@/hooks/use-instant-positions';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/wallet-context';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { usePositionRegistration } from '@/hooks/use-position-registration';
import { formatUnits } from 'viem';
import { PositionRangeChart } from './position-range-chart';
import { TokenLogo } from './ui/token-logo';

interface UniswapPosition {
  tokenId: bigint;
  liquidity: bigint;
  tickLower: number;
  tickUpper: number;
  token0: string;
  token1: string;
  amount0: bigint;
  amount1: bigint;
  currentValueUSD?: number;
  poolAddress?: string;
  fees?: {
    token0: bigint;
    token1: bigint;
  };
}

const UserPositionsNew = () => {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClosedPositions, setShowClosedPositions] = useState(false);
  
  // Use Uniswap API for accurate position data
  const { 
    data: allPositions = [], 
    isLoading: uniswapLoading,
    refetch: refetchPositions 
  } = useQuery({
    queryKey: ['uniswap-positions', address],
    queryFn: async () => {
      if (!address) return [];
      const response = await fetch(`/api/positions/wallet/${address}`);
      if (!response.ok) return [];
      const positions = await response.json();
      return positions;
    },
    enabled: !!address,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000 // Refresh every minute
  });
  
  const { 
    registerPosition, 
    isRegistering 
  } = usePositionRegistration();

  // Get registered positions to check status
  const { data: registeredPositions = [] } = useQuery({
    queryKey: ['registered-positions', address],
    queryFn: async () => {
      if (!address) return [];
      const response = await fetch(`/api/positions/wallet/${address}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!address
  });

  // Filter for KILT positions - instant positions are already filtered
  const kiltPositions = allPositions || [];

  const openPositions = kiltPositions.filter(position => 
    position.isActive && position.liquidity && parseInt(position.liquidity) > 0
  );
  const closedPositions = kiltPositions.filter(position => 
    !position.isActive || !position.liquidity || parseInt(position.liquidity) === 0
  );
  const displayPositions = showClosedPositions ? kiltPositions : openPositions;

  const calculatePositionValue = (position: any): number => {
    if (position.currentValueUSD && typeof position.currentValueUSD === 'number') {
      return position.currentValueUSD;
    }
    
    // Estimate value from token amounts using accurate prices
    const amount0Value = position.amount0 ? parseFloat(formatUnits(BigInt(position.amount0), 18)) * 0.01718 : 0; // KILT price from API
    const amount1Value = position.amount1 ? parseFloat(formatUnits(BigInt(position.amount1), 18)) * 3400 : 0; // ETH price estimate
    
    return amount0Value + amount1Value;
  };

  const isPositionInRange = (position: any): boolean => {
    // For instant positions, use the isActive field
    return position.isActive || false;
  };

  const isPositionRegistered = (position: any): boolean => {
    if (!position.tokenId) return false;
    return registeredPositions.some(
      (registered: any) => registered.nftTokenId === position.tokenId.toString()
    );
  };

  const handleRegisterPosition = async (position: UniswapPosition) => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Transform the position data to match the expected format
      const positionData = {
        userId: null, // Will be resolved by the hook
        userAddress: address,
        nftTokenId: position.tokenId && typeof position.tokenId === 'bigint' ? position.tokenId.toString() : '0',
        poolAddress: position.poolAddress || '',
        token0Address: position.token0 || '',
        token1Address: position.token1 || '',
        amount0: position.amount0 && typeof position.amount0 === 'bigint' ? position.amount0.toString() : '0',
        amount1: position.amount1 && typeof position.amount1 === 'bigint' ? position.amount1.toString() : '0',
        liquidity: position.liquidity && typeof position.liquidity === 'bigint' ? position.liquidity.toString() : '0',
        currentValueUSD: calculatePositionValue(position),
        feeTier: 3000, // Default fee tier
        originalCreationDate: new Date().toISOString()
      };

      await registerPosition(positionData);
      
      // Refresh the registered positions query
      queryClient.invalidateQueries({ queryKey: ['registered-positions'] });
      
      toast({
        title: "Success",
        description: "Position registered successfully!",
      });
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : 'Failed to register position',
        variant: "destructive"
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchPositions();
      await queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 rounded-lg p-8 text-center">
        <p className="text-white/60 text-sm">Connect your wallet to view your positions</p>
      </div>
    );
  }

  if (uniswapLoading) {
    return (
      <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Coins className="h-5 w-5 text-blue-400" />
          <h3 className="text-white font-bold text-lg">Your KILT LP Positions</h3>
        </div>
        <div className="position-grid-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="position-card bg-white/5 rounded p-3">
              <div className="animate-pulse">
                <div className="h-4 bg-white/10 rounded mb-2"></div>
                <div className="h-3 bg-white/10 rounded mb-1"></div>
                <div className="h-3 bg-white/10 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Coins className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Your KILT LP Positions</h3>
              <p className="text-white/60 text-sm">Real-time Uniswap V3 positions containing KILT token</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-emerald-400">Live</span>
            </div>
            
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 px-3 bg-white/10 hover:bg-white/20 text-white border-white/20 text-sm"
            >
              {isRefreshing ? (
                <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-white/60">
              <span>{kiltPositions.length} KILT positions ({openPositions.length} open)</span>
            </div>
            
            {closedPositions.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-white/60">Show Closed</span>
                <button
                  onClick={() => setShowClosedPositions(!showClosedPositions)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    showClosedPositions ? 'bg-blue-600' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      showClosedPositions ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Positions Grid */}
      <div className="w-full">
        {displayPositions.length === 0 ? (
          <div className="text-center py-8 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/10 rounded-lg">
            <p className="text-white/60 text-lg">No KILT positions found</p>
            <p className="text-white/40 text-sm">Add liquidity to pools containing KILT token to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayPositions.map((position) => {
              const positionValue = calculatePositionValue(position);
              const inRange = isPositionInRange(position);
              const isClosed = !position.liquidity || typeof position.liquidity !== 'bigint' || position.liquidity === 0n;
              
              return (
                <div key={position.tokenId && typeof position.tokenId === 'bigint' ? position.tokenId.toString() : Math.random()} className={`group relative ${
                  isClosed 
                    ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-600/30' 
                    : 'bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-emerald-600/10 border-blue-400/30'
                } rounded-2xl border backdrop-blur-sm shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-500 hover:scale-105 hover:border-cyan-400/50 p-6 overflow-hidden`}>
                  
                  {/* Glowing border animation */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
                  
                  {/* Header section */}
                  <div className="relative space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400 font-mono">
                        ID: {position.tokenId || 'N/A'}
                      </div>
                      <div className="text-2xl font-bold text-white bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        ${(positionValue || 0).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="text-xl font-bold text-white mb-4">
                      KILT/WETH
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <TokenLogo token="KILT" className="w-5 h-5" />
                          <span className="text-white/90 text-sm font-medium">KILT</span>
                        </div>
                        <div className="text-white font-semibold">
                          {position.amount0 && position.amount0 !== '0' 
                            ? parseFloat(formatUnits(BigInt(position.amount0), 18)).toFixed(2) 
                            : '0.00'}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <TokenLogo token="ETH" className="w-5 h-5" />
                          <span className="text-white/90 text-sm font-medium">WETH</span>
                        </div>
                        <div className="text-white font-semibold">
                          {position.amount1 && position.amount1 !== '0' 
                            ? parseFloat(formatUnits(BigInt(position.amount1), 18)).toFixed(4) 
                            : '0.0000'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Range Visualization */}
                  <div className="my-4">
                    <div className="text-sm text-gray-400 mb-2">Price Range</div>
                    <PositionRangeChart
                      tickLower={position.tickLower}
                      tickUpper={position.tickUpper}
                      currentTick={0}
                      height={64}
                      showLabels={false}
                    />
                  </div>
                  
                  {/* Status Badges */}
                  <div className="flex items-center justify-between mb-4">
                    <Badge 
                      variant={inRange ? "default" : "secondary"} 
                      className={`text-sm px-3 py-1 ${inRange ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}
                    >
                      {inRange ? "In Range" : "Out of Range"}
                    </Badge>
                    <Badge 
                      variant={isClosed ? "outline" : "default"} 
                      className={`text-sm px-3 py-1 ${isClosed ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}
                    >
                      {isClosed ? "Closed" : "Active"}
                    </Badge>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    {isPositionRegistered(position) ? (
                      <Button
                        disabled
                        className="flex-1 h-12 bg-gradient-to-r from-emerald-500/50 to-blue-500/50 text-white font-semibold rounded-lg shadow-lg cursor-not-allowed"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Already Registered
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleRegisterPosition(position)}
                        disabled={isRegistering}
                        className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50"
                      >
                        {isRegistering ? 'Registering...' : 'Register for Rewards'}
                      </Button>
                    )}
                    <Button
                      onClick={() => window.open(`https://app.uniswap.org/pools/${position.tokenId}`, '_blank')}
                      className="h-12 px-4 bg-white/10 hover:bg-white/20 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPositionsNew;