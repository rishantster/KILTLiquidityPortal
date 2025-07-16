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
  TrendingUp,
  Clock
} from 'lucide-react';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useWallet } from '@/contexts/wallet-context';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useAppSession } from '@/hooks/use-app-session';
import { TOKENS } from '@/lib/uniswap-v3';
import { BASE_NETWORK_ID } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { GasEstimationCard } from './gas-estimation-card';
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
  const { sessionId, createAppSession, recordAppTransaction, isCreatingSession } = useAppSession();
  const { toast } = useToast();

  const [kiltAmount, setKiltAmount] = useState('');
  const [wethAmount, setWethAmount] = useState('');
  const [positionSizePercent, setPositionSizePercent] = useState([0]);
  const [selectedStrategy, setSelectedStrategy] = useState('balanced');
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);

  // Logo animation timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoAnimationComplete(true);
    }, 800); // Match the animation duration
    return () => clearTimeout(timer);
  }, []);

  // Price range strategies - ordered by recommendation
  const priceStrategies = [
    { 
      id: 'balanced', 
      label: 'Balanced (±50%)', 
      range: 0.50,
      description: '50% to 150% of current price',
      risk: 'Optimal balance of fees and stability',
      recommended: true
    },
    { 
      id: 'wide', 
      label: 'Wide (±100%)', 
      range: 1.00,
      description: '0% to 200% of current price',
      risk: 'Lower fees, lower impermanent loss risk'
    },
    { 
      id: 'narrow', 
      label: 'Narrow (±25%)', 
      range: 0.25,
      description: '75% to 125% of current price',
      risk: 'Higher fees, higher impermanent loss risk'
    },
    { 
      id: 'full', 
      label: 'Full Range', 
      range: Infinity,
      description: 'Full price range (0 to ∞)',
      risk: 'Lowest fees, minimal impermanent loss'
    }
  ];

  // Auto-calculate amounts based on slider percentage - limited by WETH balance
  useEffect(() => {
    // Don't auto-calculate if user is manually entering values
    if (isManualInput) return;
    
    const percent = positionSizePercent[0];
    
    // Handle 0% case - clear amounts
    if (percent === 0) {
      setKiltAmount('');
      setWethAmount('');
      return;
    }
    
    if (wethBalance && percent > 0) {
      try {
        const wethBalanceStr = formatTokenAmount(wethBalance);
        const maxWethAmount = parseFloat(wethBalanceStr);
        
        if (!isNaN(maxWethAmount) && maxWethAmount > 0) {
          const wethAmountCalculated = (maxWethAmount * percent / 100);
          
          // Ensure no negative values
          if (wethAmountCalculated >= 0) {
            setWethAmount(wethAmountCalculated.toFixed(3)); // 3 decimal places
            
            // Auto-calculate KILT amount based on current pool ratio
            const kiltPrice = kiltData?.price || 0.0289;
            const ethPrice = 3200; // Approximate ETH price
            const kiltAmountCalculated = (wethAmountCalculated * ethPrice) / kiltPrice;
            
            if (kiltAmountCalculated >= 0) {
              setKiltAmount(kiltAmountCalculated.toFixed(3)); // 3 decimal places
            }
          }
        }
      } catch (error) {
        // Error calculating amounts
      }
    }
  }, [positionSizePercent, wethBalance, formatTokenAmount, kiltData?.price, isManualInput]);

  const handleKiltAmountChange = (value: string) => {
    // Prevent negative values
    const numValue = parseFloat(value);
    if (numValue < 0) return;
    
    setIsManualInput(true);
    setKiltAmount(value);
    
    // Auto-calculate WETH amount
    if (value && !isNaN(numValue)) {
      const kiltPrice = kiltData?.price || 0.0289;
      const ethPrice = 3200;
      const wethAmountCalculated = (numValue * kiltPrice) / ethPrice;
      
      if (wethAmountCalculated >= 0) {
        setWethAmount(wethAmountCalculated.toFixed(3)); // 3 decimal places
      }
      
      // Update position size slider based on WETH balance (limiting factor)
      if (wethBalance) {
        try {
          const wethBalanceStr = formatTokenAmount(wethBalance);
          const maxWethAmount = parseFloat(wethBalanceStr);
          if (!isNaN(maxWethAmount) && maxWethAmount > 0) {
            const percentageUsed = Math.min(100, Math.max(0, (wethAmountCalculated / maxWethAmount) * 100));
            setPositionSizePercent([Math.round(percentageUsed)]);
          }
        } catch (error) {
          // Error updating slider
        }
      }
    } else if (value === '') {
      setWethAmount('');
      setPositionSizePercent([0]);
    }
  };

  const handleWethAmountChange = (value: string) => {
    // Prevent negative values
    const numValue = parseFloat(value);
    if (numValue < 0) return;
    
    setIsManualInput(true);
    setWethAmount(value);
    
    // Auto-calculate KILT amount
    if (value && !isNaN(numValue)) {
      const kiltPrice = kiltData?.price || 0.0289;
      const ethPrice = 3200;
      const kiltAmountCalculated = (numValue * ethPrice) / kiltPrice;
      
      if (kiltAmountCalculated >= 0) {
        setKiltAmount(kiltAmountCalculated.toFixed(3)); // 3 decimal places
        
        // Update position size slider based on WETH balance (limiting factor)
        if (wethBalance) {
          try {
            const wethBalanceStr = formatTokenAmount(wethBalance);
            const maxWethAmount = parseFloat(wethBalanceStr);
            if (!isNaN(maxWethAmount) && maxWethAmount > 0) {
              const percentageUsed = Math.min(100, Math.max(0, (numValue / maxWethAmount) * 100));
              setPositionSizePercent([Math.round(percentageUsed)]);
            }
          } catch (error) {
            // Error updating slider from WETH
          }
        }
      }
    } else if (value === '') {
      setKiltAmount('');
      setPositionSizePercent([0]);
    }
  };

  const handlePercentageSelect = (percent: number) => {
    setIsManualInput(false); // Reset to auto-calculation when using slider/buttons
    setPositionSizePercent([percent]);
  };

  const handleSliderChange = (value: number[]) => {
    setIsManualInput(false); // Reset to auto-calculation when using slider
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
    } catch (error: unknown) {
      toast({
        title: "Approval Failed",
        description: (error as Error)?.message || "Failed to approve tokens",
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
    } catch (error: unknown) {
      toast({
        title: "Position Creation Failed",
        description: (error as Error)?.message || "Failed to create liquidity position",
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <Card className="cluely-card rounded-lg">
        <CardContent className="p-4 text-center">
          <AlertCircle className="h-6 w-6 text-amber-400 mx-auto mb-2" />
          <h3 className="text-white font-heading text-sm mb-1">Wallet Not Connected</h3>
          <p className="text-white/70 font-body text-xs">
            Please connect your wallet to add liquidity to the KILT/ETH pool
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sleek Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Plus className="h-4 w-4 text-emerald-400" />
          <h2 className="text-white font-heading text-lg">Add Liquidity to KILT/ETH Pool</h2>
        </div>
        <p className="text-white/70 text-xs max-w-xl mx-auto">
          Add liquidity to the existing official KILT/ETH pool and earn KILT rewards + trading fees
        </p>
        <div className="text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 inline-block">
          <Info className="h-3 w-3 inline mr-1" />
          Minimum position value: $10 (anti-spam protection)
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-2 py-0.5 text-xs">
          {poolExists ? 'Pool Active' : 'Pool Not Found'}
        </Badge>
      </div>
      {/* Sleek Position Size */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/20 rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Target className="h-3 w-3 text-emerald-400" />
            Position Size
          </CardTitle>
          <p className="text-white/60 text-xs">Amount to Provide: {positionSizePercent[0]}% of WETH balance</p>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
          <div className="space-y-3">
            <Slider
              value={positionSizePercent}
              onValueChange={handleSliderChange}
              max={100}
              min={0}
              step={1}
              className="w-full h-2"
            />
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((percent) => (
                <Button
                  key={percent}
                  variant={positionSizePercent[0] === percent ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePercentageSelect(percent)}
                  className={`h-8 text-xs font-semibold transition-all duration-300 ${
                    positionSizePercent[0] === percent 
                      ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg' 
                      : 'hover:bg-emerald-500/10 hover:border-emerald-500/50'
                  }`}
                >
                  {percent}%
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Sleek Token Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sleek KILT Input */}
        <Card className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/20 rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className={`w-4 h-4 logo-hover ${!logoAnimationComplete ? 'logo-reveal-enhanced logo-reveal-delay-1' : 'logo-pulse'}`}
              />
              KILT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-3">
            <div className="space-y-2">
              <Input
                type="number"
                value={kiltAmount}
                onChange={(e) => handleKiltAmountChange(e.target.value)}
                placeholder="Enter KILT amount"
                min="0"
                className="bg-white/5 border-white/10 text-white text-sm h-10 text-center font-bold rounded-lg"
              />
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-xs">
                  Balance: <span className="font-bold text-white">{kiltBalance ? formatTokenAmount(kiltBalance) : '0.0000'}</span> 
                  <span className="inline-flex items-center gap-1 ml-1">
                    <img 
                      src={kiltLogo} 
                      alt="KILT" 
                      className={`w-3 h-3 logo-hover ${!logoAnimationComplete ? 'logo-reveal-enhanced logo-reveal-delay-2' : 'logo-pulse'}`}
                    />
                    KILT
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePercentageSelect(100)}
                  className="text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 px-2 py-1 font-semibold text-xs h-6"
                >
                  MAX
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sleek ETH Input */}
        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20 rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <EthereumLogo className="w-4 h-4" />
              ETH
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-3">
              <Input
                type="number"
                value={wethAmount}
                onChange={(e) => handleWethAmountChange(e.target.value)}
                placeholder="Enter ETH amount"
                min="0"
                className="bg-white/5 border-white/10 text-white text-lg h-12 text-center font-bold rounded-lg"
              />
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">
                  Balance: <span className="font-bold text-white">{wethBalance ? formatTokenAmount(wethBalance) : '0.0000'}</span> 
                  <span className="inline-flex items-center gap-1 ml-1">
                    <EthereumLogo className="w-4 h-4" />
                    WETH
                  </span>
                </span>
                <span className="text-blue-400 font-semibold text-xs px-2 py-1 bg-blue-500/10 rounded">
                  Auto-calculated
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Side-by-Side Layout for Price Range Strategy and Transaction Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Ultra Compact Price Range Strategy */}
        <Card className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/20 rounded-lg">
          <CardHeader className="pb-1">
            <CardTitle className="text-white text-sm flex items-center gap-1">
              <Zap className="h-3 w-3 text-pink-400" />
              Price Range Strategy
              {getSelectedStrategy().recommended && (
                <div className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full font-medium border border-emerald-500/30 pt-[0px] pb-[0px] pl-[11px] pr-[11px] ml-[6px] mr-[6px] mt-[0px] mb-[0px]">Recommended</div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
            {priceStrategies.map((strategy) => (
              <div key={strategy.id} className="relative">
                <Button
                  variant={selectedStrategy === strategy.id ? "default" : "outline"}
                  onClick={() => setSelectedStrategy(strategy.id)}
                  className={`h-16 p-1.5 flex-col items-start w-full relative transition-all duration-300 rounded-lg overflow-hidden ${
                    selectedStrategy === strategy.id 
                      ? 'bg-pink-500 hover:bg-pink-600 shadow-lg border-pink-500' 
                      : 'hover:bg-pink-500/10 hover:border-pink-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-0.5">
                    <span className="font-bold text-xs truncate">{strategy.label}</span>
                    {strategy.recommended && (
                      <div className="ml-1 px-1 py-0.5 bg-emerald-400 text-white text-xs rounded-full font-bold flex-shrink-0">
                        ✓
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-left opacity-80 truncate w-full">
                    {strategy.id === 'balanced' ? '50% to 150%' :
                     strategy.id === 'wide' ? '0% to 200%' :
                     strategy.id === 'narrow' ? '75% to 125%' :
                     'Full range (0 ...)'}
                  </p>
                </Button>
              </div>
            ))}
          </div>
          
          {/* Ultra Compact Selected Range Display */}
          <div className="p-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-lg border border-pink-500/20">
            <div className="flex items-center gap-1 mb-2">
              <Info className="h-3 w-3 text-pink-400" />
              <span className="text-white font-bold text-xs">Selected Range</span>
            </div>
            
            <div className="space-y-1">
              <div>
                <p className="text-white/80 text-xs mb-0.5">{getSelectedStrategy().description}</p>
                <p className="text-white/60 text-xs">{getSelectedStrategy().risk}</p>
              </div>
              

              
              {/* Ultra Compact Range Preview */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">Range Preview</span>
                  <span className="text-white/60">${(kiltData?.price || 0.0160).toFixed(4)}</span>
                </div>
                
                <div className="h-8 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10 rounded border border-white/10 p-1">
                  <div className="relative h-full w-full">
                    <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="xMidYMid meet">
                      {/* Background reference curve */}
                      <path
                        d="M 20 30 Q 100 10 180 30"
                        stroke="rgba(255, 255, 255, 0.15)"
                        strokeWidth="1"
                        fill="none"
                        strokeDasharray="2,2"
                      />
                      
                      {/* Selected range curve */}
                      <path
                        d={(() => {
                          const strategy = getSelectedStrategy();
                          if (strategy.id === 'full') {
                            return "M 20 30 Q 100 10 180 30";
                          } else if (strategy.id === 'wide') {
                            return "M 40 28 Q 100 12 160 28";
                          } else if (strategy.id === 'narrow') {
                            return "M 80 25 Q 100 18 120 25";
                          } else {
                            return "M 60 26 Q 100 15 140 26";
                          }
                        })()}
                        stroke="#10b981"
                        strokeWidth="2"
                        fill="none"
                        className="drop-shadow-lg"
                      />
                      
                      {/* Range markers */}
                      {(() => {
                        const strategy = getSelectedStrategy();
                        let minX = 20, maxX = 180, minY = 30, maxY = 30;
                        if (strategy.id === 'wide') { minX = 40; maxX = 160; minY = 28; maxY = 28; }
                        else if (strategy.id === 'narrow') { minX = 80; maxX = 120; minY = 25; maxY = 25; }
                        else if (strategy.id === 'balanced') { minX = 60; maxX = 140; minY = 26; maxY = 26; }
                        
                        return (
                          <>
                            <circle cx={minX} cy={minY} r="3" fill="#10b981" stroke="white" strokeWidth="1" />
                            <circle cx={maxX} cy={maxY} r="3" fill="#10b981" stroke="white" strokeWidth="1" />
                          </>
                        );
                      })()}
                      
                      {/* Current price indicator */}
                      <line x1="100" y1="5" x2="100" y2="35" stroke="white" strokeWidth="2" />
                      <circle cx="100" cy="20" r="2" fill="white" stroke="#10b981" strokeWidth="1" />
                    </svg>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <span className="text-white/60 text-xs block mb-1">Min Price</span>
                    <span className="text-white font-bold text-sm">
                      ${(() => {
                        const strategy = getSelectedStrategy();
                        const currentPrice = kiltData?.price || 0.0160;
                        if (strategy.id === 'full') return '0.0001';
                        if (strategy.id === 'wide') return (currentPrice * 0.5).toFixed(4);
                        if (strategy.id === 'narrow') return (currentPrice * 0.75).toFixed(4);
                        return (currentPrice * 0.6).toFixed(4);
                      })()}
                    </span>
                  </div>
                  <div className="text-center p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <span className="text-emerald-400 text-xs block mb-1">Current</span>
                    <span className="text-emerald-100 font-bold text-sm">${(kiltData?.price || 0.0160).toFixed(4)}</span>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <span className="text-white/60 text-xs block mb-1">Max Price</span>
                    <span className="text-white font-bold text-sm">
                      ${(() => {
                        const strategy = getSelectedStrategy();
                        const currentPrice = kiltData?.price || 0.0160;
                        if (strategy.id === 'full') return '∞';
                        if (strategy.id === 'wide') return (currentPrice * 2.0).toFixed(4);
                        if (strategy.id === 'narrow') return (currentPrice * 1.25).toFixed(4);
                        return (currentPrice * 1.5).toFixed(4);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </CardContent>
        </Card>

        {/* Ultra Compact Transaction Cost Estimation */}
        <div className="space-y-3">
          <GasEstimationCard />
        </div>
      </div>
      {/* Compact Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={handleApproveTokens}
          disabled={isApproving || !poolExists}
          className="h-12 bg-blue-600 hover:bg-blue-700 text-sm font-semibold rounded-lg transition-all duration-300"
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
          className="h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-sm font-semibold rounded-lg transition-all duration-300"
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

    </div>
  );
}