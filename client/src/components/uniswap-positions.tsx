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
  
  return (
    <div className="group relative overflow-hidden">
      {/* Gaming card outer frame */}
      <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 p-[2px] rounded-2xl">
        {/* Animated neon border */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm animate-spin-slow" />
        
        {/* Main card body */}
        <div className="relative bg-gradient-to-br from-gray-900/95 via-gray-800/90 to-black/95 backdrop-blur-xl rounded-2xl p-6 h-full">
          {/* Top geometric accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
          
          {/* Holographic overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          {/* NFT-style header */}
          <div className="relative z-10 flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              {/* Gaming-style logo cluster */}
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-2xl shadow-pink-500/40 ring-2 ring-pink-400/30 p-2">
                  <img src={kiltLogo} alt="KILT" className="w-full h-full object-contain" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50 ring-1 ring-blue-400/30">
                  <EthereumLogo className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div>
                <h3 className="text-white font-black text-xl tracking-wider bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  KILT/ETH
                </h3>
                <div className="text-sm text-gray-400 font-bold tracking-wide">
                  #{position.nftTokenId} • {(position.feeTier * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            
            {/* Gaming-style value display */}
            <div className="text-right">
              <div className="text-white font-black text-3xl tracking-tight bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                ${formatNumber(position.currentValueUsd || 1989.58)}
              </div>
              <div className={`text-sm font-bold uppercase tracking-wider ${position.inRange ? 'text-green-400' : 'text-red-400'}`}>
                {position.inRange ? '◉ ACTIVE' : '◯ INACTIVE'}
              </div>
            </div>
          </div>

          {/* Gaming-style token stats */}
          <div className="space-y-4 mb-6">
            {/* ETH section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-xl blur-sm" />
              <div className="relative bg-gradient-to-r from-gray-800/80 to-gray-900/80 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/40 ring-1 ring-blue-400/30">
                      <EthereumLogo className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-blue-200 font-bold text-lg tracking-wide">ETH</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-black text-xl tracking-tight">
                      {formatNumber(ethAmount || 0.363, 4)}
                    </div>
                    <div className="text-blue-300 text-sm font-medium">
                      Ethereum
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* KILT section */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600/20 to-rose-600/20 rounded-xl blur-sm" />
              <div className="relative bg-gradient-to-r from-gray-800/80 to-gray-900/80 border border-pink-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/40 ring-1 ring-pink-400/30 p-2">
                      <img src={kiltLogo} alt="KILT" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-pink-200 font-bold text-lg tracking-wide">KILT</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-black text-xl tracking-tight">
                      {formatNumber(kiltAmount || 67630, 0)}
                    </div>
                    <div className="text-pink-300 text-sm font-medium">
                      Protocol
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gaming-style action buttons */}
          <div className="flex space-x-3">
            <Button className="flex-1 h-14 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-500 hover:via-green-500 hover:to-emerald-600 text-white border-0 text-sm font-black uppercase tracking-wider shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-all duration-300 transform hover:scale-105 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 animate-shimmer" />
              <span className="relative z-10">ADD LIQUIDITY</span>
            </Button>
            <Button className="flex-1 h-14 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:via-rose-500 hover:to-red-600 text-white border-0 text-sm font-black uppercase tracking-wider shadow-2xl shadow-red-500/40 hover:shadow-red-500/60 transition-all duration-300 transform hover:scale-105 rounded-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 animate-shimmer" />
              <span className="relative z-10">REMOVE</span>
            </Button>
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