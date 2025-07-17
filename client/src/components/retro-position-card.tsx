import { useState } from 'react';
import { formatUnits } from 'viem';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Minus, 
  DollarSign, 
  Zap, 
  Target,
  Activity,
  ExternalLink,
  Settings,
  Gauge,
  Star
} from 'lucide-react';
import { TokenLogo, KiltLogo, EthLogo } from '@/components/ui/token-logo';

interface RetroPositionCardProps {
  position: {
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
    apy?: number;
    dailyFees?: number;
    totalFees?: number;
  };
  onManage?: (action: 'add' | 'remove' | 'collect', tokenId: string) => void;
  isLoading?: boolean;
}

export function RetroPositionCard({ position, onManage, isLoading }: RetroPositionCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const formatTokenAmount = (amount: string | undefined, decimals: number = 18) => {
    if (!amount) return '0';
    try {
      const formatted = formatUnits(BigInt(amount), decimals);
      return parseFloat(formatted).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4
      });
    } catch {
      return '0';
    }
  };

  const formatFeeAmount = (amount: string | undefined, decimals: number = 18) => {
    if (!amount) return '0.0000';
    try {
      const formatted = formatUnits(BigInt(amount), decimals);
      return parseFloat(formatted).toFixed(6);
    } catch {
      return '0.0000';
    }
  };

  const getPositionStatus = () => {
    if (position.isInRange) {
      return {
        label: 'IN RANGE',
        color: 'retro-badge-success',
        icon: <Target className="retro-w-3 retro-h-3" />
      };
    } else {
      return {
        label: 'OUT OF RANGE',
        color: 'retro-badge-warning',
        icon: <Activity className="retro-w-3 retro-h-3" />
      };
    }
  };

  const getFeeRate = () => {
    return (position.fee / 10000).toFixed(2);
  };

  const getPositionValue = () => {
    return position.positionValue?.toLocaleString(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) || '$0.00';
  };

  const status = getPositionStatus();

  return (
    <div 
      className={`retro-position-card ${isHovered ? 'retro-zoom-hover' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        padding: '0.75rem',
        minHeight: '220px',
        maxWidth: '100%',
        animation: `retro-fade-in 0.5s ease-out`,
        transition: 'all 0.3s ease-in-out'
      }}
    >
      {/* Header */}
      <div className="retro-flex retro-items-center retro-justify-between retro-mb-sm">
        <div className="retro-flex retro-items-center retro-gap-xs">
          <div className="retro-flex retro-items-center retro-gap-xs">
            <KiltLogo className="retro-w-4 retro-h-4 retro-float" />
            <span className="retro-text retro-text-accent" style={{ fontSize: '0.8rem' }}>KILT</span>
          </div>
          <span className="retro-text retro-text-secondary">/</span>
          <div className="retro-flex retro-items-center retro-gap-xs">
            <EthLogo className="retro-w-4 retro-h-4 retro-float" />
            <span className="retro-text retro-text-accent" style={{ fontSize: '0.8rem' }}>ETH</span>
          </div>
        </div>
        
        <div className="retro-flex retro-items-center retro-gap-xs">
          <div className={`retro-badge ${status.color}`}>
            {status.icon}
            <span className="retro-ml-xs">{status.label}</span>
          </div>
          <div className="retro-badge">
            <Zap className="retro-w-3 retro-h-3" />
            <span className="retro-ml-xs">{getFeeRate()}%</span>
          </div>
        </div>
      </div>

      {/* Position Value */}
      <div className="retro-text-center retro-mb-sm">
        <div className="retro-position-value retro-text-glow retro-mb-xs" style={{ fontSize: '1.2rem' }}>
          {getPositionValue()}
        </div>
        <div className="retro-text retro-text-secondary" style={{ fontSize: '0.7rem' }}>
          NFT #{position.tokenId}
        </div>
      </div>

      {/* Token Amounts */}
      <div className="retro-position-tokens retro-mb-sm">
        <div className="retro-token-display">
          <KiltLogo className="retro-token-logo" />
          <div className="retro-flex retro-flex-col">
            <span className="retro-token-amount" style={{ fontSize: '0.8rem' }}>
              {formatTokenAmount(position.token0Amount, 18)}
            </span>
            <span className="retro-text retro-text-secondary retro-text-xs">KILT</span>
          </div>
        </div>
        
        <div className="retro-token-display">
          <EthLogo className="retro-token-logo" />
          <div className="retro-flex retro-flex-col">
            <span className="retro-token-amount" style={{ fontSize: '0.8rem' }}>
              {formatTokenAmount(position.token1Amount, 18)}
            </span>
            <span className="retro-text retro-text-secondary retro-text-xs">ETH</span>
          </div>
        </div>
      </div>

      {/* Fees Earned */}
      <div className="retro-card retro-bg-primary retro-p-xs retro-mb-sm">
        <div className="retro-flex retro-items-center retro-justify-between retro-mb-xs">
          <span className="retro-text retro-text-secondary" style={{ fontSize: '0.65rem' }}>Fees Earned</span>
          <Star className="retro-w-3 retro-h-3 retro-text-accent retro-pulse" />
        </div>
        <div className="retro-flex retro-items-center retro-gap-sm">
          <div className="retro-flex retro-items-center retro-gap-xs">
            <KiltLogo className="retro-w-3 retro-h-3" />
            <span className="retro-text retro-text-accent" style={{ fontSize: '0.65rem' }}>
              {formatFeeAmount(position.tokensOwed0, 18)}
            </span>
          </div>
          <div className="retro-flex retro-items-center retro-gap-xs">
            <EthLogo className="retro-w-3 retro-h-3" />
            <span className="retro-text retro-text-accent" style={{ fontSize: '0.65rem' }}>
              {formatFeeAmount(position.tokensOwed1, 18)}
            </span>
          </div>
        </div>
      </div>

      {/* Price Range Visualization */}
      <div className="retro-mb-md">
        <div className="retro-flex retro-items-center retro-justify-between retro-mb-xs">
          <span className="retro-text retro-text-secondary retro-text-xs">Price Range</span>
          <Gauge className="retro-w-3 retro-h-3 retro-text-accent" />
        </div>
        <div className="retro-progress">
          <div 
            className="retro-progress-bar"
            style={{ width: position.isInRange ? '75%' : '25%' }}
          />
        </div>
      </div>

      {/* Management Actions */}
      <div className="retro-flex retro-gap-xs">
        <button
          onClick={() => onManage?.('add', position.tokenId)}
          disabled={isLoading}
          className="retro-button retro-button-success retro-flex-1 retro-text-xs"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
        >
          <Plus className="retro-w-3 retro-h-3" />
          <span className="retro-ml-xs">Add</span>
        </button>
        
        <button
          onClick={() => onManage?.('remove', position.tokenId)}
          disabled={isLoading}
          className="retro-button retro-button-warning retro-flex-1 retro-text-xs"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
        >
          <Minus className="retro-w-3 retro-h-3" />
          <span className="retro-ml-xs">Remove</span>
        </button>
        
        <button
          onClick={() => onManage?.('collect', position.tokenId)}
          disabled={isLoading}
          className="retro-button retro-button-primary retro-flex-1 retro-text-xs"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
        >
          <DollarSign className="retro-w-3 retro-h-3" />
          <span className="retro-ml-xs">Collect</span>
        </button>
      </div>

      {/* External Link */}
      <div className="retro-text-center retro-mt-md">
        <a
          href={`https://app.uniswap.org/positions/${position.tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="retro-text retro-text-secondary retro-text-xs retro-glow-hover"
        >
          <ExternalLink className="retro-w-3 retro-h-3 retro-inline" />
          <span className="retro-ml-xs">View on Uniswap</span>
        </a>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="retro-absolute retro-top-0 retro-left-0 retro-w-full retro-h-full retro-bg-black retro-bg-opacity-50 retro-flex retro-items-center retro-justify-center retro-rounded-lg">
          <div className="retro-loading"></div>
        </div>
      )}
    </div>
  );
}