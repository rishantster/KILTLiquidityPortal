import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import { useWagmiWallet } from '@/hooks/use-wagmi-wallet';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

const EthereumLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M11.944 17.97L4.58 13.62L11.943 24L19.31 13.62L11.944 17.97Z" fill="#627EEA"/>
    <path d="M11.943 0L4.58 12.22L11.943 16.616L19.31 12.22L11.943 0Z" fill="#627EEA" fillOpacity="0.602"/>
  </svg>
);

export const FloatingSwapWidget = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { address } = useWagmiWallet();
  const { data: kiltData } = useKiltTokenData();

  // Generate Uniswap URL with KILT pre-configured
  const getUniswapUrl = () => {
    const baseUrl = 'https://app.uniswap.org/swap';
    const params = new URLSearchParams({
      chain: 'base',
      inputCurrency: 'ETH',
      outputCurrency: '0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8', // KILT token
      theme: 'dark'
    });
    
    if (address) {
      params.append('recipient', address);
    }
    
    return `${baseUrl}?${params.toString()}`;
  };

  const handleSwapClick = () => {
    window.open(getUniswapUrl(), '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Widget */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 mb-2">
          <div className="relative group">
            {/* Cyberpunk glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff0066]/20 to-[#ff3385]/10 rounded-2xl blur-xl scale-110"></div>
            
            <div className="relative bg-black/80 backdrop-blur-xl border border-[#ff0066]/30 rounded-2xl p-4 min-w-[320px] shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-[#ff0066]" />
                  <span className="text-white font-medium text-sm">Quick Swap</span>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Swap Preview */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2">
                    <EthereumLogo className="w-5 h-5" />
                    <span className="text-white text-sm">ETH</span>
                  </div>
                  <ArrowUpDown className="h-3 w-3 text-[#ff0066]" />
                  <div className="flex items-center gap-2">
                    <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
                    <span className="text-white text-sm">KILT</span>
                  </div>
                </div>
                
                {/* Current Price */}
                <div className="text-center text-xs text-white/70">
                  Current Price: ${kiltData?.price?.toFixed(6) || '...'} KILT
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleSwapClick}
                className="w-full bg-gradient-to-r from-[#ff0066] to-[#ff3385] hover:from-[#cc0052] hover:to-[#e6005c] text-white font-medium text-sm rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl border-0"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Trade on Uniswap
              </Button>

              {/* Info */}
              <div className="text-xs text-white/50 text-center mt-2">
                Base Network • 0.3% Pool Fee
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative group w-14 h-14 rounded-full bg-black/80 backdrop-blur-xl border border-[#ff0066]/30 hover:border-[#ff0066]/60 transition-all duration-300 shadow-2xl hover:shadow-[0_0_30px_rgba(255,0,102,0.3)]"
      >
        {/* Cyberpunk glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff0066]/20 to-transparent rounded-full blur-lg scale-110 group-hover:scale-125 transition-transform duration-300"></div>
        
        {/* Button content */}
        <div className="relative flex items-center justify-center">
          {isExpanded ? (
            <span className="text-white text-lg">×</span>
          ) : (
            <div className="flex items-center">
              <EthereumLogo className="w-4 h-4 -mr-1" />
              <ArrowUpDown className="h-3 w-3 text-[#ff0066] mx-0.5" />
              <img src={kiltLogo} alt="KILT" className="w-4 h-4 -ml-1" />
            </div>
          )}
        </div>

        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full border border-[#ff0066]/30 animate-ping opacity-30"></div>
      </Button>
    </div>
  );
};