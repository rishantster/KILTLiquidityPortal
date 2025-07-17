import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// Clean range visualization matching Uniswap's design
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
  const width = 360;
  const height = 80;
  const padding = 30;
  
  // Calculate positions
  const minX = padding;
  const maxX = width - padding;
  const currentX = minX + ((currentPrice - minPrice) / (maxPrice - minPrice)) * (maxX - minX);
  
  return (
    <svg width={width} height={height} className="w-full h-full">
      {/* Background gradient */}
      <defs>
        <linearGradient id="rangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      
      {/* Curved range path */}
      <path
        d={`M ${minX} ${height - 20} Q ${width/2} ${height - 50} ${maxX} ${height - 20}`}
        stroke="url(#rangeGradient)"
        strokeWidth="3"
        fill="none"
      />
      
      {/* Current price indicator */}
      <circle
        cx={currentX}
        cy={height - 35}
        r="4"
        fill={inRange ? "#10B981" : "#EF4444"}
        stroke="white"
        strokeWidth="1"
      />
      
      {/* Price labels */}
      <text x={minX} y={height - 5} className="fill-white/60 text-xs" textAnchor="start">
        Min: {minPrice.toFixed(4)}
      </text>
      <text x={maxX} y={height - 5} className="fill-white/60 text-xs" textAnchor="end">
        Max: {maxPrice.toFixed(4)}
      </text>
      <text x={width/2} y={height - 5} className="fill-white/80 text-xs" textAnchor="middle">
        Current: {currentPrice.toFixed(4)}
      </text>
    </svg>
  );
};

