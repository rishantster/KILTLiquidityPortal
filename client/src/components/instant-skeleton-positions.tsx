import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/wallet-context';
import { 
  Plus,
  Minus,
  DollarSign,
  ExternalLink,
  Zap
} from 'lucide-react';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';
import { fetchPositionsInstantly } from '@/utils/instant-cache';

// Instant skeleton component
const PositionSkeleton = () => (
  <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50 animate-pulse">
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
          <div className="w-1 h-4 bg-gray-700 rounded"></div>
          <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
          <div className="w-16 h-4 bg-gray-700 rounded"></div>
        </div>
        <div className="w-12 h-5 bg-gray-700 rounded"></div>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-20 h-4 bg-gray-700 rounded"></div>
        <div className="w-24 h-6 bg-gray-700 rounded"></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="w-12 h-4 bg-gray-700 rounded mb-1"></div>
          <div className="w-16 h-4 bg-gray-700 rounded"></div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="w-12 h-4 bg-gray-700 rounded mb-1"></div>
          <div className="w-16 h-4 bg-gray-700 rounded"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="w-20 h-4 bg-gray-700 rounded"></div>
          <div className="w-32 h-3 bg-gray-700 rounded"></div>
        </div>
        <div className="w-full h-6 bg-gray-700 rounded"></div>
      </div>
      <div className="flex space-x-2 pt-2">
        <div className="flex-1 h-8 bg-gray-700 rounded"></div>
        <div className="flex-1 h-8 bg-gray-700 rounded"></div>
        <div className="flex-1 h-8 bg-gray-700 rounded"></div>
        <div className="w-8 h-8 bg-gray-700 rounded"></div>
      </div>
    </CardContent>
  </Card>
);

export default function InstantSkeletonPositions() {
  const { address } = useWallet();
  const [positions, setPositions] = useState<any[]>([]);
  const [showSkeletons, setShowSkeletons] = useState(true);
  const [showClosed, setShowClosed] = useState(false);

  // Load positions with instant cache return
  useEffect(() => {
    if (!address) return;

    const loadPositions = async () => {
      try {
        // Get positions instantly from cache or load
        const data = await fetchPositionsInstantly(address);
        setPositions(data);
        setShowSkeletons(false);
      } catch (error) {
        console.error('Position loading failed:', error);
        setShowSkeletons(false);
      }
    };

    loadPositions();
  }, [address]);

  // Filter positions
  const activePositions = positions.filter(p => p.isActive);
  const closedPositions = positions.filter(p => !p.isActive);
  const displayPositions = showClosed ? [...activePositions, ...closedPositions] : activePositions;

  // Show skeleton loading
  if (showSkeletons) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your KILT LP Positions</h2>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
            <span className="text-white/60 text-sm">Loading positions...</span>
          </div>
        </div>
        <div className="grid gap-3">
          <PositionSkeleton />
          <PositionSkeleton />
        </div>
      </div>
    );
  }

  // No positions found
  if (positions.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Your KILT LP Positions</h2>
        <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50">
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-white font-semibold mb-2">No KILT Positions Found</h3>
            <p className="text-white/60 text-sm mb-4">
              Start earning rewards by creating your first liquidity position
            </p>
            <Button 
              onClick={() => (window as any).navigateToTab?.('liquidity')}
              className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Liquidity
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Your KILT LP Positions</h2>
        <div className="flex items-center space-x-3">
          {closedPositions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClosed(!showClosed)}
              className="text-white/70 hover:text-white"
            >
              {showClosed ? 'Hide' : 'Show'} Closed
            </Button>
          )}
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
            {activePositions.length} Active
            {closedPositions.length > 0 && ` • ${closedPositions.length} Closed`}
          </Badge>
        </div>
      </div>

      {/* Position Cards */}
      <div className="grid gap-3">
        {displayPositions.map((position) => (
          <Card 
            key={position.nftTokenId}
            className={`bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50 transition-all duration-200 hover:border-gray-600/50 ${
              !position.isActive ? 'opacity-60' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
                  <span className="text-white/50">/</span>
                  <svg className="w-5 h-5" viewBox="0 0 256 417" fill="none">
                    <path d="M127.961 0L125.44 8.55656V285.168L127.961 287.688L255.922 212.32L127.961 0Z" fill="#343434"/>
                    <path d="M127.962 0L0 212.32L127.962 287.688V153.864V0Z" fill="#8C8C8C"/>
                  </svg>
                  <span className="text-white/70 text-sm">#{position.nftTokenId}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                    {(position.feeTier / 10000).toFixed(2)}%
                  </Badge>
                  {!position.isActive && (
                    <Badge variant="outline" className="border-gray-500/30 text-gray-400">
                      Closed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Position Value */}
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Total Value</span>
                <span className="text-white font-bold text-lg">
                  ${position.currentValueUsd?.toLocaleString() || '0'}
                </span>
              </div>

              {/* Token Amounts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-pink-500/5 border border-pink-500/10 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <img src={kiltLogo} alt="KILT" className="w-4 h-4" />
                    <span className="text-white/70 text-sm">KILT</span>
                  </div>
                  <p className="text-white font-bold text-sm">
                    {position.tokenAmountKilt ? parseFloat(position.tokenAmountKilt).toLocaleString() : '0'}
                  </p>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <svg className="w-4 h-4" viewBox="0 0 256 417" fill="none">
                      <path d="M127.961 0L125.44 8.55656V285.168L127.961 287.688L255.922 212.32L127.961 0Z" fill="#343434"/>
                    </svg>
                    <span className="text-white/70 text-sm">ETH</span>
                  </div>
                  <p className="text-white font-bold text-sm">
                    {position.tokenAmountEth ? parseFloat(position.tokenAmountEth).toFixed(6) : '0'}
                  </p>
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Price Range</span>
                  <span className="text-white/50 text-xs">
                    ${position.priceRangeLower?.toFixed(4) || '0'} - ${position.priceRangeUpper?.toFixed(4) || '0'}
                  </span>
                </div>
                <div className="w-full h-6 bg-gray-800 rounded-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-blue-500 w-1/2"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 w-1 h-4 bg-white rounded-full"></div>
                </div>
              </div>

              {/* Actions */}
              {position.isActive && (
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs">
                    <Minus className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs">
                    <DollarSign className="h-3 w-3 mr-1" />
                    Collect
                  </Button>
                  <Button size="sm" variant="outline" className="px-2">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}