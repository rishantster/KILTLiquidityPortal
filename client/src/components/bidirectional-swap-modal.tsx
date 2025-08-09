import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, ArrowDownUp, Info, TrendingUp } from 'lucide-react';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useWagmiWallet } from '@/hooks/use-wagmi-wallet';
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

// Ethereum Logo Component
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

interface BidirectionalSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  kiltBalance: string;
  ethBalance: string;
  formatTokenAmount: (amount: string, token: string) => string;
  onPurchaseComplete?: () => void;
}

export const BidirectionalSwapModal = ({ 
  isOpen, 
  onClose, 
  kiltBalance: propKiltBalance, 
  ethBalance: propEthBalance,
  formatTokenAmount,
  onPurchaseComplete 
}: BidirectionalSwapModalProps) => {
  const { data: kiltData } = useKiltTokenData();
  const { address, isConnected } = useWagmiWallet();
  
  const [fromToken, setFromToken] = useState<'ETH' | 'KILT'>('ETH');
  const [toToken, setToToken] = useState<'ETH' | 'KILT'>('KILT');
  const [fromAmount, setFromAmount] = useState('0');
  const [toAmount, setToAmount] = useState('0');
  const [priceImpact, setPriceImpact] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  // Use actual balances from props
  const ethBalance = parseFloat(propEthBalance?.replace(/[^\d.-]/g, '') || '0');
  const kiltBalance = parseFloat(propKiltBalance?.replace(/[^\d.-]/g, '') || '0');

  // Get current balance for from token
  const getCurrentBalance = () => {
    return fromToken === 'ETH' ? ethBalance : kiltBalance;
  };

  // Swap direction function
  const swapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Reset modal state when closing
  const handleClose = () => {
    setErrorMessage('');
    setIsSwapping(false);
    setFromAmount('0');
    setToAmount('0');
    onClose();
  };

  // Real-time swap quote calculation (supports both directions)
  const { data: swapQuote, isLoading: quoteLoading } = useQuery({
    queryKey: ['/api/swap/quote', fromAmount, fromToken, toToken],
    enabled: !!fromAmount && parseFloat(fromAmount) > 0 && parseFloat(fromAmount) > 0.000001,
    refetchInterval: 5000,
    staleTime: 4000,
    queryFn: async () => {
      if (fromToken === 'ETH') {
        // ETH to KILT swap
        const response = await fetch(`/api/swap/quote?ethAmount=${fromAmount}`);
        if (!response.ok) throw new Error('Failed to fetch quote');
        return response.json();
      } else {
        // KILT to ETH swap (reverse calculation)
        const response = await fetch(`/api/swap/quote?kiltAmount=${fromAmount}`);
        if (!response.ok) throw new Error('Failed to fetch quote');
        return response.json();
      }
    }
  });

  // Update output amount when quote changes
  useEffect(() => {
    if (swapQuote && parseFloat(fromAmount) > 0.000001) {
      if (fromToken === 'ETH') {
        setToAmount(swapQuote.kiltAmount || '0');
      } else {
        setToAmount(swapQuote.ethAmount || '0');
      }
      setPriceImpact(swapQuote.priceImpact || 0);
    } else if (parseFloat(fromAmount) <= 0.000001) {
      setToAmount('0');
      setPriceImpact(0);
    }
  }, [swapQuote, fromToken, fromAmount]);

  // Handle percentage buttons for from amount
  const handlePercentageClick = (percentage: number) => {
    const currentBalance = getCurrentBalance();
    if (currentBalance <= 0) {
      setFromAmount('0');
      return;
    }
    const maxAmount = fromToken === 'ETH' 
      ? Math.min(currentBalance * 0.99, 0.005) // Keep ETH for gas
      : currentBalance * 0.99; // Can use most KILT
    const amount = (maxAmount * percentage / 100).toFixed(fromToken === 'ETH' ? 6 : 2);
    setFromAmount(amount);
  };

  // Handle manual amount input
  const handleFromAmountChange = useCallback((value: string) => {
    if (!value || value === '') {
      setFromAmount('0');
      return;
    }
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setFromAmount(value);
    }
  }, []);

  // Execute swap using connected wallet (supports Phantom, MetaMask, etc.)
  const executeSwap = async () => {
    try {
      // Check if user is connected via Wagmi
      if (!isConnected || !address) {
        setErrorMessage('Please connect your wallet to perform swaps');
        return;
      }

      // Clear previous errors and show loading state
      setErrorMessage('');
      setIsSwapping(true);

      // Prepare swap based on direction using connected address
      const swapParams = fromToken === 'ETH' 
        ? { userAddress: address, ethAmount: fromAmount, slippageTolerance: 0.5 }
        : { userAddress: address, kiltAmount: fromAmount, slippageTolerance: 0.5 };

      const response = await fetch('/api/swap/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swapParams)
      });

      if (!response.ok) throw new Error('Failed to prepare swap');

      const { swapData } = await response.json();

      // Execute via any connected wallet (Phantom, MetaMask, etc.)
      console.log('Sending transaction with data:', swapData);
      
      // Use the wallet provider that's actually connected
      const provider = window.ethereum;
      if (!provider) {
        throw new Error('No wallet provider found');
      }
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [swapData]
      });

      console.log('Swap transaction sent:', txHash);
      
      // Trigger balance refresh and close modal
      onPurchaseComplete?.();
      setIsSwapping(false);
      handleClose();
      
    } catch (error) {
      console.error('Swap error:', error);
      
      // Set error message instead of automatic redirect
      if (error && typeof error === 'object' && 'message' in error) {
        setErrorMessage(error.message as string);
      } else {
        setErrorMessage('Transaction failed. Please check your wallet connection and try again.');
      }
      
      setIsSwapping(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-black/40 backdrop-blur-xl border border-white/10 text-white p-0 overflow-hidden">
        {/* Modal Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff0066]/10 to-transparent blur-xl"></div>
          <div className="relative bg-black/30 backdrop-blur-sm border-b border-white/10 p-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
                <ArrowUpDown className="h-5 w-5 text-[#ff0066]" />
                <span>Swap</span>
              </DialogTitle>
            </DialogHeader>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* From Token Section */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl blur-sm transition-all duration-300 group-hover:from-white/10"></div>
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 group-hover:border-white/20">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-white/70 font-medium">You Pay</div>
                <div className="text-sm text-white/50">
                  Balance: {getCurrentBalance().toFixed(fromToken === 'ETH' ? 6 : 2)} {fromToken}
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <Input
                  type="text"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  placeholder="0"
                  className="text-2xl font-bold bg-transparent border-none text-white p-0 h-auto focus-visible:ring-0 placeholder:text-white/30"
                />
                <div className="flex items-center gap-3">
                  {fromToken === 'ETH' ? (
                    <EthereumLogo className="w-6 h-6" />
                  ) : (
                    <img src={kiltLogo} alt="KILT" className="w-6 h-6" />
                  )}
                  <span className="font-bold text-white">{fromToken}</span>
                </div>
              </div>
              
              {/* Percentage Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((percentage) => (
                  <Button
                    key={percentage}
                    onClick={() => handlePercentageClick(percentage)}
                    variant="outline"
                    size="sm"
                    className="text-xs border-white/20 bg-black/30 text-white/70 hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                  >
                    {percentage}%
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <Button
              onClick={swapTokens}
              variant="outline"
              size="icon"
              className="w-10 h-10 rounded-full border-white/20 bg-black/40 backdrop-blur-sm hover:bg-black/60 hover:border-[#ff0066]/30 transition-all duration-300"
            >
              <ArrowUpDown className="h-4 w-4 text-[#ff0066]" />
            </Button>
          </div>

          {/* To Token Section */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl blur-sm transition-all duration-300 group-hover:from-white/10"></div>
            <div className="relative bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 group-hover:border-white/20">
              <div className="text-sm text-white/70 font-medium mb-3">You Receive</div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="text-2xl font-bold text-white">
                  {quoteLoading ? '...' : 
                   parseFloat(toAmount) > 0 ? parseFloat(toAmount).toLocaleString(undefined, {maximumFractionDigits: toToken === 'ETH' ? 6 : 2}) : '0'}
                </div>
                <div className="flex items-center gap-3">
                  {toToken === 'ETH' ? (
                    <EthereumLogo className="w-6 h-6" />
                  ) : (
                    <img src={kiltLogo} alt="KILT" className="w-6 h-6" />
                  )}
                  <span className="font-bold text-white">{toToken}</span>
                </div>
              </div>
              
              {priceImpact > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <TrendingUp className="h-3 w-3 text-orange-400" />
                  <span className="text-orange-400">Price Impact: {priceImpact.toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl p-3">
              <div className="text-red-400 text-sm">{errorMessage}</div>
            </div>
          )}

          {/* Swap Button */}
          <Button
            disabled={!fromAmount || parseFloat(fromAmount) <= 0 || isSwapping}
            onClick={executeSwap}
            className="w-full h-12 bg-gradient-to-r from-[#ff0066] to-[#ff3385] hover:from-[#cc0052] hover:to-[#e6005c] text-white font-medium text-sm rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl border-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSwapping ? 'Processing Transaction...' :
             parseFloat(fromAmount) <= 0 ? 'Enter Amount' : 
             'Enter Amount'}
          </Button>

          {/* Close Button */}
          <Button 
            onClick={handleClose}
            variant="outline" 
            className="w-full border-white/20 bg-black/30 backdrop-blur-sm text-white hover:bg-white/10 hover:border-white/30 rounded-xl transition-all duration-300"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};