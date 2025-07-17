import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Plus, 
  Minus, 
  DollarSign, 
  TrendingUp, 
  Eye, 
  EyeOff,
  Settings,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/contexts/wallet-context';
import { formatNumber } from '@/lib/utils';
import { PositionRangeChart } from './position-range-chart';
import { EthereumLogo } from './ethereum-logo';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

interface MobilePosition {
  id: string;
  nftTokenId: string;
  token0Amount: string;
  token1Amount: string;
  currentValueUsd: number;
  feeEarned: number;
  tickLower: number;
  tickUpper: number;
  currentTick: number;
  isInRange: boolean;
  isActive: boolean;
  poolType: string;
  createdAt: string;
  token0Symbol: string;
  token1Symbol: string;
  feeTier: string;
  apr?: number;
}

interface MobilePositionsProps {
  showClosed?: boolean;
}

const MobileSkeletonCard = () => (
  <Card className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border-gray-700/30 backdrop-blur-sm animate-pulse">
    <CardHeader className="p-2 pb-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-600 rounded-full"></div>
          <div className="w-16 h-3 bg-gray-600 rounded"></div>
        </div>
        <div className="w-12 h-4 bg-gray-600 rounded"></div>
      </div>
    </CardHeader>
    <CardContent className="p-2 space-y-2">
      <div className="h-8 bg-gray-600 rounded"></div>
      <div className="flex justify-between">
        <div className="w-16 h-4 bg-gray-600 rounded"></div>
        <div className="w-20 h-4 bg-gray-600 rounded"></div>
      </div>
      <div className="flex space-x-1">
        <div className="flex-1 h-6 bg-gray-600 rounded"></div>
        <div className="flex-1 h-6 bg-gray-600 rounded"></div>
      </div>
    </CardContent>
  </Card>
);

