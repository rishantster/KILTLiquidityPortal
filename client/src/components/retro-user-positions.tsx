import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/contexts/wallet-context';
import { useToast } from '@/hooks/use-toast';
import { RetroPositionCard } from './retro-position-card';
import { 
  Loader2, 
  AlertCircle, 
  Coins, 
  TrendingUp, 
  DollarSign, 
  Users,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface Position {
  id: string;
  tokenId: string;
  token0: string;
  token1: string;
  fee: number;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  tokensOwed0: string;
  tokensOwed1: string;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
  currentPrice?: number;
  token0Amount?: string;
  token1Amount?: string;
  positionValue?: number;
  isInRange?: boolean;
  isKiltPool?: boolean;
  poolType?: string;
  isClosed?: boolean;
  apy?: number;
  dailyFees?: number;
  totalFees?: number;
}

export default function RetroUserPositions() {
  const { address } = useWallet();
  const { toast } = useToast();
  const [showClosedPositions, setShowClosedPositions] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'fees' | 'id'>('value');
  const [managingPosition, setManagingPosition] = useState<string | null>(null);

  // Fetch user positions with enhanced error handling
  const { 
    data: positions, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ['user-positions', address],
    queryFn: async () => {
      if (!address) return [];
      
      const response = await fetch(`/api/positions/wallet/${address}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.status}`);
      }
      
      const data = await response.json();
      return data.positions || [];
    },
    enabled: !!address,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refetch every minute
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Calculate position statistics
  const getPositionStats = () => {
    if (!positions || positions.length === 0) {
      return {
        totalPositions: 0,
        activePositions: 0,
        closedPositions: 0,
        totalValue: 0,
        totalFees: 0,
        inRangePositions: 0
      };
    }

    const activePositions = positions.filter((p: Position) => !p.isClosed);
    const closedPositions = positions.filter((p: Position) => p.isClosed);
    const inRangePositions = activePositions.filter((p: Position) => p.isInRange);
    
    const totalValue = activePositions.reduce((sum: number, p: Position) => 
      sum + (p.positionValue || 0), 0
    );
    
    const totalFees = positions.reduce((sum: number, p: Position) => 
      sum + (p.totalFees || 0), 0
    );

    return {
      totalPositions: positions.length,
      activePositions: activePositions.length,
      closedPositions: closedPositions.length,
      totalValue,
      totalFees,
      inRangePositions: inRangePositions.length
    };
  };

  // Filter and sort positions
  const getFilteredPositions = () => {
    if (!positions) return [];
    
    let filtered = positions.filter((position: Position) => {
      const matchesSearch = searchFilter === '' || 
        position.tokenId.toLowerCase().includes(searchFilter.toLowerCase()) ||
        position.poolType?.toLowerCase().includes(searchFilter.toLowerCase());
      
      const matchesClosedFilter = showClosedPositions ? true : !position.isClosed;
      
      return matchesSearch && matchesClosedFilter;
    });

    // Sort positions
    filtered.sort((a: Position, b: Position) => {
      switch (sortBy) {
        case 'value':
          return (b.positionValue || 0) - (a.positionValue || 0);
        case 'fees':
          return (b.totalFees || 0) - (a.totalFees || 0);
        case 'id':
          return parseInt(b.tokenId) - parseInt(a.tokenId);
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Handle position management actions
  const handleManagePosition = async (action: 'add' | 'remove' | 'collect', tokenId: string) => {
    setManagingPosition(tokenId);
    
    try {
      switch (action) {
        case 'add':
          toast({
            title: "Add Liquidity",
            description: "Navigate to Add Liquidity tab to increase position size",
            variant: "default"
          });
          break;
        case 'remove':
          toast({
            title: "Remove Liquidity",
            description: "Position management coming soon",
            variant: "default"
          });
          break;
        case 'collect':
          toast({
            title: "Collect Fees",
            description: "Fee collection coming soon",
            variant: "default"
          });
          break;
      }
    } catch (error) {
      toast({
        title: "Action Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setManagingPosition(null);
    }
  };

  // Auto-refresh positions when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && address) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [address, refetch]);

  const stats = getPositionStats();
  const filteredPositions = getFilteredPositions();

  if (!address) {
    return (
      <div className="retro-card retro-text-center retro-p-2xl">
        <div className="retro-card-icon retro-mb-lg">
          <AlertCircle className="retro-w-12 retro-h-12 retro-text-accent" />
        </div>
        <h3 className="retro-subtitle retro-mb-md">Wallet Not Connected</h3>
        <p className="retro-text">Connect your wallet to view your LP positions</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="retro-card retro-text-center retro-p-2xl">
        <div className="retro-loading retro-mb-lg"></div>
        <h3 className="retro-subtitle retro-mb-md">Loading Positions</h3>
        <p className="retro-text">Fetching your Uniswap V3 positions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="retro-card retro-text-center retro-p-2xl">
        <div className="retro-card-icon retro-mb-lg">
          <AlertCircle className="retro-w-12 retro-h-12 retro-text-accent" />
        </div>
        <h3 className="retro-subtitle retro-mb-md">Error Loading Positions</h3>
        <p className="retro-text retro-mb-lg">
          {error instanceof Error ? error.message : 'Failed to load positions'}
        </p>
        <button
          onClick={() => refetch()}
          className="retro-button retro-button-primary"
        >
          <RefreshCw className="retro-w-4 retro-h-4" />
          <span className="retro-ml-sm">Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="retro-space-y-lg">
      {/* Statistics Cards */}
      <div className="retro-grid retro-grid-cols-1 md:retro-grid-cols-4 retro-gap-lg">
        <div className="retro-card retro-text-center">
          <div className="retro-card-icon retro-mb-sm">
            <Coins className="retro-w-6 retro-h-6" />
          </div>
          <div className="retro-position-value retro-text-sm retro-mb-xs">
            {stats.totalPositions}
          </div>
          <p className="retro-text retro-text-xs">Total Positions</p>
        </div>

        <div className="retro-card retro-text-center">
          <div className="retro-card-icon retro-mb-sm">
            <Activity className="retro-w-6 retro-h-6" />
          </div>
          <div className="retro-position-value retro-text-sm retro-mb-xs">
            {stats.activePositions}
          </div>
          <p className="retro-text retro-text-xs">Active Positions</p>
        </div>

        <div className="retro-card retro-text-center">
          <div className="retro-card-icon retro-mb-sm">
            <DollarSign className="retro-w-6 retro-h-6" />
          </div>
          <div className="retro-position-value retro-text-sm retro-mb-xs">
            ${stats.totalValue.toLocaleString()}
          </div>
          <p className="retro-text retro-text-xs">Total Value</p>
        </div>

        <div className="retro-card retro-text-center">
          <div className="retro-card-icon retro-mb-sm">
            <TrendingUp className="retro-w-6 retro-h-6" />
          </div>
          <div className="retro-position-value retro-text-sm retro-mb-xs">
            {stats.inRangePositions}
          </div>
          <p className="retro-text retro-text-xs">In Range</p>
        </div>
      </div>

      {/* Controls */}
      <div className="retro-card retro-p-md">
        <div className="retro-flex retro-items-center retro-justify-between retro-gap-md">
          <div className="retro-flex retro-items-center retro-gap-md">
            {/* Search */}
            <div className="retro-flex retro-items-center retro-gap-sm">
              <Search className="retro-w-4 retro-h-4 retro-text-accent" />
              <input
                type="text"
                placeholder="Search positions..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="retro-input retro-text-sm"
                style={{ width: '200px' }}
              />
            </div>

            {/* Sort */}
            <div className="retro-flex retro-items-center retro-gap-sm">
              <Filter className="retro-w-4 retro-h-4 retro-text-accent" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="retro-input retro-text-sm"
              >
                <option value="value">Sort by Value</option>
                <option value="fees">Sort by Fees</option>
                <option value="id">Sort by ID</option>
              </select>
            </div>

            {/* Show Closed Toggle */}
            <button
              onClick={() => setShowClosedPositions(!showClosedPositions)}
              className={`retro-button retro-button-secondary retro-text-sm ${
                showClosedPositions ? 'retro-glow' : ''
              }`}
            >
              {showClosedPositions ? (
                <EyeOff className="retro-w-4 retro-h-4" />
              ) : (
                <Eye className="retro-w-4 retro-h-4" />
              )}
              <span className="retro-ml-sm">
                {showClosedPositions ? 'Hide Closed' : 'Show Closed'}
              </span>
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="retro-button retro-button-primary retro-text-sm"
          >
            <RefreshCw className={`retro-w-4 retro-h-4 ${isFetching ? 'retro-spin' : ''}`} />
            <span className="retro-ml-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Position Cards */}
      {filteredPositions.length === 0 ? (
        <div className="retro-card retro-text-center retro-p-2xl">
          <div className="retro-card-icon retro-mb-lg">
            <Coins className="retro-w-12 retro-h-12 retro-text-accent" />
          </div>
          <h3 className="retro-subtitle retro-mb-md">No Positions Found</h3>
          <p className="retro-text retro-mb-lg">
            {searchFilter ? 'No positions match your search criteria' : 'No KILT LP positions found in your wallet'}
          </p>
          {!searchFilter && (
            <button
              onClick={() => window.location.href = '#add-liquidity'}
              className="retro-button retro-button-primary"
            >
              <span>Create Your First Position</span>
            </button>
          )}
        </div>
      ) : (
        <div className="retro-grid retro-grid-cols-1 md:retro-grid-cols-2 lg:retro-grid-cols-3 xl:retro-grid-cols-4 retro-gap-sm">
          {filteredPositions.map((position: Position, index: number) => (
            <div
              key={position.tokenId}
              style={{
                animationDelay: `${index * 0.1}s`,
                animation: `retro-slide-in 0.5s ease-out ${index * 0.1}s both`
              }}
            >
              <RetroPositionCard
                position={position}
                onManage={handleManagePosition}
                isLoading={managingPosition === position.tokenId}
              />
            </div>
          ))}
        </div>
      )}

      {/* Position Count Display */}
      {filteredPositions.length > 0 && (
        <div className="retro-card retro-text-center retro-p-sm">
          <p className="retro-text retro-text-sm">
            Showing {filteredPositions.length} of {stats.totalPositions} positions
            {stats.closedPositions > 0 && (
              <span className="retro-ml-sm retro-text-secondary">
                ({stats.closedPositions} closed)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}