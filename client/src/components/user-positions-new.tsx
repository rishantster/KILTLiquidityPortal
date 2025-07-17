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
import { UniswapPositionCard } from './uniswap-position-card';

interface UniswapPosition {
  tokenId: string;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  token0: string;
  token1: string;
  amount0: string;
  amount1: string;
  currentValueUSD?: number;
  poolAddress?: string;
  fees?: {
    token0: string;
    token1: string;
  };
  isActive?: boolean;
  isRegistered?: boolean;
  poolType?: string;
  isKiltPosition?: boolean;
  fee?: number;
}

const UserPositionsNew = () => {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClosedPositions, setShowClosedPositions] = useState(false);
  
  // Use Uniswap API for accurate position data - auto-load when wallet connected
  const { 
    data: allPositions = [], 
    isLoading: uniswapLoading,
    refetch: refetchPositions,
    error: positionsError,
    isFetching
  } = useQuery({
    queryKey: ['wallet-positions', address],
    queryFn: async () => {
      if (!address) return [];
      const response = await fetch(`/api/positions/wallet/${address}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.status}`);
      }
      const positions = await response.json();
      return positions || [];
    },
    enabled: !!address && !!isConnected,
    staleTime: 0, // No cache - always fetch fresh data
    refetchInterval: 15000, // Refresh every 15 seconds for fee updates
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnReconnect: true, // Refetch when reconnecting
    retry: 2,
    retryDelay: 1000
  });
  
  const { 
    registerPosition, 
    isRegistering 
  } = usePositionRegistration();

  // Invalidate cache when wallet connection changes to ensure fresh data
  useEffect(() => {
    if (isConnected && address) {
      queryClient.invalidateQueries({ queryKey: ['wallet-positions', address] });
    }
  }, [address, isConnected, queryClient]);

  // No need for separate registered positions query - included in main query

  // Filter for KILT positions - instant positions are already filtered
  const kiltPositions = allPositions || [];

  const openPositions = kiltPositions.filter(position => 
    position.liquidity && Number(position.liquidity) > 0
  );
  const closedPositions = kiltPositions.filter(position => 
    !position.liquidity || Number(position.liquidity) === 0
  );
  const displayPositions = showClosedPositions ? kiltPositions : openPositions;

  const calculatePositionValue = (position: any): number => {
    if (position.currentValueUSD && typeof position.currentValueUSD === 'number') {
      return position.currentValueUSD;
    }
    
    // Convert wei to readable format and calculate value
    const amount0Decimal = position.amount0 ? parseFloat(formatUnits(BigInt(position.amount0), 18)) : 0; // ETH has 18 decimals
    const amount1Decimal = position.amount1 ? parseFloat(formatUnits(BigInt(position.amount1), 18)) : 0; // KILT has 18 decimals
    
    // Calculate USD value using current prices
    const amount0Value = amount0Decimal * 3400; // ETH price estimate
    const amount1Value = amount1Decimal * 0.01718; // KILT price from API
    
    return amount0Value + amount1Value;
  };

  const isPositionInRange = (position: any): boolean => {
    // Position is in range if it has liquidity
    return position.liquidity && Number(position.liquidity) > 0;
  };

  const isPositionRegistered = (position: any): boolean => {
    // Use the isRegistered field directly from the enhanced API response
    return position.isRegistered || false;
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
        nftTokenId: position.tokenId || '0',
        poolAddress: position.poolAddress || '',
        token0Address: position.token0 || '',
        token1Address: position.token1 || '',
        amount0: position.amount0 || '0',
        amount1: position.amount1 || '0',
        liquidity: position.liquidity || '0',
        currentValueUSD: calculatePositionValue(position),
        feeTier: 3000, // Default fee tier
        originalCreationDate: new Date().toISOString()
      };

      await registerPosition(positionData);
      
      // Refresh the positions query
      queryClient.invalidateQueries({ queryKey: ['uniswap-positions'] });
      
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
      // Force refresh by invalidating cache first
      queryClient.invalidateQueries({ queryKey: ['wallet-positions', address] });
      await refetchPositions();
      toast({
        title: "Positions Refreshed",
        description: `Found ${allPositions.length} positions`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh positions",
        variant: "destructive"
      });
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
            {displayPositions.map((position) => (
              <UniswapPositionCard 
                key={position.tokenId || Math.random()}
                position={position}
                onAddLiquidity={(pos) => {
                  toast({
                    title: "Add Liquidity",
                    description: `Adding liquidity to position #${pos.tokenId}`,
                  });
                }}
                onRemoveLiquidity={(pos) => {
                  toast({
                    title: "Remove Liquidity", 
                    description: `Removing liquidity from position #${pos.tokenId}`,
                  });
                }}
                onCollectFees={(pos) => {
                  toast({
                    title: "Collect Fees",
                    description: `Collecting fees from position #${pos.tokenId}`,
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPositionsNew;