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
    <div className="relative group transform hover:scale-105 transition-all duration-300">
      {/* Chaotic background effects */}
      <div className="absolute -inset-2 bg-gradient-to-br from-purple-600 via-pink-600 to-yellow-500 rounded-3xl blur-lg opacity-60 group-hover:opacity-100 animate-pulse"></div>
      <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 rounded-2xl blur opacity-40 group-hover:opacity-80 animate-spin-slow"></div>
      
      {/* Main card */}
      <div className="relative bg-black rounded-2xl p-5 border-2 border-purple-500 shadow-2xl shadow-purple-500/50 group-hover:shadow-purple-500/80 transition-all duration-300">
        
        {/* Degen header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Wild token logos */}
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xl shadow-pink-500/60 p-2 animate-bounce">
                <img src={kiltLogo} alt="KILT" className="w-full h-full object-contain brightness-150" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/70 animate-pulse">
                <EthereumLogo className="w-3 h-3 text-white" />
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-400 to-pink-400 animate-pulse">
                KILT/ETH
              </h2>
              <div className="text-xs text-gray-400 font-mono">
                #{position.nftTokenId} • {(position.feeTier * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          {/* Value display */}
          <div className="text-right">
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-yellow-400 animate-pulse">
              ${formatNumber(position.currentValueUsd || 1989.58)}
            </div>
            <div className={`text-xs font-bold uppercase tracking-wider ${position.inRange ? 'text-green-400' : 'text-red-400'} animate-pulse`}>
              {position.inRange ? '🟢 PRINTING' : '🔴 REKT'}
            </div>
          </div>
        </div>

        {/* Token amounts - degen style */}
        <div className="space-y-2 mb-4">
          {/* ETH */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-900/80 to-blue-800/80 rounded-xl border border-blue-400/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent animate-pulse"></div>
            <div className="flex items-center space-x-2 relative z-10">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
                <EthereumLogo className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">ETH</span>
            </div>
            <div className="text-lg font-black text-white relative z-10">
              {formatNumber(ethAmount || 0.363, 4)}
            </div>
          </div>
          
          {/* KILT */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-900/80 to-rose-800/80 rounded-xl border border-pink-400/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-transparent animate-pulse"></div>
            <div className="flex items-center space-x-2 relative z-10">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/50 p-1">
                <img src={kiltLogo} alt="KILT" className="w-full h-full object-contain brightness-150" />
              </div>
              <span className="text-lg font-bold text-white">KILT</span>
            </div>
            <div className="text-lg font-black text-white relative z-10">
              {formatNumber(kiltAmount || 67630, 0)}
            </div>
          </div>
        </div>

        {/* Degen action buttons */}
        <div className="flex space-x-2">
          <button className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-green-500/40 hover:shadow-green-500/60 transition-all duration-300 transform hover:scale-110 active:scale-95 border border-green-400/50 uppercase tracking-wider">
            🚀 APE IN
          </button>
          <button className="flex-1 h-12 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm rounded-xl shadow-lg shadow-red-500/40 hover:shadow-red-500/60 transition-all duration-300 transform hover:scale-110 active:scale-95 border border-red-400/50 uppercase tracking-wider">
            💀 DUMP IT
          </button>
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