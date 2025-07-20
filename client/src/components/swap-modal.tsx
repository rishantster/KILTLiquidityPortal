import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ExternalLink } from 'lucide-react';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useWallet } from '@/contexts/wallet-context';
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

export const SwapModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
  const { data: kiltData } = useKiltTokenData();
  const { address } = useWallet();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-black/95 backdrop-blur-xl border border-gray-800/50 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-[#ff0066]" />
              <span>Buy KILT</span>
            </div>
            <div className="flex items-center gap-1">
              <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
              <span className="text-sm text-gray-400">
                ${kiltData?.price?.toFixed(4) || '0.0185'}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Swap Interface */}
          <div className="p-4 bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-lg">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 mb-4">
                <EthereumLogo className="w-6 h-6" />
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                <img src={kiltLogo} alt="KILT" className="w-6 h-6" />
              </div>
              
              <h3 className="text-lg font-semibold text-white">ETH → KILT Swap</h3>
              <p className="text-sm text-gray-400">
                Get KILT tokens to provide liquidity and earn rewards
              </p>
              
              {/* Embedded Uniswap Widget */}
              <div className="mt-4 border border-gray-700/50 rounded-lg overflow-hidden">
                <iframe
                  src={`https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8&chain=base&theme=dark`}
                  width="100%"
                  height="400"
                  style={{ border: 'none', borderRadius: '8px' }}
                  allow="clipboard-write"
                  title="Uniswap Swap Interface"
                  className="bg-gray-900"
                />
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="space-y-2">
            <Button
              onClick={() => {
                const swapUrl = `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8&chain=base`;
                window.open(swapUrl, '_blank');
              }}
              className="w-full bg-gradient-to-r from-[#ff0066] to-pink-600 hover:from-[#ff0066]/90 hover:to-pink-600/90 text-white font-semibold transition-all duration-200"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            
            <Button 
              onClick={onClose}
              variant="outline" 
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};