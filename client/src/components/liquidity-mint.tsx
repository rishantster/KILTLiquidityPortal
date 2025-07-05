import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Plus, 
  Coins, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  Target,
  Zap,
  TrendingUp
} from 'lucide-react';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useWallet } from '@/hooks/use-wallet';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { TOKENS } from '@/lib/uniswap-v3';
import { useToast } from '@/hooks/use-toast';

export function LiquidityMint() {
  const { address, isConnected } = useWallet();
  const { 
    kiltBalance, 
    wethBalance, 
    poolExists, 
    mintPosition, 
    approveToken,
    isMinting, 
    isApproving,
    formatTokenAmount,
    parseTokenAmount 
  } = useUniswapV3();
  const { data: kiltData } = useKiltTokenData();
  const { toast } = useToast();

  const [kiltAmount, setKiltAmount] = useState('');
  const [wethAmount, setWethAmount] = useState('');
  const [positionSizePercent, setPositionSizePercent] = useState([0]);
  const [selectedStrategy, setSelectedStrategy] = useState('narrow');

  // Price range strategies
  const priceStrategies = [
    { 
      id: 'narrow', 
      label: 'Narrow (±25%)', 
      range: 0.25,
      description: '75% to 125% of current price',
      risk: 'Higher fees, higher impermanent loss risk'
    },
    { 
      id: 'balanced', 
      label: 'Balanced (±50%)', 
      range: 0.50,
      description: '50% to 150% of current price',
      risk: 'Balanced fees and impermanent loss'
    },
    { 
      id: 'wide', 
      label: 'Wide (±100%)', 
      range: 1.00,
      description: '0% to 200% of current price',
      risk: 'Lower fees, lower impermanent loss risk'
    },
    { 
      id: 'full', 
      label: 'Full Range', 
      range: Infinity,
      description: 'Full price range (0 to ∞)',
      risk: 'Lowest fees, minimal impermanent loss'
    }
  ];

  // Auto-calculate amounts based on slider percentage
  useEffect(() => {
    const percent = positionSizePercent[0];
    
    // Handle 0% case - clear amounts
    if (percent === 0) {
      setKiltAmount('');
      setWethAmount('');
      return;
    }
    
    if (kiltBalance && percent > 0) {
      const maxKiltAmount = Number(formatTokenAmount(kiltBalance));
      const kiltAmountCalculated = (maxKiltAmount * percent / 100);
      
      console.log('Slider Update:', { percent, maxKiltAmount, kiltAmountCalculated, kiltBalance });
      
      // Ensure no negative values
      if (kiltAmountCalculated >= 0) {
        setKiltAmount(kiltAmountCalculated.toFixed(6));
        
        // Auto-calculate WETH amount based on current pool ratio
        const kiltPrice = kiltData?.price || 0.0289;
        const ethPrice = 3200; // Approximate ETH price
        const wethAmountCalculated = (kiltAmountCalculated * kiltPrice) / ethPrice;
        
        if (wethAmountCalculated >= 0) {
          setWethAmount(wethAmountCalculated.toFixed(6));
        }
      }
    }
  }, [positionSizePercent, kiltBalance, formatTokenAmount, kiltData?.price]);

  const handleKiltAmountChange = (value: string) => {
    // Prevent negative values
    const numValue = parseFloat(value);
    if (numValue < 0) return;
    
    setKiltAmount(value);
    
    // Auto-calculate WETH amount
    if (value && !isNaN(numValue)) {
      const kiltPrice = kiltData?.price || 0.0289;
      const ethPrice = 3200;
      const wethAmountCalculated = (numValue * kiltPrice) / ethPrice;
      
      if (wethAmountCalculated >= 0) {
        setWethAmount(wethAmountCalculated.toFixed(6));
      }
      
      // Update position size slider to reflect manual input
      if (kiltBalance) {
        const maxKiltAmount = Number(formatTokenAmount(kiltBalance));
        if (maxKiltAmount > 0) {
          const percentageUsed = Math.min(100, Math.max(0, (numValue / maxKiltAmount) * 100));
          console.log('Manual KILT Update:', { numValue, maxKiltAmount, percentageUsed });
          setPositionSizePercent([Math.round(percentageUsed)]);
        }
      }
    }
  };

  const handleWethAmountChange = (value: string) => {
    // Prevent negative values
    const numValue = parseFloat(value);
    if (numValue < 0) return;
    
    setWethAmount(value);
    
    // Auto-calculate KILT amount
    if (value && !isNaN(numValue)) {
      const kiltPrice = kiltData?.price || 0.0289;
      const ethPrice = 3200;
      const kiltAmountCalculated = (numValue * ethPrice) / kiltPrice;
      
      if (kiltAmountCalculated >= 0) {
        setKiltAmount(kiltAmountCalculated.toFixed(6));
        
        // Update position size slider based on KILT amount
        if (kiltBalance) {
          const maxKiltAmount = Number(formatTokenAmount(kiltBalance));
          if (maxKiltAmount > 0) {
            const percentageUsed = Math.min(100, Math.max(0, (kiltAmountCalculated / maxKiltAmount) * 100));
            setPositionSizePercent([Math.round(percentageUsed)]);
          }
        }
      }
    }
  };

  const handlePercentageSelect = (percent: number) => {
    setPositionSizePercent([percent]);
  };

  const handleSliderChange = (value: number[]) => {
    setPositionSizePercent(value);
  };

  const getSelectedStrategy = () => {
    return priceStrategies.find(s => s.id === selectedStrategy) || priceStrategies[0];
  };

  const handleApproveTokens = async () => {
    if (!address) return;
    
    try {
      const maxUint256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');
      
      // Approve KILT
      await approveToken({ tokenAddress: TOKENS.KILT as `0x${string}`, amount: maxUint256 });
      
      // Approve WETH
      await approveToken({ tokenAddress: TOKENS.WETH as `0x${string}`, amount: maxUint256 });
      
      toast({
        title: "Tokens Approved",
        description: "KILT and WETH have been approved for the Position Manager",
      });
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve tokens",
        variant: "destructive",
      });
    }
  };

  const handleMintPosition = async () => {
    if (!address || !kiltAmount || !wethAmount) return;

    try {
      const kiltAmountParsed = parseTokenAmount(kiltAmount);
      const wethAmountParsed = parseTokenAmount(wethAmount);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

      // Convert price range to ticks based on selected strategy
      const strategy = getSelectedStrategy();
      let tickLower, tickUpper;
      
      if (strategy.id === 'full') {
        // Full range: approximately -887220 to 887220
        tickLower = -887220;
        tickUpper = 887220;
      } else {
        // Calculate ticks based on percentage range
        // This is simplified - real implementation would use proper tick math
        const baseSpacing = 60; // For 0.3% fee tier
        const rangeInTicks = Math.floor(strategy.range * 1000 / baseSpacing) * baseSpacing;
        tickLower = -rangeInTicks;
        tickUpper = rangeInTicks;
      }

      await mintPosition({
        token0: TOKENS.KILT as `0x${string}`,
        token1: TOKENS.WETH as `0x${string}`,
        fee: 3000,
        tickLower,
        tickUpper,
        amount0Desired: kiltAmountParsed,
        amount1Desired: wethAmountParsed,
        amount0Min: BigInt(0),
        amount1Min: BigInt(0),
        recipient: address as `0x${string}`,
        deadline
      });

      toast({
        title: "Position Created!",
        description: "Your liquidity position has been successfully created",
      });

      // Reset form
      setKiltAmount('');
      setWethAmount('');
      setPositionSizePercent([25]);
    } catch (error: any) {
      toast({
        title: "Position Creation Failed",
        description: error.message || "Failed to create liquidity position",
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-white font-heading text-xl mb-2">Wallet Not Connected</h3>
          <p className="text-white/70 font-body">
            Please connect your wallet to add liquidity to the KILT/ETH pool
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-heading text-2xl flex items-center gap-2">
            <Plus className="h-6 w-6" />
            Add Liquidity to KILT/ETH Pool
          </h2>
          <p className="text-white/70 text-sm mt-1">
            Add liquidity to the existing official KILT/ETH pool and earn KILT rewards + trading fees
          </p>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
          {poolExists ? 'Pool Active' : 'Pool Not Found'}
        </Badge>
      </div>

      {/* Token Amounts with Integrated Position Size */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-400" />
            Position Size
          </CardTitle>
          <p className="text-white/60 text-sm">Amount to Provide: {positionSizePercent[0]}% of balance</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={positionSizePercent}
            onValueChange={handleSliderChange}
            max={100}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <Button
                key={percent}
                variant={positionSizePercent[0] === percent ? "default" : "outline"}
                size="sm"
                onClick={() => handlePercentageSelect(percent)}
                className="flex-1"
              >
                {percent}%
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">K</span>
              </div>
              KILT Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="number"
              value={kiltAmount}
              onChange={(e) => handleKiltAmountChange(e.target.value)}
              placeholder="0.0"
              min="0"
              className="bg-white/5 border-white/10 text-white text-xl h-12"
            />
            <div className="flex justify-between text-sm">
              <span className="text-white/60">
                Balance: {kiltBalance ? formatTokenAmount(kiltBalance) : '0.0000'} KILT
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePercentageSelect(100)}
                className="text-emerald-400 hover:text-emerald-300 p-0 h-auto"
              >
                MAX
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">Ξ</span>
              </div>
              WETH Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="number"
              value={wethAmount}
              onChange={(e) => handleWethAmountChange(e.target.value)}
              placeholder="0.0"
              min="0"
              className="bg-white/5 border-white/10 text-white text-xl h-12"
            />
            <div className="flex justify-between text-sm">
              <span className="text-white/60">
                Balance: {wethBalance ? formatTokenAmount(wethBalance) : '0.0000'} WETH
              </span>
              <span className="text-white/40">
                Auto-calculated
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Range Strategy */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            Price Range Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {priceStrategies.map((strategy) => (
              <Button
                key={strategy.id}
                variant={selectedStrategy === strategy.id ? "default" : "outline"}
                onClick={() => setSelectedStrategy(strategy.id)}
                className="h-auto p-3 flex-col items-start"
              >
                <span className="font-semibold">{strategy.label}</span>
              </Button>
            ))}
          </div>
          
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-400" />
              <span className="text-white font-medium">Selected Range</span>
            </div>
            <p className="text-white/80 text-sm mb-1">{getSelectedStrategy().description}</p>
            <p className="text-white/60 text-xs">{getSelectedStrategy().risk}</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={handleApproveTokens}
          disabled={isApproving || !poolExists}
          className="h-12 bg-blue-600 hover:bg-blue-700"
        >
          {isApproving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve Tokens
            </>
          )}
        </Button>

        <Button
          onClick={handleMintPosition}
          disabled={isMinting || !kiltAmount || !wethAmount || !poolExists}
          className="h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
        >
          {isMinting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding Liquidity...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Liquidity
            </>
          )}
        </Button>
      </div>

      {/* Important Info */}
      <Card className="cluely-card rounded-2xl border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-white/70 text-sm">
                Adding liquidity to the KILT/ETH pool provides dual earning opportunities:
              </p>
              <ul className="text-white/60 text-xs space-y-1">
                <li>• <strong className="text-emerald-400">KILT Rewards:</strong> Earn KILT tokens from the treasury allocation (47.2% APR)</li>
                <li>• <strong className="text-blue-400">Trading Fees:</strong> Earn 0.3% of all trades within your price range</li>
                <li>• <strong className="text-yellow-400">Size Multipliers:</strong> Larger positions earn up to 1.8x reward multipliers</li>
                <li>• <strong className="text-purple-400">Time Multipliers:</strong> Long-term staking earns up to 2.0x multipliers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}