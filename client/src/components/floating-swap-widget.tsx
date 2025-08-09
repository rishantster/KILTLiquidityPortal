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
        <div className="absolute bottom-20 right-0 mb-2">
          <div className="relative group">
            {/* Strong cyberpunk glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff0066]/40 to-[#ff3385]/20 rounded-2xl blur-2xl scale-110"></div>
            
            <div className="relative bg-gradient-to-br from-black/95 to-gray-900/95 backdrop-blur-xl border-2 border-[#ff0066]/50 rounded-2xl p-5 min-w-[340px] shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[#ff0066]/20 rounded-lg">
                    <ArrowUpDown className="h-4 w-4 text-[#ff0066]" />
                  </div>
                  <span className="text-white font-semibold text-base">Quick Swap</span>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-white/60 hover:text-white transition-colors text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded"
                >
                  ×
                </button>
              </div>

              {/* Swap Preview */}
              <div className="space-y-4 mb-5">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-black/60 to-gray-900/60 rounded-xl border border-[#ff0066]/20 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <EthereumLogo className="w-6 h-6 drop-shadow-lg" />
                    <span className="text-white font-medium">ETH</span>
                  </div>
                  <div className="p-1 bg-[#ff0066]/20 rounded-full">
                    <ArrowUpDown className="h-4 w-4 text-[#ff0066]" />
                  </div>
                  <div className="flex items-center gap-3">
                    <img src={kiltLogo} alt="KILT" className="w-6 h-6 drop-shadow-lg" />
                    <span className="text-white font-medium">KILT</span>
                  </div>
                </div>
                
                {/* Current Price */}
                <div className="text-center p-2 bg-[#ff0066]/10 rounded-lg">
                  <div className="text-white/90 text-sm font-medium">
                    Current Price: <span className="text-[#ff0066]">${kiltData?.price?.toFixed(6) || '...'}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleSwapClick}
                className="w-full bg-gradient-to-r from-[#ff0066] to-[#ff3385] hover:from-[#ff0066] hover:to-[#cc0052] text-white font-semibold text-base rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl border-0 py-3 hover:scale-105"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Trade on Uniswap
              </Button>

              {/* Info */}
              <div className="text-xs text-white/60 text-center mt-3 bg-black/30 rounded-lg py-2">
                Base Network • 0.3% Pool Fee • Instant Trading
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className="relative group w-16 h-16 rounded-full bg-gradient-to-br from-[#ff0066] to-[#ff3385] hover:from-[#ff0066] hover:to-[#cc0052] border-2 border-white/20 hover:border-white/40 transition-all duration-300 shadow-2xl hover:shadow-[0_0_40px_rgba(255,0,102,0.6)] hover:scale-110"
      >
        {/* Strong cyberpunk glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff0066] to-[#ff3385] rounded-full blur-xl scale-125 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
        
        {/* Button content */}
        <div className="relative flex items-center justify-center z-10">
          {isExpanded ? (
            <span className="text-white text-xl font-bold">×</span>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <span className="text-white font-bold text-xs leading-none">SWAP</span>
              <div className="flex items-center mt-0.5">
                <span className="text-white font-bold text-[10px]">ETH</span>
                <ArrowUpDown className="h-3 w-3 text-white mx-1" />
                <span className="text-white font-bold text-[10px]">KILT</span>
              </div>
            </div>
          )}
        </div>

        {/* Outer pulse ring */}
        <div className="absolute inset-0 rounded-full border-2 border-[#ff0066] animate-ping opacity-60 scale-125"></div>
        
        {/* Inner highlight */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-t from-transparent to-white/20"></div>
      </Button>
    </div>
  );
};