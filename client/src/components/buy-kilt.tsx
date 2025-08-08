import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  ArrowRight, 
  Loader2, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  Info,
  RefreshCw,
  ShoppingCart,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWagmiWallet } from '@/hooks/use-wagmi-wallet';
import { useQuery } from '@tanstack/react-query';
// Remove unused viem imports as we handle parsing in our API
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

interface BuyKiltProps {
  kiltBalance: string;
  ethBalance: string;
  wethBalance: string;
  formatTokenAmount: (amount: string, token: string) => string;
  onPurchaseComplete?: () => void;
}

export function BuyKilt({ 
  kiltBalance, 
  ethBalance, 
  wethBalance, 
  formatTokenAmount,
  onPurchaseComplete 
}: BuyKiltProps) {
  const [sliderValue, setSliderValue] = useState([0.01]);
  const [kiltAmount, setKiltAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const { toast } = useToast();
  const { isConnected, address } = useWagmiWallet();
  
  // Calculate ETH amount from slider value (0.001 to 1 ETH range)
  const ethAmount = useMemo(() => {
    const value = sliderValue[0];
    return value.toFixed(value < 0.01 ? 4 : value < 0.1 ? 3 : 2);
  }, [sliderValue]);
  
  // Calculate max ETH available for slider
  const maxEthAmount = useMemo(() => {
    const available = parseFloat(ethBalance?.replace(/[^\d.-]/g, '') || '0');
    return Math.min(available * 0.95, 1); // Use 95% of balance or max 1 ETH
  }, [ethBalance]);
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  });

  // Define quote type
  interface SwapQuote {
    kiltAmount: string;
    priceImpact: number;
    fee: string;
  }

  // Get swap quote when ETH amount changes
  const { data: quote, isLoading: isLoadingQuote, refetch: refetchQuote } = useQuery<SwapQuote>({
    queryKey: ['/api/swap/quote', ethAmount],
    enabled: !!ethAmount && parseFloat(ethAmount) > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update KILT amount when quote changes
  useEffect(() => {
    if (quote?.kiltAmount) {
      setKiltAmount(quote.kiltAmount);
    }
  }, [quote]);

  // Handle slider change
  const handleSliderChange = useCallback((values: number[]) => {
    setSliderValue(values);
  }, []);

  // Handle manual ETH input
  const handleEthInput = useCallback((value: string) => {
    const numValue = parseFloat(value) || 0.001;
    const clampedValue = Math.min(Math.max(numValue, 0.001), maxEthAmount);
    setSliderValue([clampedValue]);
  }, [maxEthAmount]);
  
  // Get price impact color and warning
  const getPriceImpactDisplay = useCallback((impact: number) => {
    if (impact < 1) {
      return { color: 'text-green-400', warning: false, label: 'Low' };
    } else if (impact < 3) {
      return { color: 'text-yellow-400', warning: false, label: 'Medium' };
    } else if (impact < 5) {
      return { color: 'text-orange-400', warning: true, label: 'High' };
    } else {
      return { color: 'text-red-400', warning: true, label: 'Very High' };
    }
  }, []);

  // Prepare and execute swap transaction
  const executeSwap = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to swap tokens",
        variant: "destructive",
      });
      return;
    }

    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid ETH amount to swap",
        variant: "destructive",
      });
      return;
    }

    setIsSwapping(true);
    
    try {
      // Get transaction data from our backend
      const response = await fetch('/api/swap/prepare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          ethAmount: ethAmount,
          slippageTolerance: 0.5, // 0.5% slippage
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to prepare swap');
      }

      const txData = await response.json();
      
      // Execute the transaction through the user's wallet
      writeContract({
        address: txData.to as `0x${string}`,
        abi: [{
          inputs: [],
          name: 'exactInputSingle',
          outputs: [],
          stateMutability: 'payable',
          type: 'function'
        }],
        functionName: 'exactInputSingle',
        value: BigInt(txData.value),
      });
      
    } catch (error) {
      console.error('Swap failed:', error);
      toast({
        title: "Swap Failed",
        description: error instanceof Error ? error.message : "Transaction failed. Please try again.",
        variant: "destructive",
      });
      setIsSwapping(false);
    }
  };

  // Handle successful transaction
  useEffect(() => {
    if (hash && !isConfirming && !writeError) {
      toast({
        title: "Swap Successful!",
        description: `Successfully swapped ${ethAmount} ETH for approximately ${kiltAmount} KILT`,
      });
      
      // Trigger balance refresh
      onPurchaseComplete?.();
      
      // Reset form
      setSliderValue([0.01]);
      setKiltAmount('');
      setIsSwapping(false);
    }
  }, [hash, isConfirming, writeError, ethAmount, kiltAmount, toast, onPurchaseComplete]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      toast({
        title: "Transaction Failed",
        description: writeError.message || "The swap transaction failed",
        variant: "destructive",
      });
      setIsSwapping(false);
    }
  }, [writeError, toast]);

  const isLoading = isPending || isConfirming || isSwapping;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingCart className="w-6 h-6 text-pink-400" />
        <h2 className="text-2xl font-bold text-white">Buy KILT</h2>
        <Badge variant="secondary" className="bg-pink-500/10 text-pink-400 border-pink-500/20">
          Direct Swap
        </Badge>
      </div>

      {/* Swap Interface */}
      <Card className="border border-white/10 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span>Swap ETH for KILT</span>
{quote && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => refetchQuote()}
                className="text-pink-400 hover:bg-pink-500/10"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Balances */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border border-white/5 bg-white/5">
              <CardContent className="p-4">
                <div className="text-sm text-white/60 mb-1">Your ETH</div>
                <div className="text-lg font-semibold text-white">{ethBalance}</div>
              </CardContent>
            </Card>
            <Card className="border border-white/5 bg-white/5">
              <CardContent className="p-4">
                <div className="text-sm text-white/60 mb-1">Your KILT</div>
                <div className="text-lg font-semibold text-white">{kiltBalance}</div>
              </CardContent>
            </Card>
          </div>

          {/* Swap Input */}
          <div className="space-y-6">
            {/* ETH Amount Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">You Pay (ETH)</label>
                <div className="text-right">
                  <Input
                    type="number"
                    value={ethAmount}
                    onChange={(e) => handleEthInput(e.target.value)}
                    className="w-24 h-8 text-right bg-white/5 border-white/10 text-white text-sm"
                    step="0.001"
                    min="0.001"
                    max={maxEthAmount}
                  />
                </div>
              </div>
              
              {/* Interactive Slider */}
              <div className="space-y-3">
                <Slider
                  value={sliderValue}
                  onValueChange={handleSliderChange}
                  max={maxEthAmount}
                  min={0.001}
                  step={0.001}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-white/60">
                  <span>0.001 ETH</span>
                  <div className="text-center">
                    <div className="text-pink-400 font-medium">{ethAmount} ETH</div>
                    <div className="text-white/40">
                      {maxEthAmount > 0 ? `${Math.round((parseFloat(ethAmount) / maxEthAmount) * 100)}%` : '0%'}
                    </div>
                  </div>
                  <span>{maxEthAmount.toFixed(3)} ETH (100%)</span>
                </div>
              </div>
              
              {/* Percentage-based Quick Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '25%', percentage: 0.25 },
                  { label: '50%', percentage: 0.5 },
                  { label: '75%', percentage: 0.75 },
                  { label: '100%', percentage: 1.0 }
                ].map(({ label, percentage }) => {
                  const amount = maxEthAmount * percentage;
                  return (
                    <Button
                      key={label}
                      variant="outline"
                      size="sm"
                      onClick={() => setSliderValue([Math.max(0.001, amount)])}
                      className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10 text-xs"
                      disabled={amount < 0.001}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center">
              <div className="p-2 rounded-full border border-white/10 bg-black/40">
                <ArrowRight className="w-4 h-4 text-pink-400" />
              </div>
            </div>

            {/* KILT Output */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">You Receive (KILT)</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0.0"
                  value={isLoadingQuote ? "Loading..." : kiltAmount}
                  disabled
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-16"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="text-sm font-medium text-white/80">KILT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Quote Details */}
          {quote && (
            <div className="space-y-4">
              {/* Price Impact Warning */}
              {quote.priceImpact > 3 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-400">High Price Impact Warning</p>
                    <p className="text-orange-300/80">
                      This large trade will move the market price by {quote.priceImpact.toFixed(2)}%. 
                      Consider splitting into smaller trades.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Enhanced Quote Card */}
              <Card className="border border-white/5 bg-white/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Exchange Rate</span>
                    <span className="text-white font-mono">
                      1 ETH = {(parseFloat(quote.kiltAmount) / parseFloat(ethAmount)).toLocaleString(undefined, {maximumFractionDigits: 0})} KILT
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Trading Fee</span>
                    <span className="text-white">{quote.fee}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Price Impact</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getPriceImpactDisplay(quote.priceImpact).color}`}>
                        {quote.priceImpact.toFixed(3)}%
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          getPriceImpactDisplay(quote.priceImpact).color.includes('green') 
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : getPriceImpactDisplay(quote.priceImpact).color.includes('yellow')
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : getPriceImpactDisplay(quote.priceImpact).color.includes('orange')
                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {getPriceImpactDisplay(quote.priceImpact).label}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Slippage Tolerance</span>
                    <span className="text-white">0.5%</span>
                  </div>
                  
                  {/* Market Movement Prediction */}
                  {quote.priceImpact > 1 && (
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/60">Predicted Price Movement</span>
                        <span className={`font-medium ${getPriceImpactDisplay(quote.priceImpact).color}`}>
                          +{quote.priceImpact.toFixed(3)}% increase
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <Separator className="bg-white/10" />

          {/* Swap Button */}
          <Button 
            onClick={executeSwap}
            disabled={!isConnected || !ethAmount || !kiltAmount || isLoading}
            className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isPending ? "Confirm in Wallet..." : isConfirming ? "Processing..." : "Swapping..."}
              </>
            ) : !isConnected ? (
              "Connect Wallet"
            ) : !ethAmount || !kiltAmount ? (
              "Enter Amount"
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Swap {ethAmount} ETH for {kiltAmount} KILT
              </>
            )}
          </Button>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">Direct Uniswap Integration</p>
              <p className="text-blue-300/80">
                This swap executes directly through Uniswap V3 contracts. No need to leave our app!
                Transaction costs are approximately $0.02 on Base network.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Info */}
      <Card className="border border-white/10 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Market Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-white/60 mb-1">Pool Liquidity</div>
              <div className="text-white font-semibold">$99,171</div>
            </div>
            <div>
              <div className="text-white/60 mb-1">24h Volume</div>
              <div className="text-white font-semibold">$12,485</div>
            </div>
            <div>
              <div className="text-white/60 mb-1">KILT Price</div>
              <div className="text-white font-semibold">$0.0168</div>
            </div>
            <div>
              <div className="text-white/60 mb-1">24h Change</div>
              <div className="text-green-400 font-semibold">+1.70%</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              onClick={() => window.open('https://dexscreener.com/base/0x82da478b1382b951cbad01beb9ed459cdb16458e', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on DexScreener
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}