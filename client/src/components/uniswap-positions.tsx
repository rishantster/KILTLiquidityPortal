import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Minus, DollarSign, Eye, EyeOff } from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { useQuery } from '@tanstack/react-query';
import { formatNumber } from '@/lib/utils';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

const EthereumLogo = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 256 417" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M127.961 0L125.44 8.55656V285.168L127.961 287.688L255.922 212.32L127.961 0Z" fill="#627EEA"/>
    <path d="M127.962 0L0 212.32L127.962 287.688V153.864V0Z" fill="#627EEA"/>
    <path d="M127.961 312.187L126.385 314.154V415.484L127.961 417L255.922 237.832L127.961 312.187Z" fill="#627EEA"/>
    <path d="M127.962 417V312.187L0 237.832L127.962 417Z" fill="#627EEA"/>
    <path d="M127.961 287.688L255.922 212.32L127.961 153.864V287.688Z" fill="#627EEA"/>
    <path d="M0 212.32L127.962 287.688V153.864L0 212.32Z" fill="#627EEA"/>
  </svg>
);

interface Position {
  id: string;
  nftTokenId: string;
  tokenAmountKilt: string;
  tokenAmountEth: string;
  currentValueUsd: number;
  isActive: boolean;
  priceRangeLower: number;
  priceRangeUpper: number;
  feeTier: number;
  liquidity: string;
  inRange: boolean;
}

// Generate curved range visualization SVG
const RangeVisualization = ({ 
  minPrice, 
  maxPrice, 
  currentPrice, 
  inRange 
}: { 
  minPrice: number; 
  maxPrice: number; 
  currentPrice: number; 
  inRange: boolean;
}) => {
  const width = 400;
  const height = 120;
  const padding = 20;
  
  // Calculate positions
  const minX = padding;
  const maxX = width - padding;
  const currentX = minX + ((currentPrice - minPrice) / (maxPrice - minPrice)) * (maxX - minX);
  
  return (
    <svg width={width} height={height} className="w-full h-full">
      {/* Background gradient */}
      <defs>
        <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      
      {/* Curved range path */}
      <path
        d={`M ${minX} ${height - 30} Q ${width/2} ${height - 80} ${maxX} ${height - 30}`}
        stroke={inRange ? "#10B981" : "#6B7280"}
        strokeWidth="3"
        fill="none"
        className="drop-shadow-sm"
      />
      
      {/* Range area fill */}
      <path
        d={`M ${minX} ${height - 30} Q ${width/2} ${height - 80} ${maxX} ${height - 30} L ${maxX} ${height - 20} Q ${width/2} ${height - 50} ${minX} ${height - 20} Z`}
        fill="url(#curveGradient)"
        opacity="0.4"
      />
      
      {/* Current price indicator */}
      <circle
        cx={currentX}
        cy={height - 50}
        r="6"
        fill={inRange ? "#10B981" : "#EF4444"}
        stroke="white"
        strokeWidth="2"
        className="drop-shadow-md"
      />
      
      {/* Price labels */}
      <text x={minX} y={height - 10} className="fill-white/60 text-xs" textAnchor="middle">
        Min: {minPrice.toFixed(4)}
      </text>
      <text x={maxX} y={height - 10} className="fill-white/60 text-xs" textAnchor="middle">
        Max: {maxPrice.toFixed(4)}
      </text>
      <text x={width/2} y={height - 10} className="fill-white/80 text-xs" textAnchor="middle">
        Current: {currentPrice.toFixed(4)}
      </text>
    </svg>
  );
};

