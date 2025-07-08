import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Fuel, 
  TrendingUp, 
  TrendingDown, 
  Loader2, 
  AlertCircle,
  Info,
  Zap
} from 'lucide-react';
import { useGasEstimation } from '@/hooks/use-gas-estimation';

interface GasEstimationCardProps {
  operation?: 'approve' | 'mint' | 'increase' | 'decrease' | 'collect' | 'burn' | 'total';
  compact?: boolean;
  className?: string;
}

export function GasEstimationCard({ 
  operation = 'total', 
  compact = false,
  className = ''
}: GasEstimationCardProps) {
  const { getTransactionCosts, gasPrice, isLoading, error } = useGasEstimation();
  const costs = getTransactionCosts();

  if (isLoading) {
    return (
      <Card className={`bg-white/5 border-white/10 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span className="text-white/70 text-sm">Estimating gas costs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-red-500/10 border-red-500/20 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCurrentEstimation = () => {
    switch (operation) {
      case 'approve':
        return costs.approve;
      case 'mint':
        return costs.mint;
      case 'increase':
        return costs.increaseLiquidity;
      case 'decrease':
        return costs.decreaseLiquidity;
      case 'collect':
        return costs.collect;
      case 'burn':
        return costs.burn;
      default:
        return null;
    }
  };

  const currentEstimation = getCurrentEstimation();
  const gasPriceGwei = parseFloat(currentEstimation?.gasPriceGwei || '0');
  const isLowGas = gasPriceGwei < 0.001;
  const isHighGas = gasPriceGwei > 0.01;

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 ${className}`}>
        <div className="flex items-center space-x-2">
          <Fuel className="h-4 w-4 text-blue-400" />
          <span className="text-white/70 text-sm">Gas:</span>
        </div>
        
        {operation === 'total' ? (
          <div className="flex items-center space-x-4">
            <div className="text-white font-medium tabular-nums">
              {costs.total.estimatedCost} ETH
            </div>
            <div className="text-white/60 text-sm tabular-nums">
              ≈ ${costs.total.estimatedCostUSD}
            </div>
          </div>
        ) : currentEstimation && (
          <div className="flex items-center space-x-4">
            <div className="text-white font-medium tabular-nums">
              {currentEstimation.estimatedCost} ETH
            </div>
            <div className="text-white/60 text-sm tabular-nums">
              ≈ ${currentEstimation.estimatedCostUSD}
            </div>
          </div>
        )}
        
        <Badge 
          variant="secondary" 
          className={`text-xs ${
            isLowGas ? 'bg-green-500/20 text-green-400' :
            isHighGas ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}
        >
          {gasPriceGwei.toFixed(4)} gwei
        </Badge>
      </div>
    );
  }

  return (
    <Card className={`bg-white/5 border-white/10 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Fuel className="h-5 w-5 text-blue-400" />
          Transaction Cost Estimation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Gas Price */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span className="text-white/70">Current Gas Price</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium tabular-nums">
              {gasPriceGwei.toFixed(4)} gwei
            </span>
            {isLowGas ? (
              <TrendingDown className="h-4 w-4 text-green-400" />
            ) : isHighGas ? (
              <TrendingUp className="h-4 w-4 text-red-400" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-yellow-400/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              </div>
            )}
          </div>
        </div>

        {/* Operation Costs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-sm">Token Approval</span>
            <div className="text-right">
              <div className="text-white font-medium tabular-nums">
                {costs.approve.estimatedCost} ETH
              </div>
              <div className="text-white/50 text-xs tabular-nums">
                ≈ ${costs.approve.estimatedCostUSD}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-sm">Add Liquidity</span>
            <div className="text-right">
              <div className="text-white font-medium tabular-nums">
                {costs.mint.estimatedCost} ETH
              </div>
              <div className="text-white/50 text-xs tabular-nums">
                ≈ ${costs.mint.estimatedCostUSD}
              </div>
            </div>
          </div>
          
          <Separator className="bg-white/10" />
          
          <div className="flex items-center justify-between font-semibold">
            <span className="text-white">Total Cost</span>
            <div className="text-right">
              <div className="text-white font-bold tabular-nums">
                {costs.total.estimatedCost} ETH
              </div>
              <div className="text-emerald-400 text-sm tabular-nums">
                ≈ ${costs.total.estimatedCostUSD}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Operations */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-white/60 text-xs mb-2">Other Operations</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-white/50">Increase Liquidity</span>
              <span className="text-white/70 tabular-nums">${costs.increaseLiquidity.estimatedCostUSD}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Decrease Liquidity</span>
              <span className="text-white/70 tabular-nums">${costs.decreaseLiquidity.estimatedCostUSD}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Collect Fees</span>
              <span className="text-white/70 tabular-nums">${costs.collect.estimatedCostUSD}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Remove Position</span>
              <span className="text-white/70 tabular-nums">${costs.burn.estimatedCostUSD}</span>
            </div>
          </div>
        </div>

        {/* Gas Price Indicator */}
        <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 p-2 rounded">
          <Info className="h-3 w-3" />
          <span>
            {isLowGas ? 'Low gas prices - Good time to transact!' :
             isHighGas ? 'High gas prices - Consider waiting' :
             'Moderate gas prices - Normal network activity'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}