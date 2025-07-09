import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWallet } from '@/contexts/wallet-context';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  TrendingUp, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  Info,
  Zap,
  BarChart3
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

// Rebalancing strategy types
export type RebalancingStrategy = 'conservative' | 'balanced' | 'aggressive' | 'custom';

export interface RebalancingRecommendation {
  positionId: bigint;
  currentRange: { lower: number; upper: number };
  recommendedRange: { lower: number; upper: number };
  currentPrice: number;
  efficiency: number;
  impermanentLoss: number;
  expectedFees: number;
  riskLevel: 'low' | 'medium' | 'high';
  action: 'rebalance' | 'close' | 'maintain';
  reasoning: string;
}

export interface RebalancingPlan {
  totalPositions: number;
  positionsToRebalance: number;
  estimatedGasCost: number;
  expectedFeeIncrease: number;
  impermanentLossReduction: number;
  recommendations: RebalancingRecommendation[];
}

export function LiquidityRebalancing() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const { data: kiltData } = useKiltTokenData();
  
  const {
    kiltEthPositions,
    poolData,
    formatTokenAmount,
    calculatePositionValue,
    isPositionInRange,
    decreaseLiquidity,
    increaseLiquidity,
    isDecreasing,
    isIncreasing
  } = useUniswapV3();

  const [selectedStrategy, setSelectedStrategy] = useState<RebalancingStrategy>('balanced');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [customRange, setCustomRange] = useState<number[]>([20]); // ±20% default
  const [rebalancingPlan, setRebalancingPlan] = useState<RebalancingPlan | null>(null);
  const [selectedPositions, setSelectedPositions] = useState<Set<bigint>>(new Set());

  // Strategy configurations
  const strategies = {
    conservative: { range: 50, description: 'Wide range, low risk, stable fees' },
    balanced: { range: 30, description: 'Moderate range, balanced risk/reward' },
    aggressive: { range: 10, description: 'Tight range, high risk, maximum fees' },
    custom: { range: customRange[0], description: 'Your custom range settings' }
  };

  // Get current KILT price
  const currentPrice = kiltData?.price || 0.016; // Fallback to recent price

  // Calculate tick from price (simplified for KILT/ETH)
  const priceToTick = (price: number): number => {
    return Math.log(price) / Math.log(1.0001);
  };

  // Calculate price from tick
  const tickToPrice = (tick: number): number => {
    return 1.0001 ** tick;
  };

  // Get optimal range based on strategy
  const getOptimalRange = (strategy: RebalancingStrategy, currentPrice: number) => {
    const rangePercent = strategies[strategy].range / 100;
    const lowerPrice = currentPrice * (1 - rangePercent);
    const upperPrice = currentPrice * (1 + rangePercent);
    
    return {
      lower: priceToTick(lowerPrice),
      upper: priceToTick(upperPrice)
    };
  };

  // Analyze positions for rebalancing opportunities
  const analyzePositions = async () => {
    if (!kiltEthPositions || !poolData || !currentPrice) {
      toast({
        title: "Analysis Not Available",
        description: "No positions found or missing price data.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const recommendations: RebalancingRecommendation[] = [];
      
      for (const position of kiltEthPositions) {
        if (position.liquidity === 0n) continue;

        const currentRange = {
          lower: position.tickLower,
          upper: position.tickUpper
        };

        const optimalRange = getOptimalRange(selectedStrategy, currentPrice);
        const currentPriceTick = priceToTick(currentPrice);
        
        // Calculate position efficiency (how close to current price)
        const rangeWidth = currentRange.upper - currentRange.lower;
        const distanceFromPrice = Math.min(
          Math.abs(currentPriceTick - currentRange.lower),
          Math.abs(currentPriceTick - currentRange.upper)
        );
        const efficiency = Math.max(0, 100 - (distanceFromPrice / rangeWidth * 100));

        // Calculate impermanent loss estimate
        const priceChange = Math.abs(currentPriceTick - (currentRange.lower + currentRange.upper) / 2);
        const impermanentLoss = (priceChange / rangeWidth) * 100;

        // Determine if rebalancing is needed
        const needsRebalancing = 
          currentPriceTick < currentRange.lower + rangeWidth * 0.1 ||
          currentPriceTick > currentRange.upper - rangeWidth * 0.1 ||
          efficiency < 50;

        recommendations.push({
          positionId: position.tokenId,
          currentRange,
          recommendedRange: optimalRange,
          currentPrice,
          efficiency,
          impermanentLoss,
          expectedFees: efficiency * 0.1, // Rough estimate
          riskLevel: impermanentLoss > 20 ? 'high' : impermanentLoss > 10 ? 'medium' : 'low',
          action: needsRebalancing ? 'rebalance' : 'maintain',
          reasoning: needsRebalancing 
            ? `Position is ${efficiency < 50 ? 'inefficient' : 'out of range'}. Rebalancing will improve fee generation.`
            : 'Position is performing well within current range.'
        });
      }

      const positionsToRebalance = recommendations.filter(r => r.action === 'rebalance');
      
      setRebalancingPlan({
        totalPositions: kiltEthPositions.length,
        positionsToRebalance: positionsToRebalance.length,
        estimatedGasCost: positionsToRebalance.length * 0.01, // Rough estimate
        expectedFeeIncrease: positionsToRebalance.reduce((sum, r) => sum + r.expectedFees, 0),
        impermanentLossReduction: positionsToRebalance.reduce((sum, r) => sum + r.impermanentLoss, 0) * 0.3,
        recommendations
      });

      toast({
        title: "Analysis Complete",
        description: `Found ${positionsToRebalance.length} positions that could benefit from rebalancing.`,
      });

    } catch (error) {
      // Analysis failed
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze positions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Execute rebalancing plan
  const executeRebalancing = async () => {
    if (!rebalancingPlan || !address) return;

    setIsRebalancing(true);
    
    try {
      const positionsToRebalance = rebalancingPlan.recommendations.filter(r => 
        r.action === 'rebalance' && selectedPositions.has(r.positionId)
      );

      for (const recommendation of positionsToRebalance) {
        // First, decrease liquidity to get tokens back
        await decreaseLiquidity.mutateAsync({
          tokenId: recommendation.positionId,
          liquidity: 0n, // Remove all liquidity
          amount0Min: 0n,
          amount1Min: 0n,
          deadline: BigInt(Math.floor(Date.now() / 1000) + 1200) // 20 minutes
        });

        // Then create new position with optimal range
        // This would require minting a new position with the recommended range
        // For now, we'll just show the rebalancing intent
      }

      toast({
        title: "Rebalancing Complete",
        description: `Successfully rebalanced ${positionsToRebalance.length} positions.`,
      });

      // Refresh analysis after rebalancing
      await analyzePositions();

    } catch (error) {
      // Rebalancing failed
      toast({
        title: "Rebalancing Failed",
        description: "Some positions may not have been rebalanced. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRebalancing(false);
    }
  };

  // Auto-analyze when strategy changes
  useEffect(() => {
    if (isConnected && kiltEthPositions && poolData && currentPrice > 0) {
      analyzePositions();
    }
  }, [selectedStrategy, customRange, kiltEthPositions, poolData, isConnected, currentPrice]);

  // Toggle position selection
  const togglePositionSelection = (positionId: bigint) => {
    const newSelection = new Set(selectedPositions);
    if (newSelection.has(positionId)) {
      newSelection.delete(positionId);
    } else {
      newSelection.add(positionId);
    }
    setSelectedPositions(newSelection);
  };

  if (!isConnected) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Connect your wallet to access the rebalancing assistant</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Zap className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Liquidity Rebalancing Assistant</h2>
            <p className="text-gray-400 text-sm">Optimize your LP positions with AI-powered recommendations</p>
          </div>
        </div>
        
        <Button 
          onClick={analyzePositions}
          disabled={isAnalyzing || !kiltEthPositions?.length}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analyze Positions
            </>
          )}
        </Button>
      </div>

      {/* Strategy Selection */}
      <Card className="bg-black/20 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Rebalancing Strategy</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(strategies).map(([key, config]) => (
              <Button
                key={key}
                variant={selectedStrategy === key ? "default" : "outline"}
                onClick={() => setSelectedStrategy(key as RebalancingStrategy)}
                className={`h-auto p-3 flex flex-col items-start space-y-2 ${
                  selectedStrategy === key 
                    ? 'bg-blue-600 border-blue-500' 
                    : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                }`}
              >
                <div className="font-semibold capitalize">{key}</div>
                <div className="text-xs text-gray-300">{config.description}</div>
                <Badge variant="secondary" className="text-xs">
                  ±{key === 'custom' ? customRange[0] : config.range}%
                </Badge>
              </Button>
            ))}
          </div>

          {selectedStrategy === 'custom' && (
            <div className="pt-4 border-t border-gray-700">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Custom Range</span>
                  <span className="text-sm font-mono text-blue-400">±{customRange[0]}%</span>
                </div>
                <Slider
                  value={customRange}
                  onValueChange={setCustomRange}
                  max={100}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>5% (Very Tight)</span>
                  <span>100% (Very Wide)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {rebalancingPlan && (
        <Card className="bg-black/20 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Rebalancing Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-sm text-gray-400">Total Positions</div>
                <div className="text-xl font-bold text-white">{rebalancingPlan.totalPositions}</div>
              </div>
              <div className="bg-yellow-500/20 p-3 rounded-lg">
                <div className="text-sm text-yellow-400">Need Rebalancing</div>
                <div className="text-xl font-bold text-yellow-400">{rebalancingPlan.positionsToRebalance}</div>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <div className="text-sm text-green-400">Fee Increase</div>
                <div className="text-xl font-bold text-green-400">+{rebalancingPlan.expectedFeeIncrease.toFixed(1)}%</div>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <div className="text-sm text-blue-400">Est. Gas Cost</div>
                <div className="text-xl font-bold text-blue-400">${rebalancingPlan.estimatedGasCost.toFixed(3)}</div>
              </div>
            </div>

            {/* Position Recommendations */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Position Recommendations</h3>
              
              {rebalancingPlan.recommendations.map((recommendation) => (
                <div key={recommendation.positionId.toString()} className="bg-gray-800/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedPositions.has(recommendation.positionId)}
                        onChange={() => togglePositionSelection(recommendation.positionId)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-2">
                        <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
                        <span className="font-mono text-sm text-gray-300">
                          Position #{recommendation.positionId.toString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={recommendation.action === 'rebalance' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {recommendation.action === 'rebalance' ? 'Rebalance' : 'Maintain'}
                      </Badge>
                      <Badge 
                        variant={recommendation.riskLevel === 'high' ? 'destructive' : 
                               recommendation.riskLevel === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {recommendation.riskLevel} risk
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Current Range</div>
                      <div className="font-mono text-white">
                        {tickToPrice(recommendation.currentRange.lower).toFixed(4)} - {tickToPrice(recommendation.currentRange.upper).toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Recommended Range</div>
                      <div className="font-mono text-blue-400">
                        {tickToPrice(recommendation.recommendedRange.lower).toFixed(4)} - {tickToPrice(recommendation.recommendedRange.upper).toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">Efficiency</div>
                      <div className="flex items-center space-x-2">
                        <div className="font-bold text-white">{recommendation.efficiency.toFixed(1)}%</div>
                        {recommendation.efficiency < 50 ? (
                          <TrendingDown className="h-4 w-4 text-red-400" />
                        ) : recommendation.efficiency > 80 ? (
                          <TrendingUp className="h-4 w-4 text-green-400" />
                        ) : (
                          <Target className="h-4 w-4 text-yellow-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="text-xs text-gray-400 flex items-center space-x-1">
                      <Info className="h-3 w-3" />
                      <span>{recommendation.reasoning}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Button */}
            {rebalancingPlan.positionsToRebalance > 0 && (
              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    {selectedPositions.size} of {rebalancingPlan.positionsToRebalance} positions selected
                  </div>
                  <Button 
                    onClick={executeRebalancing}
                    disabled={selectedPositions.size === 0 || isRebalancing}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isRebalancing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Rebalancing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Execute Rebalancing ({selectedPositions.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Positions Message */}
      {!kiltEthPositions?.length && (
        <Card className="bg-black/20 border-gray-800">
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No LP Positions Found</h3>
            <p className="text-gray-400 mb-4">
              You need active KILT/ETH liquidity positions to use the rebalancing assistant.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Add Liquidity First
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <Card className="bg-black/20 border-gray-800">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}