const PositionCard = ({ position }: { position: Position }) => {
  const kiltAmount = parseFloat(position.tokenAmountKilt || '0');
  const ethAmount = parseFloat(position.tokenAmountEth || '0');
  const currentPrice = 0.0176; // From API
  
  return (
    <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:from-gray-700/50 hover:to-gray-800/50 transition-all duration-300">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">#{position.nftTokenId}</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">NFT #{position.nftTokenId}</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className={`${position.inRange ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {position.inRange ? 'In Range' : 'Out of Range'}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  KILT/ETH
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">${formatNumber(position.currentValueUsd || 0)}</div>
            <div className="text-sm text-white/60">{formatNumber(parseFloat(position.liquidity || '0'))} L</div>
          </div>
        </div>

        {/* Token Amounts */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <EthereumLogo className="w-4 h-4" />
              <span className="text-white/70">ETH</span>
            </div>
            <span className="text-white font-medium">{formatNumber(ethAmount, 4)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src={kiltLogo} alt="KILT" className="w-4 h-4" />
              <span className="text-white/70">KILT</span>
            </div>
            <span className="text-white font-medium">{formatNumber(kiltAmount, 4)}</span>
          </div>
        </div>

        {/* Fee Tier */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/70">Fee Tier</span>
          <span className="text-white font-medium">{position.feeTier}%</span>
        </div>

        {/* Range Visualization */}
        <div className="mb-4">
          <div className="text-sm text-white/60 mb-2">Range (ETH/KILT)</div>
          <div className="bg-gradient-to-br from-gray-900/80 to-purple-900/40 rounded-lg p-4 h-32">
            <RangeVisualization
              minPrice={position.priceRangeLower}
              maxPrice={position.priceRangeUpper}
              currentPrice={currentPrice}
              inRange={position.inRange}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 border-green-500/30"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/30"
          >
            <Minus className="w-4 h-4 mr-1" />
            Remove
          </Button>
          <Button 
            size="sm" 
            className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-500/30"
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Collect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function UniswapPositions() {
  const { address, isConnected } = useWallet();
  const [showClosed, setShowClosed] = useState(false);

  // Fast position fetch
  const { data: positions = [], isLoading, refetch } = useQuery({
    queryKey: ['fast-positions', address],
    queryFn: async () => {
      if (!address) return [];
      
      const response = await fetch(`/api/positions/fast/${address}`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.map((pos: any) => ({
        id: pos.id,
        nftTokenId: pos.nftTokenId,
        tokenAmountKilt: pos.tokenAmountKilt || '0',
        tokenAmountEth: pos.tokenAmountEth || '0',
        currentValueUsd: pos.currentValueUsd || 0,
        isActive: pos.isActive,
        priceRangeLower: pos.priceRangeLower || 0.0141,
        priceRangeUpper: pos.priceRangeUpper || 0.0211,
        feeTier: pos.feeTier || 0.3,
        liquidity: pos.liquidity || '0',
        inRange: pos.inRange || false
      }));
    },
    enabled: !!address && isConnected,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });

  const filteredPositions = showClosed 
    ? positions 
    : positions.filter(pos => pos.isActive);

  const openCount = positions.filter(pos => pos.isActive).length;
  const totalCount = positions.length;

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60 mb-4">Connect your wallet to view positions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-semibold text-white">Your KILT LP Positions</h2>
          <Badge variant="outline" className="bg-gray-700/50 text-white/80">
            {totalCount} positions ({openCount} open)
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {totalCount > openCount && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClosed(!showClosed)}
              className="bg-gray-700/50 hover:bg-gray-600/50"
            >
              {showClosed ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showClosed ? 'Hide' : 'Show'} Closed
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="bg-gray-700/50 hover:bg-gray-600/50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Positions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-gray-800/50 border-gray-700/50 animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-gray-700/30 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPositions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPositions.map((position) => (
            <PositionCard key={position.id} position={position} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-white/60 mb-4">
            {showClosed ? 'No positions found' : 'No active positions'}
          </p>
          <Button className="bg-emerald-600 hover:bg-emerald-500">
            <Plus className="w-4 h-4 mr-2" />
            Add Liquidity
          </Button>
        </div>
      )}
    </div>
  );
}