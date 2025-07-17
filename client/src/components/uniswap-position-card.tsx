import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, DollarSign, CheckCircle } from 'lucide-react';
import { TokenLogo } from './ui/token-logo';

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
  // Calculate position value and token amounts
  const positionValue = position.currentValueUSD || 0;
  const kiltAmount = position.token0 && position.token0.toLowerCase().includes('5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8') 
    ? parseFloat(position.amount0 || '0')
    : parseFloat(position.amount1 || '0');
  const ethAmount = position.token0 && position.token0.toLowerCase().includes('5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8') 
    ? parseFloat(position.amount1 || '0')
    : parseFloat(position.amount0 || '0');
  
  const kiltPrice = 0.01718; // Current KILT price
  const ethPrice = 3400; // Current ETH price
  const kiltValue = kiltAmount * kiltPrice;
  const ethValue = ethAmount * ethPrice;
  const kiltPercentage = positionValue > 0 ? (kiltValue / positionValue) * 100 : 50;
  const ethPercentage = positionValue > 0 ? (ethValue / positionValue) * 100 : 50;
  
  // Calculate fees earned
  const feesEarned = position.fees ? 
    (parseFloat(position.fees.token0 || '0') * kiltPrice) + (parseFloat(position.fees.token1 || '0') * ethPrice) : 0;
  
  // Determine if position is in range
  const isInRange = position.isActive && parseFloat(position.liquidity) > 0;
  
  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm border border-purple-500/30 rounded-lg overflow-hidden hover:border-purple-400/50 transition-all duration-300">
      <CardContent className="p-4 space-y-4">
        {/* Header with Pool Info and NFT ID */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-white">KILT/WETH</div>
            <div className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded">
              {position.fee ? `${(position.fee / 10000).toFixed(1)}%` : '0.3%'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-white/60">#{position.tokenId}</div>
            {position.isRegistered && (
              <CheckCircle className="h-3 w-3 text-emerald-400" />
            )}
          </div>
        </div>

        {/* Position Value - Large Display */}
        <div className="text-center py-2">
          <div className="text-2xl font-bold text-white">${positionValue.toFixed(2)}</div>
          <div className="text-xs text-white/60">Position</div>
        </div>

        {/* Token Breakdown with Percentages */}
        <div className="space-y-3">
          {/* Percentage Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
              <span className="text-sm font-medium text-white">{kiltPercentage.toFixed(1)}%</span>
            </div>
            <span className="text-sm font-medium text-white">{ethPercentage.toFixed(1)}%</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white"></span>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 to-blue-500 transition-all duration-500" 
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
              <span className="text-sm text-white/60">{kiltAmount.toFixed(0)} KILT</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TokenLogo token="ETH" className="h-4 w-4" />
                <span className="text-sm text-white font-medium">${ethValue.toFixed(2)}</span>
              </div>
              <span className="text-sm text-white/60">{ethAmount.toFixed(4)} WETH</span>
            </div>
          </div>
        </div>

        {/* Fees Earned Section */}
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-white/60 mb-1">Fees earned</div>
          <div className="text-lg font-bold text-white">${feesEarned.toFixed(6)}</div>
          
          {/* Fee Breakdown */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
              <span className="text-xs text-white/80">
                {feesEarned > 0 ? `${((parseFloat(position.fees?.token0 || '0') * kiltPrice / feesEarned) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <span className="text-xs text-white/80">
              {feesEarned > 0 ? `${((parseFloat(position.fees?.token1 || '0') * ethPrice / feesEarned) * 100).toFixed(1)}%` : '0%'}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
          
          {/* Individual Fee Amounts */}
          <div className="flex justify-between items-center mt-2 text-xs text-white/60">
            <div className="flex items-center gap-1">
              <TokenLogo token="KILT" className="h-3 w-3" />
              <span>${(parseFloat(position.fees?.token0 || '0') * kiltPrice).toFixed(6)}</span>
            </div>
            <div className="flex items-center gap-1">
              <TokenLogo token="ETH" className="h-3 w-3" />
              <span>${(parseFloat(position.fees?.token1 || '0') * ethPrice).toFixed(6)}</span>
            </div>
          </div>
        </div>

        {/* Range Status */}
        <div className="flex items-center justify-center">
          <Badge 
            variant={isInRange ? "default" : "secondary"} 
            className={`text-xs px-3 py-1 ${
              isInRange 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}
          >
            {isInRange ? "In Range" : "Out of Range"}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            size="sm"
            onClick={() => onAddLiquidity?.(position)}
            className="flex-1 h-8 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
          <Button 
            size="sm"
            onClick={() => onRemoveLiquidity?.(position)}
            className="flex-1 h-8 text-xs bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400"
          >
            <Minus className="h-3 w-3 mr-1" />
            Remove
          </Button>
          <Button 
            size="sm"
            onClick={() => onCollectFees?.(position)}
            className="flex-1 h-8 text-xs bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400"
          >
            <DollarSign className="h-3 w-3 mr-1" />
            Collect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};