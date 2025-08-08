import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWagmiWallet } from '@/hooks/use-wagmi-wallet';
import { ArrowDownUp, ExternalLink, Zap, ShoppingCart, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { KiltLogo, EthLogo } from '@/components/ui/token-logo';
import { parseUnits, formatUnits } from 'viem';

// Token addresses on Base network
const WETH_TOKEN = '0x4200000000000000000000000000000000000006';
const KILT_TOKEN = '0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8';
const UNISWAP_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481'; // Uniswap V3 SwapRouter on Base

interface BuyKiltProps {
  kiltBalance?: string;
  ethBalance?: string;
  wethBalance?: string;
  formatTokenAmount?: (amount: string, symbol: string) => string;
  onPurchaseComplete?: () => void;
}

export function BuyKilt({ 
  kiltBalance,
  ethBalance,
  wethBalance,
  formatTokenAmount,
  onPurchaseComplete
}: BuyKiltProps) {
  const { address, isConnected } = useWagmiWallet();
  const { toast } = useToast();

  // Swap state
  const [ethAmount, setEthAmount] = useState('');
  const [kiltAmount, setKiltAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get current KILT/ETH price data
  const { data: kiltData, refetch: refetchKiltData } = useQuery({
    queryKey: ['/api/kilt-data'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: ethPriceData } = useQuery({
    queryKey: ['/api/eth-price'],
    refetchInterval: 30000
  });

  // Calculate KILT amount when ETH amount changes
  const calculateKiltAmount = useCallback((ethValue: string) => {
    if (!ethValue || !kiltData || !ethPriceData) return '';
    const kiltPrice = (kiltData as any)?.price;
    const ethPrice = (ethPriceData as any)?.ethPrice;
    if (!kiltPrice || !ethPrice) return '';
    
    const ethNum = parseFloat(ethValue);
    const ethUsdValue = ethNum * ethPrice;
    const kiltTokens = ethUsdValue / kiltPrice;
    
    return kiltTokens.toFixed(2);
  }, [kiltData, ethPriceData]);

  // Calculate ETH amount when KILT amount changes
  const calculateEthAmount = useCallback((kiltValue: string) => {
    if (!kiltValue || !kiltData || !ethPriceData) return '';
    const kiltPrice = (kiltData as any)?.price;
    const ethPrice = (ethPriceData as any)?.ethPrice;
    if (!kiltPrice || !ethPrice) return '';
    
    const kiltNum = parseFloat(kiltValue);
    const kiltUsdValue = kiltNum * kiltPrice;
    const ethNeeded = kiltUsdValue / ethPrice;
    
    return ethNeeded.toFixed(6);
  }, [kiltData, ethPriceData]);

  // Handle ETH amount input
  const handleEthAmountChange = (value: string) => {
    setEthAmount(value);
    const calculatedKilt = calculateKiltAmount(value);
    setKiltAmount(calculatedKilt);
  };

  // Handle KILT amount input
  const handleKiltAmountChange = (value: string) => {
    setKiltAmount(value);
    const calculatedEth = calculateEthAmount(value);
    setEthAmount(calculatedEth);
  };

  // Swap direction toggle
  const swapDirection = () => {
    const tempEth = ethAmount;
    setEthAmount(kiltAmount);
    setKiltAmount(tempEth);
  };

  // Quick amount buttons
  const quickAmounts = ['0.01', '0.05', '0.1', '0.25'];

  const handleQuickAmount = (amount: string) => {
    handleEthAmountChange(amount);
  };

  // Execute swap transaction
  const executeSwap = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to buy KILT tokens.",
        variant: "destructive",
      });
      return;
    }

    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid ETH amount to swap.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSwapping(true);
      
      // For now, redirect to Uniswap interface with pre-filled parameters
      const uniswapUrl = `https://app.uniswap.org/#/swap?exactField=input&exactAmount=${ethAmount}&inputCurrency=ETH&outputCurrency=${KILT_TOKEN}&chain=base`;
      
      toast({
        title: "Redirecting to Uniswap",
        description: "Opening Uniswap interface with pre-filled swap details.",
      });
      
      window.open(uniswapUrl, '_blank');
      
      // Refresh data after a delay (assuming user might complete swap)
      setTimeout(() => {
        refetchKiltData();
        onPurchaseComplete?.();
      }, 5000);
      
    } catch (error: any) {
      console.error('Swap execution failed:', error);
      toast({
        title: "Swap Failed",
        description: error.message || "Failed to execute swap. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const kiltPrice = (kiltData as any)?.price;
  const kiltChange = (kiltData as any)?.change24h;
  const currentKiltPrice = kiltPrice ? `$${kiltPrice.toFixed(6)}` : '--';
  const currentKiltChange = kiltChange ? `${kiltChange > 0 ? '+' : ''}${kiltChange.toFixed(2)}%` : '--';

  return (
    <div className="space-y-4">
      {/* Header with current KILT price */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/10 border border-[#ff0066]/30 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-[#ff0066]" />
          </div>
          <div>
            <h2 className="text-white text-lg font-bold">Buy KILT Tokens</h2>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <span>Current Price: {currentKiltPrice}</span>
              <Badge 
                className={`text-xs px-2 py-0.5 ${
                  kiltData?.change24h && kiltData.change24h >= 0 
                    ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}
              >
                {currentKiltChange}
              </Badge>
            </div>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchKiltData()}
          className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Swap Interface */}
      <Card className="bg-black/40 backdrop-blur-xl border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base font-medium">Swap ETH for KILT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* ETH Input (From) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">You Pay</span>
              <span className="text-white/50 text-xs">
                Balance: {formatTokenAmount ? formatTokenAmount(ethBalance || '0', 'ETH') : '--'}
              </span>
            </div>
            
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <EthLogo className="w-5 h-5" />
                <span className="text-white font-medium">ETH</span>
              </div>
              <Input
                type="number"
                step="0.001"
                min="0"
                placeholder="0.0"
                value={ethAmount}
                onChange={(e) => handleEthAmountChange(e.target.value)}
                className="pl-20 pr-4 py-3 bg-white/5 border-white/20 text-white placeholder-white/40 text-lg h-14 rounded-xl focus:border-[#ff0066]/50"
              />
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                  className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-xs px-3 py-1"
                >
                  {amount} ETH
                </Button>
              ))}
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={swapDirection}
              className="rounded-full w-10 h-10 border-white/20 hover:bg-white/10 p-0"
            >
              <ArrowDownUp className="w-4 h-4 text-white/70" />
            </Button>
          </div>

          {/* KILT Output (To) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">You Receive</span>
              <span className="text-white/50 text-xs">
                Balance: {formatTokenAmount ? formatTokenAmount(kiltBalance || '0', 'KILT') : '--'}
              </span>
            </div>
            
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <KiltLogo className="w-5 h-5" />
                <span className="text-white font-medium">KILT</span>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.0"
                value={kiltAmount}
                onChange={(e) => handleKiltAmountChange(e.target.value)}
                className="pl-20 pr-4 py-3 bg-white/5 border-white/20 text-white placeholder-white/40 text-lg h-14 rounded-xl focus:border-[#ff0066]/50"
              />
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-white/70 hover:text-white hover:bg-white/10 text-sm"
            >
              Advanced Settings
            </Button>
            
            {showAdvanced && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg space-y-3">
                <div className="space-y-2">
                  <label className="text-white/70 text-sm">Slippage Tolerance</label>
                  <div className="flex gap-2">
                    {['0.1', '0.5', '1.0'].map((value) => (
                      <Button
                        key={value}
                        variant={slippage === value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSlippage(value)}
                        className={`text-xs ${
                          slippage === value 
                            ? 'bg-[#ff0066] hover:bg-[#ff0066]/80 text-white'
                            : 'border-white/20 text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {value}%
                      </Button>
                    ))}
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      placeholder="Custom"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      className="w-24 h-8 text-xs bg-white/5 border-white/20 text-white"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Swap Button */}
          <Button
            onClick={executeSwap}
            disabled={!isConnected || !ethAmount || parseFloat(ethAmount) <= 0 || isSwapping}
            className="w-full bg-gradient-to-r from-[#ff0066] to-[#ff0066]/80 hover:from-[#ff0066]/90 hover:to-[#ff0066]/70 text-white font-bold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-base h-12"
          >
            {isSwapping ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </div>
            ) : !isConnected ? (
              'Connect Wallet'
            ) : !ethAmount || parseFloat(ethAmount) <= 0 ? (
              'Enter Amount'
            ) : (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Buy KILT on Uniswap
                <ExternalLink className="w-4 h-4" />
              </div>
            )}
          </Button>

          {/* Info box */}
          <div className="bg-[#ff0066]/5 border border-[#ff0066]/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-[#ff0066]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-[#ff0066] rounded-full" />
              </div>
              <div className="space-y-1">
                <p className="text-[#ff0066] text-sm font-medium">Trade on Uniswap</p>
                <p className="text-white/70 text-xs leading-relaxed">
                  This will open Uniswap with your swap details pre-filled. Complete the transaction there to receive KILT tokens in your wallet.
                </p>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-black/20 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Zap className="w-3 h-3 text-green-400" />
              </div>
              <span className="text-white/90 font-medium text-sm">Why Buy KILT?</span>
            </div>
            <p className="text-white/70 text-xs leading-relaxed">
              KILT tokens are required for liquidity provision. Earn up to 163% APR by providing KILT/ETH liquidity.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-xl border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ExternalLink className="w-3 h-3 text-blue-400" />
              </div>
              <span className="text-white/90 font-medium text-sm">Secure Trading</span>
            </div>
            <p className="text-white/70 text-xs leading-relaxed">
              All swaps are executed through Uniswap's secure decentralized protocol on Base network.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}