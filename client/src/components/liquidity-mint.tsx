import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Clock,
  ExternalLink,
  ArrowUpDown
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
import { UniswapV3SDKService, KILT_TOKEN, WETH_TOKEN } from '@/lib/uniswap-v3-sdk';
import { transactionValidator, type LiquidityParams } from '@/services/transaction-validator';
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

  // Initialize Uniswap V3 SDK service
  const [uniswapSDK, setUniswapSDK] = useState<UniswapV3SDKService | null>(null);

  const [kiltAmount, setKiltAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [selectedEthToken, setSelectedEthToken] = useState<'ETH' | 'WETH'>('ETH');
  const [positionSizePercent, setPositionSizePercent] = useState([0]);
  const [selectedStrategy, setSelectedStrategy] = useState('full');
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);

  
  // Approval state tracking
  const [isKiltApproved, setIsKiltApproved] = useState(false);
  const [isEthApproved, setIsEthApproved] = useState(false);
  const [tokensApproved, setTokensApproved] = useState(false);
  
  // Transaction validation state
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Logo animation timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoAnimationComplete(true);
    }, 800); // Match the animation duration
    return () => clearTimeout(timer);
  }, []);

  // Initialize SDK when pool exists
  useEffect(() => {
    if (poolExists && !uniswapSDK) {
      // Use a temporary pool address for testing - in production this would come from the pool detection
      const poolAddress = '0x82Da478b1382B951cBaD01Beb9eD459cDB16458E';
      const sdkService = new UniswapV3SDKService(poolAddress);
      setUniswapSDK(sdkService);
    }
  }, [poolExists, uniswapSDK]);

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

  // Price range strategies - ordered by recommendation (Full Range first for safety)
  const priceStrategies = [
    { 
      id: 'full', 
      label: 'Full Range', 
      range: Infinity,
      description: 'Full price range (0 to ∞)',
      risk: 'Always in range, minimal impermanent loss',
      recommended: true
    },
    { 
      id: 'balanced', 
      label: 'Balanced (±50%)', 
      range: 0.50,
      description: '50% to 150% of current price',
      risk: 'Optimal balance of fees and stability'
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

  // Validate transaction before execution
  const validateTransaction = async (kiltAmt: string, ethAmt: string) => {
    if (!address || !kiltAmt || !ethAmt) return null;
    
    setIsValidating(true);
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const strategy = getSelectedStrategy();
      
      const validationParams: LiquidityParams = {
        token0: WETH_TOKEN.toLowerCase(),
        token1: KILT_TOKEN.toLowerCase(),
        amount0Desired: parseUnits(ethAmt, 18),
        amount1Desired: parseUnits(kiltAmt, 18),
        amount0Min: (parseUnits(ethAmt, 18) * 95n) / 100n, // 5% slippage
        amount1Min: (parseUnits(kiltAmt, 18) * 95n) / 100n, // 5% slippage
        tickLower: strategy.tickLower || -887220,
        tickUpper: strategy.tickUpper || 887220,
        fee: 3000,
        deadline: currentTime + 1200, // 20 minutes
        userAddress: address,
        isNativeETH: selectedEthToken === 'ETH'
      };
      
      const result = await transactionValidator.validateLiquidityTransaction(validationParams);
      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('Validation failed:', error);
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  // Auto-validate when amounts change
  useEffect(() => {
    if (kiltAmount && ethAmount && parseFloat(kiltAmount) > 0 && parseFloat(ethAmount) > 0) {
      validateTransaction(kiltAmount, ethAmount);
    } else {
      setValidationResult(null);
    }
  }, [kiltAmount, ethAmount, selectedStrategy, address]);

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
      // Enhanced validation before transaction
      if (parseFloat(kiltAmount) <= 0 || parseFloat(ethAmount) <= 0) {
        toast({
          title: "Invalid Amounts",
          description: "Please enter valid token amounts greater than zero.",
          variant: "destructive",
        });
        return;
      }

      const kiltAmountParsed = parseUnits(kiltAmount, 18);
      const ethAmountParsed = parseUnits(ethAmount, 18);
      
      // Debug: Log the parsed amounts
      console.log('Liquidity amounts:', {
        kiltAmount: kiltAmount,
        ethAmount: ethAmount,
        kiltAmountParsed: kiltAmountParsed.toString(),
        ethAmountParsed: ethAmountParsed.toString(),
        kiltAmountReadable: formatTokenAmount(kiltAmountParsed),
        ethAmountReadable: formatTokenAmount(ethAmountParsed)
      });
      
      const deadlineTime = Math.floor(Date.now() / 1000) + 1200; // 20 minutes from now for better execution

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
        // Get current pool price from the pool info
        // The pool price is token1/token0 ratio
        const currentPoolPrice = poolInfo?.currentPrice || poolInfo?.price || 0.00005; // WETH/KILT price
        
        // Debug: Log the current pool price
        console.log('Pool price calculation:', {
          poolInfo,
          currentPoolPrice,
          selectedStrategy
        });
        
        const strategy = getSelectedStrategy();
        
        if (strategy.range === Infinity) {
          tickLower = -887220;
          tickUpper = 887220;
        } else {
          // Calculate price range based on strategy
          const lowerPrice = currentPoolPrice * (1 - strategy.range);
          const upperPrice = currentPoolPrice * (1 + strategy.range);
          
          // Convert prices to ticks using proper Uniswap V3 formula
          // tick = log(price) / log(1.0001)
          const tickLowerRaw = Math.log(lowerPrice) / Math.log(1.0001);
          const tickUpperRaw = Math.log(upperPrice) / Math.log(1.0001);
          
          // Ensure ticks are divisible by tick spacing (60 for 0.3% fee)
          tickLower = Math.floor(tickLowerRaw / 60) * 60;
          tickUpper = Math.ceil(tickUpperRaw / 60) * 60;
          
          // Debug: Log the tick calculation
          console.log('Tick calculation:', {
            currentPoolPrice,
            lowerPrice,
            upperPrice,
            tickLowerRaw,
            tickUpperRaw,
            tickLower,
            tickUpper,
            strategy: strategy.label
          });
        }
      }

      // Validate tick values are within bounds
      if (tickLower >= tickUpper) {
        throw new Error('Invalid tick range: tickLower must be less than tickUpper');
      }
      
      // Use proper slippage protection (5% slippage tolerance)
      const amount0Min = (amount0Desired * 95n) / 100n; // 5% slippage protection
      const amount1Min = (amount1Desired * 95n) / 100n; // 5% slippage protection

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
      // Use Uniswap V3 native ETH-to-WETH conversion when ETH is selected

      const txHash = await mintPosition({
        ...mintParams,
        useNativeETH: selectedEthToken === 'ETH'
      });

      toast({
        title: "Position Created!",
        description: "Your liquidity position has been successfully created",
      });
      
      // Note: MetaMask may show token address instead of "KILT" name
      // This is normal - the transaction is correct even if the token name isn't recognized

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
      <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg cluely-card">
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
                variant="outline"
                size="sm"
                onClick={() => handlePercentageSelect(percent)}
                className={`h-7 text-xs font-semibold transition-all duration-300 border ${
                  positionSizePercent[0] === percent 
                    ? 'text-white font-bold border-2' 
                    : 'text-white/80 hover:bg-white/10 hover:text-white hover:border-white/50'
                }`}
                style={positionSizePercent[0] === percent ? {
                  backgroundColor: '#ff0066',
                  borderColor: '#ff0066',
                  color: 'white'
                } : {
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                }}
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
        <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg cluely-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-super-bright text-sm flex items-center gap-2">
              <img 
                src={kiltLogo} 
                alt="KILT" 
                className="w-4 h-4"
              />
              KILT
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {(() => {
              const kiltBalanceNum = kiltBalance ? parseFloat(formatTokenAmount(kiltBalance, 18)) : 0;
              const hasKiltBalance = kiltBalanceNum > 0;
              
              return (
                <>
                  <Input
                    type="number"
                    value={kiltAmount}
                    onChange={(e) => handleKiltAmountChange(e.target.value)}
                    placeholder={hasKiltBalance ? "Enter KILT amount" : "No KILT balance - Buy KILT first"}
                    min="0"
                    disabled={!hasKiltBalance}
                    className={`text-sm h-10 text-center font-bold rounded-lg transition-all duration-200 ${
                      hasKiltBalance 
                        ? 'bg-white/5 border-white/10 text-white' 
                        : 'bg-red-900/20 border-red-500/30 text-red-300 cursor-not-allowed'
                    }`}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-bright text-xs">
                      Balance: <span className={`font-bold ${hasKiltBalance ? 'text-super-bright' : 'text-red-400'}`}>
                        {kiltBalanceNum.toFixed(4)}
                      </span> KILT
                    </span>
                    <div className="flex items-center gap-2">
                      {hasKiltBalance && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePercentageSelect(100)}
                          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 px-2 py-1 font-semibold text-xs h-6"
                        >
                          MAX
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const swapUrl = `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8&chain=base`;
                          window.open(swapUrl, '_blank');
                        }}
                        className="bg-gradient-to-r from-[#ff0066] to-pink-600 hover:from-[#ff0066]/90 hover:to-pink-600/90 text-white border-0 px-3 py-1.5 font-bold text-xs h-7 transition-all duration-200 shadow-lg hover:shadow-pink-500/25 transform hover:scale-105 touch-manipulation"
                      >
                        <ArrowUpDown className="h-3 w-3 mr-1" />
                        {hasKiltBalance ? "More KILT" : "Buy KILT"}
                      </Button>
                    </div>
                  </div>
                  
                  {!hasKiltBalance && (
                    <div className="mt-2 p-2 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-400 text-xs">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="leading-tight">You need KILT tokens to provide liquidity</span>
                      </div>
                      <p className="text-amber-300/80 text-xs mt-1 leading-tight">
                        Tap "Buy KILT" to swap ETH for KILT on Uniswap
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* ETH/WETH Input */}
        <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg cluely-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-super-bright text-sm flex items-center gap-2">
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
              <span className="text-bright text-xs">
                Balance: <span className="font-bold text-super-bright">
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
        <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg cluely-card">
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
                  className={`h-16 p-3 flex flex-col items-start justify-center w-full transition-all duration-300 ${
                    selectedStrategy === strategy.id 
                      ? 'text-white' 
                      : 'hover:bg-pink-500/10 hover:border-pink-500/50'
                  }`}
                  style={selectedStrategy === strategy.id ? { backgroundColor: '#ff0066' } : {}}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm">{strategy.label}</span>
                    {strategy.recommended && selectedStrategy === strategy.id && (
                      <div className="ml-1 px-1 py-0.5 bg-emerald-400 text-white text-xs rounded-full font-bold">
                        ✓
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-left opacity-80 w-full">
                    {strategy.id === 'balanced' ? '50% to 150%' :
                     strategy.id === 'wide' ? '0% to 200%' :
                     strategy.id === 'narrow' ? '75% to 125%' :
                     'Full range'}
                  </p>
                </Button>
              ))}
            </div>
            
            {/* Dynamic Price Range Preview */}
            <div className="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Selected Range</span>
                <span className="text-white">{getSelectedStrategy().label}</span>
              </div>
              <div className="mt-1 text-xs text-white/60">
                {getSelectedStrategy().risk}
              </div>
              
              {/* Live Price Range Display */}
              <div className="mt-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-white/60 font-medium">Price Range</span>
                  <span className="text-white font-mono font-bold text-right">
                    {getSelectedStrategy().range === Infinity ? (
                      "Full range (0 to ∞)"
                    ) : kiltData?.price ? (
                      `$${(kiltData.price * (1 - getSelectedStrategy().range)).toFixed(4)} - $${(kiltData.price * (1 + getSelectedStrategy().range)).toFixed(4)}`
                    ) : (
                      "Loading..."
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 font-medium">Current KILT</span>
                  <span className="text-white font-mono font-bold">
                    ${kiltData?.price?.toFixed(4) || 'Loading...'}
                  </span>
                </div>
                
                {/* Visual Price Range Indicator */}
                {kiltData?.price && getSelectedStrategy().range !== Infinity && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-white/40 mb-1">
                      <span>Min</span>
                      <span>Current</span>
                      <span>Max</span>
                    </div>
                    <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff0066] to-[#ff0066] rounded-full"
                        style={{
                          left: '0%',
                          width: '100%',
                          opacity: 0.6
                        }}
                      />
                      <div 
                        className="absolute top-0 h-full w-1 bg-white rounded-full"
                        style={{
                          left: '50%',
                          transform: 'translateX(-50%)'
                        }}
                      />
                    </div>
                    <div className="flex justify-center mt-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                )}
                
                {/* Full Range Indicator */}
                {getSelectedStrategy().range === Infinity && (
                  <div className="mt-2">
                    <div className="flex items-center justify-center text-xs text-white/40 mb-1">
                      <span>Always in range</span>
                    </div>
                    <div className="relative h-2 bg-gradient-to-r from-[#ff0066] to-[#ff0066] rounded-full overflow-hidden opacity-60">
                      <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-[#ff0066] to-[#ff0066] rounded-full animate-pulse"></div>
                    </div>
                  </div>
                )}
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
          className={`h-12 text-sm font-semibold rounded-lg transition-all duration-300 neon-button ${
            tokensApproved 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-[#ff0066] to-[#ff0066] hover:from-[#ff0066] hover:to-[#ff0066]'
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
          disabled={isMinting || !kiltAmount || !ethAmount || !tokensApproved || (validationResult && !validationResult.isValid)}
          className={`h-12 text-sm font-semibold rounded-lg transition-all duration-300 neon-button ${
            !isMinting && kiltAmount && ethAmount && tokensApproved && (!validationResult || validationResult.isValid)
              ? 'bg-gradient-to-r from-[#ff0066] to-[#ff0066] hover:from-[#ff0066] hover:to-[#ff0066] text-white' 
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isMinting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding Liquidity...
            </>
          ) : validationResult && !validationResult.isValid ? (
            <>
              <AlertCircle className="h-4 w-4 mr-2" />
              Fix Issues Above
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Liquidity
            </>
          )}
        </Button>
      </div>
      
      {/* Transaction Validation Results */}
      {validationResult && (
        <div className={`p-3 rounded-lg border ${
          validationResult.isValid 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          {validationResult.errors.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-red-400 font-medium text-xs flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                Transaction Issues:
              </h4>
              {validationResult.errors.map((error: string, index: number) => (
                <p key={index} className="text-red-300 text-xs">• {error}</p>
              ))}
            </div>
          )}
          
          {validationResult.warnings.length > 0 && (
            <div className="space-y-1 mt-2">
              <h4 className="text-amber-400 font-medium text-xs flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                Warnings:
              </h4>
              {validationResult.warnings.map((warning: string, index: number) => (
                <p key={index} className="text-amber-300 text-xs">• {warning}</p>
              ))}
            </div>
          )}
          
          {validationResult.isValid && (
            <div className="flex items-center gap-2 text-green-400 text-xs">
              <CheckCircle2 className="h-3 w-3" />
              Transaction validated successfully - ready to execute
            </div>
          )}
        </div>
      )}

      {/* MetaMask Information */}
      <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
          <p className="text-xs text-blue-300">
            <strong>MetaMask Note:</strong> KILT may appear as "0x5D0DD...ad2d8" in transaction details - this is normal and the transaction is correct.
          </p>
        </div>
      </div>
      
      </div>
    </div>
  );
}