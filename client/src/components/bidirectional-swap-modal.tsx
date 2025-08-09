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
}

export const BidirectionalSwapModal = ({ isOpen, onClose }: BidirectionalSwapModalProps) => {
  const { data: kiltData } = useKiltTokenData();
  const { address } = useWagmiWallet();
  
  const [fromToken, setFromToken] = useState<'ETH' | 'KILT'>('ETH');
  const [toToken, setToToken] = useState<'ETH' | 'KILT'>('KILT');
  const [fromAmount, setFromAmount] = useState('0.010');
  const [toAmount, setToAmount] = useState('0');
  const [priceImpact, setPriceImpact] = useState(0);

  // Mock balances for display
  const ethBalance = 0.005404;
  const kiltBalance = 51544.325239;

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

  // Real-time swap quote calculation (supports both directions)
  const { data: swapQuote, isLoading: quoteLoading } = useQuery({
    queryKey: ['/api/swap/quote', fromAmount, fromToken, toToken],
    enabled: !!fromAmount && parseFloat(fromAmount) > 0,
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
    if (swapQuote) {
      if (fromToken === 'ETH') {
        setToAmount(swapQuote.kiltAmount || '0');
      } else {
        setToAmount(swapQuote.ethAmount || '0');
      }
      setPriceImpact(swapQuote.priceImpact || 0);
    }
  }, [swapQuote, fromToken]);

  // Handle percentage buttons for from amount
  const handlePercentageClick = (percentage: number) => {
    const currentBalance = getCurrentBalance();
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

  // Execute swap
  const executeSwap = async () => {
    try {
      // Check if user is connected
      if (typeof window.ethereum === 'undefined') {
        // Fallback to Uniswap redirect
        const swapUrl = fromToken === 'ETH' 
          ? `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8&chain=base&exactAmount=${fromAmount}&exactField=input`
          : `https://app.uniswap.org/#/swap?inputCurrency=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8&outputCurrency=ETH&chain=base&exactAmount=${fromAmount}&exactField=input`;
        window.open(swapUrl, '_blank');
        onClose();
        return;
      }

      // Get user address
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];

      if (!userAddress) {
        // Fallback to Uniswap
        const swapUrl = fromToken === 'ETH' 
          ? `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8&chain=base&exactAmount=${fromAmount}&exactField=input`
          : `https://app.uniswap.org/#/swap?inputCurrency=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8&outputCurrency=ETH&chain=base&exactAmount=${fromAmount}&exactField=input`;
        window.open(swapUrl, '_blank');
        onClose();
        return;
      }

      // Prepare swap based on direction
      const swapParams = fromToken === 'ETH' 
        ? { userAddress, ethAmount: fromAmount, slippageTolerance: 0.5 }
        : { userAddress, kiltAmount: fromAmount, slippageTolerance: 0.5 };

      const response = await fetch('/api/swap/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swapParams)
      });

      if (!response.ok) throw new Error('Failed to prepare swap');

      const { swapData } = await response.json();

      // Execute the swap transaction
      console.log('Sending transaction with data:', swapData);
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [swapData]
      });

      console.log('Swap transaction sent:', txHash);
      onClose();
      
    } catch (error) {
      console.error('Swap error:', error);
      // Fallback to Uniswap redirect on any error
      const swapUrl = fromToken === 'ETH' 
        ? `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8&chain=base&exactAmount=${fromAmount}&exactField=input`
        : `https://app.uniswap.org/#/swap?inputCurrency=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8&outputCurrency=ETH&chain=base&exactAmount=${fromAmount}&exactField=input`;
      window.open(swapUrl, '_blank');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-black/95 backdrop-blur-xl border border-gray-800/50 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-[#ff0066]" />
              <span>Swap</span>
            </div>
            <div className="flex items-center gap-1">
              {fromToken === 'ETH' ? (
                <EthereumLogo className="w-5 h-5" />
              ) : (
                <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
              )}
              <ArrowDownUp className="h-4 w-4 text-gray-400" />
              {toToken === 'ETH' ? (
                <EthereumLogo className="w-5 h-5" />
              ) : (
                <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* From Token Input */}
          <div className="p-4 bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-400">You Pay</div>
              <div className="text-sm text-gray-400">
                Balance: {getCurrentBalance().toFixed(fromToken === 'ETH' ? 6 : 2)} {fromToken}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Input
                type="text"
                value={fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                placeholder="0.0"
                className="text-2xl font-bold bg-transparent border-none text-white font-mono p-0 h-auto focus-visible:ring-0"
              />
              <div className="flex items-center gap-2">
                {fromToken === 'ETH' ? (
                  <>
                    <EthereumLogo className="w-6 h-6" />
                    <span className="font-bold">{fromToken}</span>
                  </>
                ) : (
                  <>
                    <img src={kiltLogo} alt="KILT" className="w-6 h-6" />
                    <span className="font-bold">{fromToken}</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Percentage Buttons */}
            <div className="flex gap-2 mt-3">
              {[25, 50, 75, 100].map((percentage) => (
                <Button
                  key={percentage}
                  onClick={() => handlePercentageClick(percentage)}
                  variant="outline"
                  size="sm"
                  className="text-xs border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  {percentage}%
                </Button>
              ))}
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <Button
              onClick={swapTokens}
              variant="outline"
              size="icon"
              className="rounded-full border-gray-600 hover:bg-gray-800"
            >
              <div className="p-2 bg-gradient-to-r from-[#ff0066] to-pink-600 rounded-full">
                <ArrowUpDown className="h-4 w-4 text-white" />
              </div>
            </Button>
          </div>

          {/* To Token Output */}
          <div className="p-4 bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-lg">
            <div className="text-sm text-gray-400 mb-3">You Receive</div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white font-mono">
                {quoteLoading ? 'Calculating...' : 
                 parseFloat(toAmount) > 0 ? parseFloat(toAmount).toLocaleString(undefined, {maximumFractionDigits: toToken === 'ETH' ? 6 : 2}) : '0.00'}
              </div>
              <div className="flex items-center gap-2">
                {toToken === 'ETH' ? (
                  <>
                    <EthereumLogo className="w-6 h-6" />
                    <span className="font-bold">{toToken}</span>
                  </>
                ) : (
                  <>
                    <img src={kiltLogo} alt="KILT" className="w-6 h-6" />
                    <span className="font-bold">{toToken}</span>
                  </>
                )}
              </div>
            </div>
            
            {priceImpact > 0 && (
              <div className="mt-2 flex items-center gap-1 text-sm">
                <TrendingUp className="h-3 w-3 text-orange-400" />
                <span className="text-orange-400">Price Impact: {priceImpact.toFixed(2)}%</span>
              </div>
            )}
          </div>

          {/* Swap Button */}
          <Button
            disabled={!fromAmount || parseFloat(fromAmount) <= 0}
            onClick={executeSwap}
            className="w-full bg-gradient-to-r from-[#ff0066] to-pink-600 hover:from-[#ff0066]/90 hover:to-pink-600/90 text-white font-bold py-4 text-lg transition-all duration-200 shadow-lg hover:shadow-pink-500/25 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
          >
            {parseFloat(fromAmount) <= 0 ? 'Enter Amount' : 
             `Swap ${fromToken} → ${parseFloat(toAmount) > 0 ? parseFloat(toAmount).toLocaleString(undefined, {maximumFractionDigits: toToken === 'ETH' ? 4 : 0}) : '0'} ${toToken}`}
          </Button>


        </div>
        
        {/* Close Button */}
        <div className="space-y-2">
          <Button 
            onClick={onClose}
            variant="outline" 
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};