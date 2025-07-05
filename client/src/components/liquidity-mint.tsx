import { useState } from 'react';
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
  Zap
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
  const [priceRange, setPriceRange] = useState([75, 125]); // Default to ±25% range
  const [selectedPreset, setSelectedPreset] = useState(25);
  const [positionSizePercent, setPositionSizePercent] = useState([25]);

  // Price range presets
  const pricePresets = [
    { value: 25, label: 'Narrow (±25%)', range: [75, 125] },
    { value: 50, label: 'Balanced (±50%)', range: [50, 150] },
    { value: 100, label: 'Wide (±100%)', range: [0, 200] },
    { value: -1, label: 'Full Range', range: [-887220, 887220] }
  ];

  const handlePresetSelect = (preset: typeof pricePresets[0]) => {
    setSelectedPreset(preset.value);
    setPriceRange(preset.range);
  };

  const handleKiltAmountChange = (value: string) => {
    setKiltAmount(value);
    // Auto-calculate WETH amount based on current price
    if (value && kiltData?.price) {
      const kiltValue = parseFloat(value);
      const ethPrice = 3000; // Approximate ETH price
      const wethNeeded = (kiltValue * kiltData.price) / ethPrice;
      setWethAmount(wethNeeded.toFixed(6));
    }
  };

  const handlePercentageSelect = (percentage: number) => {
    if (kiltBalance) {
      const amount = (Number(formatTokenAmount(kiltBalance)) * percentage / 100).toFixed(4);
      handleKiltAmountChange(amount);
    }
  };

  // Handle slider change for position size
  const handleSliderChange = (value: number[]) => {
    setPositionSizePercent(value);
    const percent = value[0];
    if (kiltBalance) {
      const amount = (Number(formatTokenAmount(kiltBalance)) * percent / 100).toFixed(4);
      handleKiltAmountChange(amount);
    }
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

      // Convert price range to ticks (simplified - in production use proper tick math)
      const tickLower = priceRange[0] === -887220 ? -887220 : Math.floor(priceRange[0] * 100);
      const tickUpper = priceRange[1] === 887220 ? 887220 : Math.floor(priceRange[1] * 100);

      await mintPosition({
        token0: TOKENS.KILT < TOKENS.WETH ? TOKENS.KILT as `0x${string}` : TOKENS.WETH as `0x${string}`,
        token1: TOKENS.KILT < TOKENS.WETH ? TOKENS.WETH as `0x${string}` : TOKENS.KILT as `0x${string}`,
        fee: 3000, // 0.3% fee tier
        tickLower,
        tickUpper,
        amount0Desired: TOKENS.KILT < TOKENS.WETH ? kiltAmountParsed : wethAmountParsed,
        amount1Desired: TOKENS.KILT < TOKENS.WETH ? wethAmountParsed : kiltAmountParsed,
        amount0Min: BigInt(0), // Simplified - should calculate proper slippage
        amount1Min: BigInt(0),
        recipient: address as `0x${string}`,
        deadline,
      });

      toast({
        title: "Position Created",
        description: "Your Uniswap V3 LP position has been successfully created",
      });

      // Reset form
      setKiltAmount('');
      setWethAmount('');
      setPositionSizePercent([25]);
    } catch (error: any) {
      toast({
        title: "Position Creation Failed",
        description: error.message || "Failed to create LP position",
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
            Create a new Uniswap V3 liquidity position with concentrated liquidity
          </p>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
          {poolExists ? 'Pool Active' : 'Pool Not Found'}
        </Badge>
      </div>

      {/* Pool Status */}
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center -space-x-2">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center border-2 border-gray-800">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-gray-800">
                  <span className="text-white font-bold text-sm">Ξ</span>
                </div>
              </div>
              <div>
                <div className="text-white font-medium">KILT/ETH Pool</div>
                <div className="text-white/60 text-sm">0.3% Fee Tier • Uniswap V3</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-medium">${kiltData?.price?.toFixed(6) || '0.000000'}</div>
              <div className="text-white/60 text-sm">Current Price</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Size Slider */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-white font-heading flex items-center gap-2">
            <Target className="h-5 w-5" />
            Position Size
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-white/70 text-sm">Amount to Provide</Label>
            <span className="text-emerald-400 font-medium">{positionSizePercent[0]}% of balance</span>
          </div>
          
          <Slider
            value={positionSizePercent}
            onValueChange={handleSliderChange}
            max={100}
            min={0}
            step={1}
            className="w-full"
          />
          
          {/* Quick percentage buttons */}
          <div className="flex gap-2">
            {[25, 50, 75, 100].map((percent) => (
              <Button
                key={percent}
                variant="outline"
                size="sm"
                onClick={() => handleSliderChange([percent])}
                className={`border-white/20 text-white/70 hover:bg-white/10 ${
                  positionSizePercent[0] === percent ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : ''
                }`}
              >
                {percent}%
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Token Amounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              onChange={(e) => setWethAmount(e.target.value)}
              placeholder="0.0"
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

      {/* Price Range */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-white font-heading flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Price Range Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {pricePresets.map((preset) => (
              <Button
                key={preset.value}
                variant="outline"
                onClick={() => handlePresetSelect(preset)}
                className={`border-white/20 text-white/70 hover:bg-white/10 text-xs ${
                  selectedPreset === preset.value ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : ''
                }`}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-400" />
              <span className="text-white/70 text-sm">Selected Range</span>
            </div>
            <div className="text-white font-medium">
              {selectedPreset === -1 ? 'Full Range (0 to ∞)' : 
               `${priceRange[0]}% to ${priceRange[1]}% of current price`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleApproveTokens}
          disabled={isApproving || !kiltAmount || !wethAmount}
          className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-heading"
        >
          {isApproving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Approving Tokens...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              1. Approve Tokens
            </>
          )}
        </Button>

        <Button
          onClick={handleMintPosition}
          disabled={isMinting || !kiltAmount || !wethAmount}
          className="w-full h-12 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-heading"
        >
          {isMinting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Position...
            </>
          ) : (
            <>
              <Coins className="h-4 w-4 mr-2" />
              2. Create LP Position
            </>
          )}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="cluely-card rounded-2xl border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-white/70 text-sm">
                This will create a real Uniswap V3 LP NFT position on Base network. 
                You'll earn trading fees and KILT rewards based on your liquidity and time staked.
              </p>
              <ul className="text-white/60 text-xs space-y-1">
                <li>• Fee earnings accrue automatically to your position</li>
                <li>• KILT rewards calculated based on position size and duration</li>
                <li>• You can manage your position in the Positions tab</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}