import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowRight, 
  Loader2, 
  Zap, 
  TrendingUp, 
 
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
  const [ethAmount, setEthAmount] = useState('');
  const [kiltAmount, setKiltAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const { toast } = useToast();
  const { isConnected, address } = useWagmiWallet();
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

  // Handle preset ETH amounts
  const handlePresetAmount = useCallback((amount: string) => {
    setEthAmount(amount);
  }, []);

  // Handle ETH input change
  const handleEthAmountChange = useCallback((value: string) => {
    setEthAmount(value);
    if (!value || parseFloat(value) <= 0) {
      setKiltAmount('');
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
      setEthAmount('');
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
          <div className="space-y-4">
            {/* ETH Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">You Pay (ETH)</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.0"
                  value={ethAmount}
                  onChange={(e) => handleEthAmountChange(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-16"
                  step="0.001"
                  min="0"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="text-sm font-medium text-white/80">ETH</span>
                </div>
              </div>
              {/* Preset amounts */}
              <div className="flex gap-2">
                {['0.001', '0.01', '0.1', '0.5'].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetAmount(amount)}
                    className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                  >
                    {amount} ETH
                  </Button>
                ))}
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

          {/* Quote Details */}
          {quote && (
            <Card className="border border-white/5 bg-white/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Exchange Rate</span>
                  <span className="text-white">
                    1 ETH = {(parseFloat(quote.kiltAmount) / parseFloat(ethAmount)).toFixed(2)} KILT
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Fee</span>
                  <span className="text-white">{quote.fee}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Price Impact</span>
                  <span className="text-white">{quote.priceImpact.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Slippage Tolerance</span>
                  <span className="text-white">0.5%</span>
                </div>
              </CardContent>
            </Card>
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