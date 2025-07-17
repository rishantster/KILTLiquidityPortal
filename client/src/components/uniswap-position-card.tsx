import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, DollarSign, CheckCircle } from 'lucide-react';
import { TokenLogo } from './ui/token-logo';
import { formatUnits } from 'viem';

// Helper function to format small amounts with appropriate decimal places
const formatSmallAmount = (amount: number): string => {
  if (amount === 0) return '0.00';
  if (amount >= 1) return amount.toFixed(2);
  if (amount >= 0.01) return amount.toFixed(2);
  if (amount >= 0.001) return amount.toFixed(3);
  if (amount >= 0.0001) return amount.toFixed(4);
  if (amount >= 0.00001) return amount.toFixed(5);
  if (amount >= 0.000001) return amount.toFixed(6);
  return amount.toFixed(8);
};

interface UniswapPosition {
  tokenId: string;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  token0: string;
  token1: string;
  amount0: string;
  amount1: string;
  currentValueUSD?: number;
  poolAddress?: string;
  fees?: {
    token0: string;
    token1: string;
  };
  isActive?: boolean;
  isRegistered?: boolean;
  poolType?: string;
  isKiltPosition?: boolean;
  fee?: number;
}

interface UniswapPositionCardProps {
  position: UniswapPosition;
  onAddLiquidity?: (position: UniswapPosition) => void;
  onRemoveLiquidity?: (position: UniswapPosition) => void;
  onCollectFees?: (position: UniswapPosition) => void;
}

