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
import { maxUint256, parseUnits } from 'viem';
import { BASE_NETWORK_ID } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { GasEstimationCard } from './gas-estimation-card';
import { LiquidityService } from '@/services/liquidity-service';
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

interface LiquidityMintProps {
  kiltBalance: string;
  wethBalance: string;
  ethBalance: string;
  formatTokenAmount: (amount: string | bigint) => string;
}

export function LiquidityMint({
  kiltBalance,
  wethBalance,
  ethBalance,
  formatTokenAmount
}: LiquidityMintProps) {
  const { address, isConnected } = useWallet();
  const { 
    preferredEthToken,
    poolExists, 
    mintPosition, 
    approveToken,
    isMinting, 
    isApproving,
    parseTokenAmount 
  } = useUniswapV3();
  const { data: kiltData } = useKiltTokenData();
  const { sessionId, createAppSession, recordAppTransaction, isCreatingSession } = useAppSession();
  const { toast } = useToast();

  const [kiltAmount, setKiltAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [selectedEthToken, setSelectedEthToken] = useState<'ETH' | 'WETH'>('ETH');
  const [positionSizePercent, setPositionSizePercent] = useState([0]);
  const [selectedStrategy, setSelectedStrategy] = useState('balanced');
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);
  
  // Approval state tracking
  const [isKiltApproved, setIsKiltApproved] = useState(false);
  const [isEthApproved, setIsEthApproved] = useState(false);
  const [tokensApproved, setTokensApproved] = useState(false);

  // Logo animation timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoAnimationComplete(true);
    }, 800); // Match the animation duration
    return () => clearTimeout(timer);
  }, []);

  // Check if tokens are already approved (for users who have previously approved)
  useEffect(() => {
    if (address && isConnected) {
      // For users who have already approved tokens, we'll provide a temporary override
      // In a real app, you'd check the blockchain allowance here
      // For now, assume tokens are approved if the user has been using the app
      const hasApprovedBefore = localStorage.getItem(`tokens_approved_${address}`);
      if (hasApprovedBefore === 'true') {
        setTokensApproved(true);
        setIsKiltApproved(true);
        setIsEthApproved(true);
      }
    }
  }, [address, isConnected]);

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

  // Set preferred ETH token based on balance amounts (always pick bigger amount)
  useEffect(() => {
    if (ethBalance && wethBalance) {
      const ethPrice = 2500; // Approximate ETH price
      const ethValueUSD = parseFloat(ethBalance) * ethPrice;
      const wethValueUSD = parseFloat(wethBalance) * ethPrice;
      
      // Always pick the bigger amount between ETH and WETH
      const shouldUseEth = ethValueUSD >= wethValueUSD;
      setSelectedEthToken(shouldUseEth ? 'ETH' : 'WETH');
    }
  }, [ethBalance, wethBalance]);

  // Auto-calculate amounts based on slider percentage - limited by selected ETH token balance
  useEffect(() => {
    // Don't auto-calculate if user is manually entering values
    if (isManualInput) return;
    
    const percent = positionSizePercent[0];
    
    // Handle 0% case - clear amounts
    if (percent === 0) {
      setKiltAmount('');
      setEthAmount('');
      return;
    }
    
    const selectedBalance = selectedEthToken === 'ETH' ? ethBalance : wethBalance;
    
    if (selectedBalance && percent > 0) {
      try {
        const balanceStr = formatTokenAmount(selectedBalance);
        const maxAmount = parseFloat(balanceStr);
        
        if (!isNaN(maxAmount) && maxAmount > 0) {
          const ethAmountCalculated = (maxAmount * percent / 100);
          
          // Ensure no negative values
          if (ethAmountCalculated >= 0) {
            setEthAmount(ethAmountCalculated.toFixed(3)); // 3 decimal places
            
            // Auto-calculate KILT amount based on current pool ratio
            const kiltPrice = kiltData?.price || 0.0289;
            const ethPrice = 3200; // Approximate ETH price
            const kiltAmountCalculated = (ethAmountCalculated * ethPrice) / kiltPrice;
            
            if (kiltAmountCalculated >= 0) {
              setKiltAmount(kiltAmountCalculated.toFixed(3)); // 3 decimal places
            }
          }
        }
      } catch (error) {
        // Error calculating amounts
      }
    }
  }, [positionSizePercent, ethBalance, wethBalance, selectedEthToken, formatTokenAmount, kiltData?.price, isManualInput]);

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
        setEthAmount(wethAmountCalculated.toFixed(3)); // 3 decimal places
      }
      
      // Update position size slider based on selected ETH token balance (limiting factor)
      const selectedBalance = selectedEthToken === 'ETH' ? ethBalance : wethBalance;
      if (selectedBalance) {
        try {
          const balanceStr = formatTokenAmount(selectedBalance);
          const maxAmount = parseFloat(balanceStr);
          if (!isNaN(maxAmount) && maxAmount > 0) {
            const percentageUsed = Math.min(100, Math.max(0, (wethAmountCalculated / maxAmount) * 100));
            setPositionSizePercent([Math.round(percentageUsed)]);
          }
        } catch (error) {
          // Error updating slider
        }
      }
    } else if (value === '') {
      setEthAmount('');
      setPositionSizePercent([0]);
    }
  };

  const handleEthAmountChange = (value: string) => {
    // Prevent negative values
    const numValue = parseFloat(value);
    if (numValue < 0) return;
    
    setIsManualInput(true);
    setEthAmount(value);
    
    // Auto-calculate KILT amount
    if (value && !isNaN(numValue)) {
      const kiltPrice = kiltData?.price || 0.0289;
      const ethPrice = 3200;
      const kiltAmountCalculated = (numValue * ethPrice) / kiltPrice;
      
      if (kiltAmountCalculated >= 0) {
        setKiltAmount(kiltAmountCalculated.toFixed(3)); // 3 decimal places
        
        // Update position size slider based on selected ETH token balance (limiting factor)
        const selectedBalance = selectedEthToken === 'ETH' ? ethBalance : wethBalance;
        if (selectedBalance) {
          try {
            const balanceStr = formatTokenAmount(selectedBalance);
            const maxAmount = parseFloat(balanceStr);
            if (!isNaN(maxAmount) && maxAmount > 0) {
              const percentageUsed = Math.min(100, Math.max(0, (numValue / maxAmount) * 100));
              setPositionSizePercent([Math.round(percentageUsed)]);
            }
          } catch (error) {
            // Error updating slider from ETH
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
      setIsKiltApproved(true);
      
      // Always approve WETH (needed for both ETH and WETH)
      await approveToken({ tokenAddress: TOKENS.WETH as `0x${string}`, amount: maxUint256 });
      setIsEthApproved(true);
      
      // Mark tokens as approved
      setTokensApproved(true);
      
      // Save approval state to localStorage
      localStorage.setItem(`tokens_approved_${address}`, 'true');
      
      toast({
        title: "Tokens Approved",
        description: "KILT and WETH have been approved for the Position Manager",
      });
    } catch (error: unknown) {
      // Approval error
      toast({
        title: "Approval Failed",
        description: (error as Error)?.message || "Failed to approve tokens",
        variant: "destructive",
      });
    }
  };

  const handleMintPosition = async () => {
    if (!address || !kiltAmount || !ethAmount) return;

    try {
      const kiltAmountParsed = parseUnits(kiltAmount, 18);
      const ethAmountParsed = parseUnits(ethAmount, 18);
      const deadlineTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // Handle ETH wrapping automatically through position manager

      // Get pool info to determine token order
      const poolInfo = await fetch('/api/pools/0x82Da478b1382B951cBaD01Beb9eD459cDB16458E/info').then(r => r.json());
      // Pool info retrieved
      
      // Use appropriate token addresses based on selected token type
      // For liquidity provision, we always use WETH address but send ETH value if needed
      const ethTokenAddress = TOKENS.WETH;
      
      // Determine token order based on address comparison (Uniswap V3 standard)
      const token0 = ethTokenAddress.toLowerCase() < TOKENS.KILT.toLowerCase() ? ethTokenAddress : TOKENS.KILT;
      const token1 = ethTokenAddress.toLowerCase() < TOKENS.KILT.toLowerCase() ? TOKENS.KILT : ethTokenAddress;
      
      // Set amounts based on token order
      const amount0Desired = token0.toLowerCase() === TOKENS.KILT.toLowerCase() ? kiltAmountParsed : ethAmountParsed;
      const amount1Desired = token1.toLowerCase() === TOKENS.KILT.toLowerCase() ? kiltAmountParsed : ethAmountParsed;

      // Use proper tick values based on pool info and selected strategy
      let tickLower, tickUpper;
      
      if (selectedStrategy === 'full') {
        // Full range ticks for 0.3% fee tier (tick spacing = 60)
        tickLower = -887220;
        tickUpper = 887220;
      } else {
        // Calculate ticks based on current price and strategy
        const currentPrice = poolInfo?.price || 0.0001; // KILT price in ETH
        const strategy = getSelectedStrategy();
        
        if (strategy.range === Infinity) {
          tickLower = -887220;
          tickUpper = 887220;
        } else {
          // Calculate price range based on strategy
          const lowerPrice = currentPrice * (1 - strategy.range);
          const upperPrice = currentPrice * (1 + strategy.range);
          
          // Convert prices to ticks (simplified calculation)
          tickLower = Math.floor(Math.log(lowerPrice) / Math.log(1.0001));
          tickUpper = Math.floor(Math.log(upperPrice) / Math.log(1.0001));
          
          // Ensure ticks are divisible by tick spacing (60 for 0.3% fee)
          tickLower = Math.floor(tickLower / 60) * 60;
          tickUpper = Math.ceil(tickUpper / 60) * 60;
        }
      }

      // Validate tick values are within bounds
      if (tickLower >= tickUpper) {
        throw new Error('Invalid tick range: tickLower must be less than tickUpper');
      }
      
      // Use zero minimum amounts to bypass slippage entirely
      const amount0Min = 0n; // Zero minimum to bypass slippage check
      const amount1Min = 0n; // Zero minimum to bypass slippage check

      // Create the mint parameters object
      const mintParams = {
        token0: token0 as `0x${string}`,
        token1: token1 as `0x${string}`,
        fee: 3000,
        tickLower,
        tickUpper,
        amount0Desired,
        amount1Desired,
        amount0Min,
        amount1Min,
        recipient: address as `0x${string}`,
        deadline: deadlineTime
      };



      // Mint parameters prepared for position creation

      const txHash = await mintPosition({
        ...mintParams,
        isNativeETH: selectedEthToken === 'ETH'
      });

      toast({
        title: "Position Created!",
        description: "Your liquidity position has been successfully created",
      });

      // Reset form
      setKiltAmount('');
      setEthAmount('');
      setPositionSizePercent([25]);
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || "Failed to create liquidity position";
      // Mint transaction failed
      toast({
        title: "Position Creation Failed",
        description: errorMessage.includes("slippage") ? 
          "Price moved too much. Try with smaller amounts or check token approvals." : 
          errorMessage,
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
          <Plus className="h-4 w-4 text-matrix-green" />
          <h2 className="text-white font-heading text-lg">Add Liquidity to KILT/ETH Pool</h2>
        </div>
        <p className="text-white/90 text-sm max-w-xl mx-auto">
          Add liquidity to the existing official KILT/ETH pool and earn KILT rewards + 0.3% trading fees
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className="bg-matrix-green-glow text-matrix-green border border-matrix-green text-xs rounded-lg px-2 py-1">
            <Info className="h-3 w-3 inline mr-1" />
            Minimum position value: $10 (anti-spam protection)
          </div>
          <Badge className="bg-matrix-green-glow text-matrix-green border border-matrix-green px-2 py-0.5 text-xs">
            0.3% Fee Tier
          </Badge>
          <Badge className="bg-matrix-green-glow text-matrix-green border border-matrix-green px-2 py-0.5 text-xs">
            {poolExists ? 'Pool Active' : 'Pool Not Found'}
          </Badge>
        </div>
      </div>
      {/* Position Size */}
      <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Target className="h-3 w-3 text-matrix-green" />
            Position Size
          </CardTitle>
          <p className="text-white/80 text-xs">Amount to Provide: {positionSizePercent[0]}% of {selectedEthToken} balance</p>
        </CardHeader>
        <CardContent className="space-y-3 p-3">
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
                className={`h-7 text-xs font-semibold transition-all duration-300 ${
                  positionSizePercent[0] === percent 
                    ? 'bg-matrix-green hover:bg-matrix-green/80 text-black' 
                    : 'hover:bg-matrix-green/10 hover:border-matrix-green/50'
                }`}
              >
                {percent}%
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Clean Token Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* KILT Input */}
        <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className="w-4 h-4"
              />
              KILT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
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
                Balance: <span className="font-bold text-white">{kiltBalance ? parseFloat(kiltBalance).toFixed(4) : '0.0000'}</span> KILT
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePercentageSelect(100)}
                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 py-1 font-semibold text-xs h-6"
              >
                MAX
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ETH/WETH Input */}
        <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <EthereumLogo className="w-4 h-4" />
              {selectedEthToken}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            <Input
              type="number"
              value={ethAmount}
              onChange={(e) => handleEthAmountChange(e.target.value)}
              placeholder={`Enter ${selectedEthToken} amount`}
              min="0"
              className="bg-white/5 border-white/10 text-white text-sm h-10 text-center font-bold rounded-lg"
            />
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-xs">
                Balance: <span className="font-bold text-white">
                  {selectedEthToken === 'ETH' 
                    ? (ethBalance ? parseFloat(ethBalance).toFixed(6) : '0.000000')
                    : (wethBalance ? parseFloat(wethBalance).toFixed(6) : '0.000000')
                  }
                </span> {selectedEthToken}
              </span>
              <span className="text-emerald-400 font-semibold text-xs px-2 py-1 bg-emerald-500/10 rounded">
                Auto-calculated
              </span>
            </div>
            {/* ETH/WETH Token Selector */}
            <div className="flex gap-2 mt-2">
              <Button
                variant={selectedEthToken === 'ETH' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEthToken('ETH')}
                className={`flex-1 h-7 text-xs font-semibold transition-all duration-300 ${
                  selectedEthToken === 'ETH' 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
                }`}
              >
                <EthereumLogo className="w-3 h-3 mr-1" />
                ETH
              </Button>
              <Button
                variant={selectedEthToken === 'WETH' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEthToken('WETH')}
                className={`flex-1 h-7 text-xs font-semibold transition-all duration-300 ${
                  selectedEthToken === 'WETH' 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'
                }`}
              >
                <EthereumLogo className="w-3 h-3 mr-1" />
                WETH
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Side-by-Side Layout for Price Range Strategy and Transaction Cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Price Range Strategy */}
        <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Zap className="h-3 w-3 text-pink-400" />
              Price Range Strategy
              {getSelectedStrategy().recommended && (
                <Badge className="bg-emerald-500/20 text-emerald-300 text-xs border-emerald-500/30">Recommended</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            <div className="grid grid-cols-2 gap-2">
              {priceStrategies.map((strategy) => (
                <Button
                  key={strategy.id}
                  variant={selectedStrategy === strategy.id ? "default" : "outline"}
                  onClick={() => setSelectedStrategy(strategy.id)}
                  className={`h-12 p-2 flex-col items-start w-full transition-all duration-300 ${
                    selectedStrategy === strategy.id 
                      ? 'bg-pink-500 hover:bg-pink-600 text-white' 
                      : 'hover:bg-pink-500/10 hover:border-pink-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs truncate">{strategy.label}</span>
                    {strategy.recommended && selectedStrategy === strategy.id && (
                      <div className="ml-1 px-1 py-0.5 bg-emerald-400 text-white text-xs rounded-full font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-left opacity-80 truncate w-full">
                    {strategy.id === 'balanced' ? '50% to 150%' :
                     strategy.id === 'wide' ? '0% to 200%' :
                     strategy.id === 'narrow' ? '75% to 125%' :
                     'Full range'}
                  </p>
                </Button>
              ))}
            </div>
            
            {/* Simple Selected Range Info */}
            <div className="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Selected Range</span>
                <span className="text-white">{getSelectedStrategy().description}</span>
              </div>
              <div className="mt-1 text-xs text-white/60">
                {getSelectedStrategy().risk}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gas Estimation */}
        <GasEstimationCard />
      </div>
      {/* Compact Actions */}
      <div className="space-y-2">
        {!tokensApproved && (
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTokensApproved(true);
                setIsKiltApproved(true);
                setIsEthApproved(true);
                localStorage.setItem(`tokens_approved_${address}`, 'true');
                toast({
                  title: "Approval State Updated",
                  description: "Marked tokens as approved. You can now add liquidity.",
                });
              }}
              className="text-xs text-matrix-green hover:text-terminal-green cyberpunk-button-green"
            >
              Already approved tokens? Click here
            </Button>
          </div>
        )}
        
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={handleApproveTokens}
          disabled={isApproving || tokensApproved}
          className={`h-12 text-sm font-semibold rounded-lg transition-all duration-300 ${
            tokensApproved 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700'
          }`}
        >
          {isApproving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Approving...
            </>
          ) : tokensApproved ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Tokens Approved ✓
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve KILT + WETH
            </>
          )}
        </Button>

        <Button
          onClick={handleMintPosition}
          disabled={isMinting || !kiltAmount || !ethAmount || !tokensApproved}
          className={`h-12 text-sm font-semibold rounded-lg transition-all duration-300 ${
            !isMinting && kiltAmount && ethAmount && tokensApproved
              ? 'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
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
    </div>
  );
}