import { useState, useMemo } from 'react';
import { useInstantPositions } from '@/hooks/use-instant-positions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  Plus,
  Minus,
  DollarSign,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

// Ethereum logo component
const EthereumLogo = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 256 417" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M127.961 0L125.44 8.55656V285.168L127.961 287.688L255.922 212.32L127.961 0Z" fill="#343434"/>
    <path d="M127.962 0L0 212.32L127.962 287.688V153.864V0Z" fill="#8C8C8C"/>
    <path d="M127.961 312.187L126.385 314.154V415.484L127.961 417L255.922 237.832L127.961 312.187Z" fill="#3C3C3B"/>
    <path d="M127.962 417V312.187L0 237.832L127.962 417Z" fill="#8C8C8C"/>
    <path d="M127.961 287.688L255.922 212.32L127.961 153.864V287.688Z" fill="#141414"/>
    <path d="M0 212.32L127.962 287.688V153.864L0 212.32Z" fill="#393939"/>
  </svg>
);

// Fast position range visualization
const QuickRangeChart = ({ lower, upper, current, className = "h-6 w-full" }) => {
  const percentage = Math.max(0, Math.min(100, ((current - lower) / (upper - lower)) * 100));
  
  return (
    <div className={`bg-gray-800 rounded-sm relative overflow-hidden ${className}`}>
      <div 
        className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
      <div 
        className="absolute top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded-full shadow-lg"
        style={{ left: `${percentage}%` }}
      />
    </div>
  );
};

export default function BlazingPositions() {
  const { positions, isLoading, hasPositions, refresh } = useInstantPositions();
  const [showClosed, setShowClosed] = useState(false);

  // Lightning-fast position filtering
  const { activePositions, closedPositions } = useMemo(() => {
    const active = positions.filter(p => p.isActive);
    const closed = positions.filter(p => !p.isActive);
    return { activePositions: active, closedPositions: closed };
  }, [positions]);

  const displayPositions = showClosed ? [...activePositions, ...closedPositions] : activePositions;

  // Instant loading state
  if (isLoading && !hasPositions) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your KILT LP Positions</h2>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
            <span className="text-white/60 text-sm">Loading...</span>
          </div>
        </div>
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50 animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-gray-700 rounded w-32"></div>
                  <div className="h-5 bg-gray-700 rounded w-16"></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-gray-700 rounded w-24"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-12 bg-gray-700 rounded"></div>
                  <div className="h-12 bg-gray-700 rounded"></div>
                </div>
                <div className="h-6 bg-gray-700 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!hasPositions) {
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
              {showClosed ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
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
                <CardTitle className="text-lg text-white flex items-center space-x-2">
                  <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
                  <span className="text-white/50">/</span>
                  <EthereumLogo className="w-5 h-5" />
                  <span className="text-white/70 text-sm">#{position.nftTokenId}</span>
                </CardTitle>
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
                  ${position.currentValueUsd.toLocaleString()}
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
                    {parseFloat(position.tokenAmountKilt).toLocaleString()}
                  </p>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <EthereumLogo className="w-4 h-4" />
                    <span className="text-white/70 text-sm">ETH</span>
                  </div>
                  <p className="text-white font-bold text-sm">
                    {parseFloat(position.tokenAmountEth).toFixed(6)}
                  </p>
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Price Range</span>
                  <span className="text-white/50 text-xs">
                    ${position.priceRangeLower.toFixed(4)} - ${position.priceRangeUpper.toFixed(4)}
                  </span>
                </div>
                <QuickRangeChart 
                  lower={position.priceRangeLower}
                  upper={position.priceRangeUpper}
                  current={0.0158}
                />
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