const PositionCard = ({ position }: { position: Position }) => {
  const kiltAmount = parseFloat(position.tokenAmountKilt || '0');
  const ethAmount = parseFloat(position.tokenAmountEth || '0');
  const currentPrice = 0.0176;
  
  // Calculate price range
  const minPrice = position.priceLower || 0.0150;
  const maxPrice = position.priceUpper || 0.0200;
  const currentPriceInRange = currentPrice >= minPrice && currentPrice <= maxPrice;
  
  return (
    <div className="w-full max-w-sm group">
      {/* Animated glassmorphism card with glowing edges */}
      <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-cyan-500/20 hover:border-cyan-500/30 hover:scale-105 hover:bg-white/10">
        
        {/* Glowing border animation */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/20 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
        
        {/* Header section */}
        <div className="relative p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="text-sm text-gray-400 font-mono animate-pulse">
                ID: {position.nftTokenId}
              </div>
              <div className="text-2xl font-bold text-white">
                KILT/WETH
              </div>
              <div className="text-lg text-gray-300">
                {(position.feeTier * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white tabular-nums">
                ${formatNumber(position.currentValueUsd || 1989.58)}
              </div>
              <div className={`text-xs px-3 py-1 rounded-full mt-1 backdrop-blur-sm border transition-all duration-300 ${currentPriceInRange ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30 shadow-emerald-500/20' : 'bg-red-500/20 text-red-400 border-red-400/30 shadow-red-500/20'}`}>
                {currentPriceInRange ? 'In Range' : 'Out of Range'}
              </div>
            </div>
          </div>
        </div>

        {/* Price range visualization with animations */}
        <div className="relative h-40 bg-gradient-to-br from-gray-900/30 to-gray-700/30 backdrop-blur-sm">
          {/* Animated price curve */}
          <svg width="100%" height="100%" viewBox="0 0 300 160" className="absolute inset-0">
            <defs>
              <linearGradient id="priceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6B7280" />
                <stop offset="50%" stopColor="#9CA3AF" />
                <stop offset="100%" stopColor="#6B7280" />
              </linearGradient>
            </defs>
            <path
              d="M 40 120 Q 150 40 260 120"
              stroke="url(#priceGradient)"
              strokeWidth="3"
              fill="none"
              className="transition-all duration-300 group-hover:stroke-cyan-400"
            />
            {/* Min price point */}
            <circle cx="40" cy="120" r="4" fill="#6B7280" className="transition-all duration-300 group-hover:fill-cyan-400 group-hover:r-5" />
            {/* Max price point */}
            <circle cx="260" cy="120" r="4" fill="#6B7280" className="transition-all duration-300 group-hover:fill-cyan-400 group-hover:r-5" />
            {/* Current price indicator - animated pulse */}
            <circle cx="150" cy="60" r="3" fill="#10B981" className="animate-pulse transition-all duration-300 group-hover:fill-emerald-400 group-hover:r-4">
              <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
            </circle>
          </svg>
          
          {/* Current price label with glow */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <div className="text-sm text-emerald-400 font-mono backdrop-blur-sm bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 shadow-emerald-500/20">
              ${formatNumber(currentPrice, 4)}
            </div>
          </div>
        </div>

        {/* Bottom section with glassmorphism */}
        <div className="relative p-4 pt-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="text-xs text-gray-400 mb-1">Min Tick:</div>
              <div className="text-sm font-mono text-white tabular-nums">
                ${formatNumber(minPrice, 4)}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="text-xs text-gray-400 mb-1">Max Tick:</div>
              <div className="text-sm font-mono text-white tabular-nums">
                ${formatNumber(maxPrice, 4)}
              </div>
            </div>
          </div>

          {/* Token amounts with better logo visibility */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L5 12.5L12 16.5L19 12.5L12 2Z" fill="white"/>
                    <path d="M12 18L5 13.5L12 22L19 13.5L12 18Z" fill="white"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-white">ETH</span>
              </div>
              <span className="text-sm font-mono text-white tabular-nums">
                {formatNumber(ethAmount || 0.363, 4)}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center shadow-lg p-1">
                  <img src={kiltLogo} alt="KILT" className="w-full h-full object-contain brightness-0 invert" />
                </div>
                <span className="text-sm font-medium text-white">KILT</span>
              </div>
              <span className="text-sm font-mono text-white tabular-nums">
                {formatNumber(kiltAmount || 67630, 0)}
              </span>
            </div>
          </div>

          {/* Action buttons with subtle animations */}
          <div className="flex space-x-2">
            <button className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/30 text-white font-medium py-2 px-3 rounded-lg transition-all duration-300 text-sm hover:shadow-lg hover:scale-105">
              Increase
            </button>
            <button className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/30 text-white font-medium py-2 px-3 rounded-lg transition-all duration-300 text-sm hover:shadow-lg hover:scale-105">
              Decrease
            </button>
            <button className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/30 text-white font-medium py-2 px-3 rounded-lg transition-all duration-300 text-sm hover:shadow-lg hover:scale-105">
              Collect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function UniswapPositions() {
  const { address, isConnected } = useWallet();
  const [showClosed, setShowClosed] = useState(false);

  // Fast position fetch using optimized backend endpoint
  const { data: positions = [], isLoading, refetch } = useQuery({
    queryKey: ['fast-positions', address],
    queryFn: async () => {
      if (!address) return [];
      
      const response = await fetch(`/api/positions/fast/${address}`);
      if (!response.ok) return [];
      
      const data = await response.json();
      
      return data.map((pos: any) => ({
        id: pos.id || pos.nftTokenId,
        nftTokenId: pos.nftTokenId || pos.tokenId,
        tokenAmountKilt: pos.tokenAmountKilt || pos.token0Amount || '0',
        tokenAmountEth: pos.tokenAmountEth || pos.token1Amount || '0',
        currentValueUsd: pos.currentValueUsd || pos.valueUsd || 0,
        isActive: pos.isActive !== false,
        priceRangeLower: pos.priceRangeLower || pos.priceLower || 0.0141,
        priceRangeUpper: pos.priceRangeUpper || pos.priceUpper || 0.0211,
        feeTier: (pos.feeTier || pos.fee || 3000) / 10000, // Convert from basis points to percentage
        liquidity: pos.liquidity || pos.liquidityAmount || '0',
        inRange: pos.inRange || false
      }));
    },
    enabled: !!address && isConnected,
    staleTime: 10000, // 10 seconds
    refetchInterval: 30000, // 30 seconds
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
            <PositionCard key={`${position.id}-${position.nftTokenId}`} position={position} />
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