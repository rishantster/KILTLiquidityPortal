import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, RefreshCw, TrendingUp, TrendingDown, Eye, DollarSign, Clock, Activity, ExternalLink } from 'lucide-react';
import { useUniswapV3Positions } from '@/hooks/use-uniswap-v3';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@/contexts/wallet-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  
  const { 
    positions: allPositions, 
    isLoading: uniswapLoading,
    refetch: refetchPositions 
  } = useUniswapV3Positions();
  
  const { 
    registerPosition, 
    isRegistering 
  } = usePositionRegistration();

  // Filter for KILT positions
  const kiltPositions = allPositions?.filter(position => {
    const isKiltPosition = position.token0?.toLowerCase().includes('5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8') || 
                           position.token1?.toLowerCase().includes('5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8');
    return isKiltPosition;
  }) || [];

  const openPositions = kiltPositions.filter(position => position.liquidity > 0n);
  const closedPositions = kiltPositions.filter(position => position.liquidity === 0n);
  const displayPositions = showClosedPositions ? kiltPositions : openPositions;

  const calculatePositionValue = (position: UniswapPosition): number => {
    if (position.currentValueUSD) return position.currentValueUSD;
    
    // Simplified calculation - in real implementation, use actual token prices
    const amount0Value = position.amount0 ? parseFloat(formatUnits(position.amount0, 18)) * 0.016 : 0; // KILT price estimate
    const amount1Value = position.amount1 ? parseFloat(formatUnits(position.amount1, 18)) * 2500 : 0; // ETH price estimate
    
    return amount0Value + amount1Value;
  };

  const isPositionInRange = (position: UniswapPosition): boolean => {
    // Simplified range check - in real implementation, check against current pool price
    return position.liquidity > 0n;
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

  const handleRegisterPosition = async (position: UniswapPosition) => {
    try {
      const positionData = {
        nftTokenId: position.tokenId.toString(),
        poolAddress: position.poolAddress || '',
        token0Address: position.token0,
        token1Address: position.token1,
        amount0: position.amount0?.toString() || '0',
        amount1: position.amount1?.toString() || '0',
        minPrice: '0', // Could be calculated from tickLower
        maxPrice: '0', // Could be calculated from tickUpper
        liquidity: position.liquidity.toString(),
        currentValueUSD: position.currentValueUSD || calculatePositionValue(position),
        feeTier: 3000, // Default fee tier
        createdAt: new Date(),
      };
      
      await registerPosition(positionData);
      toast({
        title: "Success",
        description: "Position registered for rewards",
      });
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to register position",
        variant: "destructive",
      });
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
          <div className="position-grid-4">
            {displayPositions.map((position) => {
              const positionValue = calculatePositionValue(position);
              const inRange = isPositionInRange(position);
              const isClosed = position.liquidity === 0n;
              
              return (
                <div key={position.tokenId.toString()} className={`position-card ${
                  isClosed 
                    ? 'bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-400/20' 
                    : 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 border-blue-400/20'
                } rounded border p-2 backdrop-blur-sm hover:bg-gradient-to-br hover:from-blue-500/20 hover:via-purple-500/20 hover:to-emerald-500/20 transition-all`}>
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-bold text-xs">#{position.tokenId.toString()}</div>
                    <div className="text-white font-bold text-xs">${positionValue.toFixed(2)}</div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1">
                      <TokenLogo symbol="KILT" className="w-3 h-3" />
                      <span className="text-white/80 text-xs font-medium">KILT</span>
                    </div>
                    <div className="text-white/80 text-xs">
                      {position.amount0 ? parseFloat(formatUnits(position.amount0, 18)).toFixed(2) : '0.00'}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1">
                      <TokenLogo symbol="ETH" className="w-3 h-3" />
                      <span className="text-white/80 text-xs font-medium">ETH</span>
                    </div>
                    <div className="text-white/80 text-xs">
                      {position.amount1 ? parseFloat(formatUnits(position.amount1, 18)).toFixed(4) : '0.0000'}
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <PositionRangeChart
                      tickLower={position.tickLower}
                      tickUpper={position.tickUpper}
                      currentTick={0}
                      height={32}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={inRange ? "default" : "secondary"} className="text-xs px-1 py-0">
                      {inRange ? "In" : "Out"}
                    </Badge>
                    <Badge variant={isClosed ? "outline" : "default"} className="text-xs px-1 py-0">
                      {isClosed ? "Closed" : "Open"}
                    </Badge>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => handleRegisterPosition(position)}
                      disabled={isRegistering}
                      className="flex-1 h-6 px-2 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white text-xs"
                    >
                      Register
                    </Button>
                    <Button
                      onClick={() => window.open(`https://app.uniswap.org/pools/${position.tokenId}`, '_blank')}
                      className="h-6 px-2 bg-white/10 hover:bg-white/20 text-white text-xs"
                    >
                      <ExternalLink className="h-3 w-3" />
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