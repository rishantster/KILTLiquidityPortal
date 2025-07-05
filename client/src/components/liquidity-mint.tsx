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
  Target
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
  const [selectedPreset, setSelectedPreset] = useState(50);

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
    // Auto-calculate WETH amount based on current price (simplified)
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

  const handleApproveTokens = async () => {
    if (!address) return;
    
    try {
      const maxUint256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');
      
      // Approve KILT
      await approveToken({ tokenAddress: TOKENS.KILT, amount: maxUint256 });
      
      // Approve WETH
      await approveToken({ tokenAddress: TOKENS.WETH, amount: maxUint256 });
      
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
        token0: TOKENS.KILT < TOKENS.WETH ? TOKENS.KILT : TOKENS.WETH,
        token1: TOKENS.KILT < TOKENS.WETH ? TOKENS.WETH : TOKENS.KILT,
        fee: 3000, // 0.3% fee tier
        tickLower,
        tickUpper,
        amount0Desired: TOKENS.KILT < TOKENS.WETH ? kiltAmountParsed : wethAmountParsed,
        amount1Desired: TOKENS.KILT < TOKENS.WETH ? wethAmountParsed : kiltAmountParsed,
        amount0Min: BigInt(0), // Simplified - should calculate proper slippage
        amount1Min: BigInt(0),
        recipient: address,
        deadline
      });

      // Reset form
      setKiltAmount('');
      setWethAmount('');
      
      toast({
        title: "Position Created",
        description: "Your liquidity position has been successfully minted!",
      });
    } catch (error: any) {
      toast({
        title: "Mint Failed",
        description: error.message || "Failed to create position",
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-3">
            <AlertCircle className="h-6 w-6 text-amber-400" />
            <span className="text-white/60">Connect your wallet to mint LP positions</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cluely-card rounded-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-white font-heading">
          <Plus className="h-5 w-5 text-emerald-400" />
          <span>Mint Liquidity Position</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pool Status */}
        <div className="cluely-card bg-white/3 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${poolExists ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
              <span className="text-white font-medium">KILT/ETH Pool</span>
            </div>
            <Badge variant={poolExists ? "default" : "secondary"} className="text-xs">
              {poolExists ? "Available" : "Not Deployed"}
            </Badge>
          </div>
          {!poolExists && (
            <div className="mt-2 text-amber-200/80 text-sm">
              Pool deployment required before minting positions
            </div>
          )}
        </div>

        {/* Token Amounts */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* KILT Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white font-heading text-sm">KILT Amount</Label>
                <div className="text-white/60 text-xs">
                  Balance: {formatTokenAmount(kiltBalance)}
                </div>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={kiltAmount}
                  onChange={(e) => handleKiltAmountChange(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-16"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">K</span>
                  </div>
                  <span className="text-white/60 text-sm">KILT</span>
                </div>
              </div>
              
              {/* Percentage Buttons */}
              <div className="flex space-x-2">
                {[25, 50, 75, 100].map((percentage) => (
                  <Button
                    key={percentage}
                    onClick={() => handlePercentageSelect(percentage)}
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                  >
                    {percentage}%
                  </Button>
                ))}
              </div>
            </div>

            {/* WETH Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white font-heading text-sm">WETH Amount</Label>
                <div className="text-white/60 text-xs">
                  Balance: {formatTokenAmount(wethBalance)}
                </div>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={wethAmount}
                  onChange={(e) => setWethAmount(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-16"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">Ξ</span>
                  </div>
                  <span className="text-white/60 text-sm">WETH</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Price Range Selection */}
        <div className="space-y-4">
          <Label className="text-white font-heading text-sm">Price Range</Label>
          
          {/* Presets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {pricePresets.map((preset) => (
              <Button
                key={preset.value}
                onClick={() => handlePresetSelect(preset)}
                size="sm"
                variant={selectedPreset === preset.value ? "default" : "outline"}
                className={`h-10 text-xs ${
                  selectedPreset === preset.value
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'border-white/10 text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Target className="h-3 w-3 mr-1" />
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Range Info */}
          <div className="cluely-card bg-white/3 p-3 rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <Info className="h-4 w-4 text-blue-400" />
              <span className="text-white/80">
                {selectedPreset === -1 
                  ? 'Full range provides maximum coverage but lower capital efficiency'
                  : `Price range: ${priceRange[0]}% to ${priceRange[1]}% of current price`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Approve Tokens */}
          <Button
            onClick={handleApproveTokens}
            disabled={isApproving || !poolExists}
            className="w-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/20"
          >
            {isApproving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Approve Tokens
          </Button>

          {/* Mint Position */}
          <Button
            onClick={handleMintPosition}
            disabled={isMinting || !kiltAmount || !wethAmount || !poolExists}
            className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/20 h-12"
          >
            {isMinting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Coins className="h-4 w-4 mr-2" />
            )}
            Mint LP Position
          </Button>
        </div>

        {/* Estimated Output */}
        {kiltAmount && wethAmount && (
          <div className="cluely-card bg-emerald-500/10 border-emerald-500/20 p-4 rounded-xl">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-emerald-200">
                <span>Position Value:</span>
                <span>~${((parseFloat(kiltAmount) * (kiltData?.price || 0.0289)) + (parseFloat(wethAmount) * 3000)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-200">
                <span>Fee Tier:</span>
                <span>0.3%</span>
              </div>
              <div className="flex justify-between text-emerald-200">
                <span>Range:</span>
                <span>{selectedPreset === -1 ? 'Full Range' : `±${Math.abs(priceRange[1] - 100)}%`}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}