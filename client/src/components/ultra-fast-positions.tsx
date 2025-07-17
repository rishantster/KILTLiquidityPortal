import { useState, useMemo } from 'react';
import { useUltraFastPositions } from '@/hooks/use-ultra-fast-positions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Plus,
  DollarSign,
  Eye,
  EyeOff
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

// Position range visualization component
const PositionRangeChart = ({ lower, upper, current, className = "h-6 w-24" }) => {
  const percentage = ((current - lower) / (upper - lower)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  return (
    <div className={`bg-gray-800 rounded-sm relative ${className}`}>
      <div 
        className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-sm"
        style={{ width: `${clampedPercentage}%` }}
      />
      <div 
        className="absolute top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded-full"
        style={{ left: `${clampedPercentage}%` }}
      />
    </div>
  );
};

export default function UltraFastPositions() {
  const { positions, isLoading, error, refresh, hasPositions } = useUltraFastPositions();
  const [showClosed, setShowClosed] = useState(false);

  // Memoized position filtering for performance
  const { activePositions, closedPositions } = useMemo(() => {
    const active = positions.filter(p => p.isActive);
    const closed = positions.filter(p => !p.isActive);
    return { activePositions: active, closedPositions: closed };
  }, [positions]);

  const displayPositions = showClosed ? [...activePositions, ...closedPositions] : activePositions;

  if (isLoading && positions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your KILT LP Positions</h2>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
        </div>
        <div className="text-center py-8">
          <p className="text-white/60">Loading your positions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your KILT LP Positions</h2>
          <Button onClick={refresh} variant="outline" size="sm">
            Retry
          </Button>
        </div>
        <div className="text-center py-8">
          <p className="text-red-400 mb-2">Failed to load positions</p>
          <p className="text-white/60 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!hasPositions) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Your KILT LP Positions</h2>
        <div className="text-center py-8">
          <p className="text-white/60 mb-2">No KILT positions found</p>
          <p className="text-white/40 text-sm">Create your first position in the "Add Liquidity" tab</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Your KILT LP Positions</h2>
        <div className="flex items-center space-x-4">
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

      <div className="grid gap-4">
        {displayPositions.map((position) => (
          <Card 
            key={position.nftTokenId}
            className={`bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-700/50 ${
              !position.isActive ? 'opacity-60' : ''
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center space-x-2">
                  <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
                  <span>/</span>
                  <EthereumLogo className="w-5 h-5" />
                  <span className="text-white/70">#{position.nftTokenId}</span>
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
            <CardContent className="space-y-4">
              {/* Position Value */}
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Position Value</span>
                <span className="text-white font-bold text-lg">
                  ${position.currentValueUsd.toLocaleString()}
                </span>
              </div>

              {/* Token Amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <img src={kiltLogo} alt="KILT" className="w-4 h-4" />
                    <span className="text-white/70 text-sm">KILT</span>
                  </div>
                  <p className="text-white font-bold">
                    {parseFloat(position.tokenAmountKilt).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <EthereumLogo className="w-4 h-4" />
                    <span className="text-white/70 text-sm">ETH</span>
                  </div>
                  <p className="text-white font-bold">
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
                <PositionRangeChart 
                  lower={position.priceRangeLower}
                  upper={position.priceRangeUpper}
                  current={0.0158} // Current KILT price
                  className="h-6 w-full"
                />
              </div>

              {/* Actions */}
              {position.isActive && (
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Minus className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Collect
                  </Button>
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4" />
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