const MobilePositionCard = ({ position }: { position: MobilePosition }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isManaging, setIsManaging] = useState(false);

  const statusColor = position.isActive 
    ? (position.isInRange ? 'bg-green-500' : 'bg-yellow-500')
    : 'bg-gray-500';

  const statusText = position.isActive
    ? (position.isInRange ? 'In Range' : 'Out of Range')
    : 'Closed';

  return (
    <Card className={`bg-gradient-to-br from-gray-800/30 to-gray-900/30 border-gray-700/30 backdrop-blur-sm transition-all duration-300 ${
      position.isActive ? 'hover:from-gray-700/40 hover:to-gray-800/40' : 'opacity-70'
    }`}>
      <CardHeader className="p-2 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <img src={kiltLogo} alt="KILT" className="w-4 h-4" />
              <EthereumLogo className="w-4 h-4" />
            </div>
            <div className="text-xs text-white font-medium">
              {position.token0Symbol}/{position.token1Symbol}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span className="text-xs text-white/70">{statusText}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 space-y-2">
        {/* Position Value */}
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            ${formatNumber(position.currentValueUsd)}
          </div>
          <div className="text-xs text-white/60">
            NFT #{position.nftTokenId} • {position.feeTier}% fee
          </div>
        </div>

        {/* Token Amounts */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-pink-500/10 border border-pink-500/20 rounded p-1.5">
            <div className="flex items-center space-x-1 mb-1">
              <img src={kiltLogo} alt="KILT" className="w-3 h-3" />
              <span className="text-white/70">KILT</span>
            </div>
            <div className="text-white font-medium">
              {formatNumber(parseFloat(position.token0Amount))}
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded p-1.5">
            <div className="flex items-center space-x-1 mb-1">
              <EthereumLogo className="w-3 h-3" />
              <span className="text-white/70">ETH</span>
            </div>
            <div className="text-white font-medium">
              {formatNumber(parseFloat(position.token1Amount), 6)}
            </div>
          </div>
        </div>

        {/* Range Visualization */}
        <div className="bg-black/20 rounded p-2">
          <div className="text-xs text-white/70 mb-1">Price Range</div>
          <PositionRangeChart
            tickLower={position.tickLower}
            tickUpper={position.tickUpper}
            currentTick={position.currentTick}
            isInRange={position.isInRange}
            className="h-6"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-1">
          <Button
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 border-gray-600/50 text-xs py-1 h-6"
          >
            {isExpanded ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
            {isExpanded ? 'Less' : 'More'}
          </Button>
          {position.isActive && (
            <Button
              size="sm"
              onClick={() => setIsManaging(!isManaging)}
              className="flex-1 bg-emerald-600/50 hover:bg-emerald-500/50 border-emerald-500/50 text-xs py-1 h-6"
            >
              <Settings className="w-3 h-3 mr-1" />
              Manage
            </Button>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-2 pt-2 border-t border-gray-700/50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-white/60">Fees Earned</div>
                <div className="text-emerald-400 font-medium">
                  ${formatNumber(position.feeEarned)}
                </div>
              </div>
              <div>
                <div className="text-white/60">Created</div>
                <div className="text-white/80">
                  {new Date(position.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            {position.apr && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded p-1.5">
                <div className="text-white/70 text-xs">Estimated APR</div>
                <div className="text-purple-400 font-medium">
                  {position.apr.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        )}

        {/* Management Panel */}
        {isManaging && position.isActive && (
          <div className="space-y-2 pt-2 border-t border-gray-700/50">
            <div className="grid grid-cols-2 gap-1">
              <Button
                size="sm"
                className="bg-blue-600/50 hover:bg-blue-500/50 text-xs py-1 h-6"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
              <Button
                size="sm"
                className="bg-red-600/50 hover:bg-red-500/50 text-xs py-1 h-6"
              >
                <Minus className="w-3 h-3 mr-1" />
                Remove
              </Button>
            </div>
            <Button
              size="sm"
              className="w-full bg-green-600/50 hover:bg-green-500/50 text-xs py-1 h-6"
            >
              <DollarSign className="w-3 h-3 mr-1" />
              Collect Fees
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const MobileOptimizedPositions: React.FC<MobilePositionsProps> = ({ showClosed = false }) => {
  const { address } = useWallet();
  const [showClosedPositions, setShowClosedPositions] = useState(showClosed);
  const [refreshing, setRefreshing] = useState(false);

  const { data: positions, isLoading, error, refetch } = useQuery({
    queryKey: ['mobile-positions', address],
    queryFn: async () => {
      if (!address) return [];
      const response = await fetch(`/api/positions/wallet/${address}`);
      if (!response.ok) throw new Error('Failed to fetch positions');
      return response.json();
    },
    enabled: !!address,
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000, // 15 seconds
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredPositions = useMemo(() => {
    if (!positions) return [];
    return showClosedPositions 
      ? positions 
      : positions.filter((p: MobilePosition) => p.isActive);
  }, [positions, showClosedPositions]);

  const positionCounts = useMemo(() => {
    if (!positions) return { total: 0, active: 0, closed: 0 };
    const active = positions.filter((p: MobilePosition) => p.isActive).length;
    const closed = positions.filter((p: MobilePosition) => !p.isActive).length;
    return { total: positions.length, active, closed };
  }, [positions]);

  if (!address) {
    return (
      <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border-gray-700/30 backdrop-blur-sm rounded-lg p-4 text-center">
        <Wallet className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-white/70 text-sm">Connect wallet to view positions</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 border-red-700/30 backdrop-blur-sm rounded-lg p-4 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
        <p className="text-red-300 text-sm">Failed to load positions</p>
        <Button
          size="sm"
          onClick={handleRefresh}
          className="mt-2 bg-red-600/50 hover:bg-red-500/50 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-white">Your Positions</h3>
          {positionCounts.total > 0 && (
            <Badge className="bg-gray-700/50 text-white/70 text-xs px-2 py-0.5">
              {positionCounts.active} active, {positionCounts.closed} closed
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {positionCounts.closed > 0 && (
            <Button
              size="sm"
              onClick={() => setShowClosedPositions(!showClosedPositions)}
              className="bg-gray-700/50 hover:bg-gray-600/50 text-xs py-1 h-6 px-2"
            >
              {showClosedPositions ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
              {showClosedPositions ? 'Hide' : 'Show'} Closed
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600/50 hover:bg-blue-500/50 text-xs py-1 h-6 px-2"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <MobileSkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Positions List */}
      {!isLoading && filteredPositions.length > 0 && (
        <div className="space-y-2">
          {filteredPositions.map((position: MobilePosition) => (
            <MobilePositionCard key={position.id} position={position} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPositions.length === 0 && (
        <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border-gray-700/30 backdrop-blur-sm rounded-lg p-4 text-center">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-white/70 text-sm mb-2">
            {showClosedPositions 
              ? 'No positions found'
              : positionCounts.closed > 0
                ? 'No active positions'
                : 'No KILT positions yet'
            }
          </p>
          <Button
            size="sm"
            className="bg-emerald-600/50 hover:bg-emerald-500/50 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Liquidity
          </Button>
        </div>
      )}
    </div>
  );
};