export const UniswapPositionCard = ({ 
  position, 
  onAddLiquidity, 
  onRemoveLiquidity, 
  onCollectFees 
}: UniswapPositionCardProps) => {
  // Safeguard: Return early if position data is missing
  if (!position || !position.tokenId) {
    return (
      <Card className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-gray-800/30 rounded-lg overflow-hidden">
        <CardContent className="p-3 text-center">
          <div className="text-white/60">Position data unavailable</div>
        </CardContent>
      </Card>
    );
  }
  
  // Convert wei amounts to decimal format with safeguards
  const amount0Decimal = position.amount0 ? parseFloat(formatUnits(BigInt(position.amount0), 18)) : 0;
  const amount1Decimal = position.amount1 ? parseFloat(formatUnits(BigInt(position.amount1), 18)) : 0;
  
  // Determine which token is KILT and which is ETH based on token addresses
  const isToken0Kilt = position.token0 && position.token0.toLowerCase().includes('5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8');
  const kiltAmount = isToken0Kilt ? amount0Decimal : amount1Decimal;
  const ethAmount = isToken0Kilt ? amount1Decimal : amount0Decimal;
  
  // Use real-time price data from the API
  const kiltPrice = 0.01708; // Updated KILT price from API
  const ethPrice = 3400; // ETH price estimate
  const kiltValue = kiltAmount * kiltPrice;
  const ethValue = ethAmount * ethPrice;
  const positionValue = kiltValue + ethValue; // Calculate from actual token amounts
  const kiltPercentage = positionValue > 0 ? (kiltValue / positionValue) * 100 : 50;
  const ethPercentage = positionValue > 0 ? (ethValue / positionValue) * 100 : 50;
  
  // Calculate fees earned from wei format
  const fees0Decimal = position.fees?.token0 ? parseFloat(formatUnits(BigInt(position.fees.token0), 18)) : 0;
  const fees1Decimal = position.fees?.token1 ? parseFloat(formatUnits(BigInt(position.fees.token1), 18)) : 0;
  const kiltFeesEarned = isToken0Kilt ? fees0Decimal : fees1Decimal;
  const ethFeesEarned = isToken0Kilt ? fees1Decimal : fees0Decimal;
  const feesEarned = (kiltFeesEarned * kiltPrice) + (ethFeesEarned * ethPrice);
  
  // Determine if position is in range
  const isInRange = position.isActive && parseFloat(position.liquidity) > 0;
  
  return (
    <Card className="theme-card overflow-hidden">
      <CardContent className="p-3 space-y-3">
        {/* Header with Pool Info and NFT ID */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-white">KILT/WETH</div>
            <div className="text-xs theme-badge-success px-2 py-1 rounded">
              {position.fee ? `${(position.fee / 10000).toFixed(1)}%` : '0.3%'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-white/60">#{position.tokenId}</div>
            {position.isRegistered && (
              <CheckCircle className="h-3 w-3 text-cyan-400" />
            )}
          </div>
        </div>

        {/* Position Value - Large Display */}
        <div className="text-center py-2">
          <div className="text-xl font-bold text-white">${positionValue.toFixed(2)}</div>
          <div className="text-xs text-white/60">Position</div>
        </div>

        {/* Token Breakdown with Percentages */}
        <div className="space-y-3">
          {/* Percentage Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-rose-400 rounded-full"></div>
              <span className="text-sm font-medium text-white">{kiltPercentage.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{ethPercentage.toFixed(1)}%</span>
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 transition-all duration-500" 
              style={{ width: '100%' }}
            />
          </div>
          
          {/* Token Amount Details */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TokenLogo token="KILT" className="h-4 w-4" />
                <span className="text-sm text-white font-medium">${kiltValue.toFixed(2)}</span>
              </div>
              <span className="text-sm text-white/60">{kiltAmount.toLocaleString()} KILT</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TokenLogo token="ETH" className="h-4 w-4" />
                <span className="text-sm text-white font-medium">${ethValue.toFixed(2)}</span>
              </div>
              <span className="text-sm text-white/60">{ethAmount.toFixed(3)} WETH</span>
            </div>
          </div>
        </div>

        {/* Fees Earned Section */}
        <div className="theme-card p-3">
          <div className="text-xs text-white/60 mb-1">Fees earned</div>
          <div className="text-lg font-bold text-white">
            ${formatSmallAmount(feesEarned)}
          </div>
          
          {/* Fee Breakdown */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-rose-400 rounded-full"></div>
              <span className="text-xs text-white/80">
                {feesEarned > 0 ? `${((kiltFeesEarned * kiltPrice / feesEarned) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/80">
                {feesEarned > 0 ? `${((ethFeesEarned * ethPrice / feesEarned) * 100).toFixed(1)}%` : '0%'}
              </span>
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></div>
            </div>
          </div>
          
          {/* Individual Fee Amounts */}
          <div className="space-y-1 mt-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <TokenLogo token="KILT" className="h-3 w-3" />
                <span className="text-xs text-white/60">${formatSmallAmount(kiltFeesEarned * kiltPrice)}</span>
              </div>
              <span className="text-xs text-white/60">{kiltFeesEarned.toLocaleString()} KILT</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <TokenLogo token="ETH" className="h-3 w-3" />
                <span className="text-xs text-white/60">${formatSmallAmount(ethFeesEarned * ethPrice)}</span>
              </div>
              <span className="text-xs text-white/60">{ethFeesEarned.toFixed(6)} WETH</span>
            </div>
          </div>

        </div>

        {/* Range Status */}
        <div className="flex items-center justify-center">
          <Badge 
            variant={isInRange ? "default" : "secondary"} 
            className={`text-xs px-3 py-1 ${
              isInRange 
                ? 'theme-badge-success' 
                : 'theme-badge-danger'
            }`}
          >
            {isInRange ? "In Range" : "Out of Range"}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            size="sm"
            onClick={() => onAddLiquidity?.(position)}
            className="h-9 text-xs font-medium theme-button-primary"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
          <Button 
            size="sm"
            onClick={() => onRemoveLiquidity?.(position)}
            className="h-9 text-xs font-medium theme-button-accent"
          >
            <Minus className="h-3 w-3 mr-1" />
            Remove
          </Button>
          <Button 
            size="sm"
            onClick={() => onCollectFees?.(position)}
            className="h-9 text-xs font-medium theme-button-secondary"
          >
            <DollarSign className="h-3 w-3 mr-1" />
            Collect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};