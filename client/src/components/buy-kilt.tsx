import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Info,
  ExternalLink,
  ArrowUpDown
} from 'lucide-react';
import { BidirectionalSwapModal } from './bidirectional-swap-modal';

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
  const [showSwapModal, setShowSwapModal] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Clean Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Swap Tokens</h2>
        <p className="text-white/70">Buy KILT or swap back to ETH instantly</p>
      </div>

      {/* Modern Swap Interface - Matching App Theme */}
      <Card className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <CardContent className="p-8">
          {/* Current Balances - Glassmorphism Grid */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="text-sm text-white/60 mb-2 font-medium">Your ETH</div>
              <div className="text-2xl font-bold text-white">{ethBalance}</div>
            </div>
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="text-sm text-white/60 mb-2 font-medium">Your KILT</div>
              <div className="text-2xl font-bold text-white">{kiltBalance}</div>
            </div>
          </div>

          {/* Clean Swap Button - App Theme */}
          <Button 
            onClick={() => setShowSwapModal(true)}
            className="w-full h-14 bg-gradient-to-r from-[#ff0066] to-[#ff3385] hover:from-[#cc0052] hover:to-[#e6005c] text-white font-semibold text-lg rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl border-0"
          >
            <ArrowUpDown className="w-5 h-5 mr-3" />
            Open Swap Interface
          </Button>
        </CardContent>
      </Card>

      {/* Bidirectional Swap Modal */}
      <BidirectionalSwapModal 
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        kiltBalance={kiltBalance}
        ethBalance={ethBalance}
        formatTokenAmount={formatTokenAmount}
        onPurchaseComplete={onPurchaseComplete}
      />

      {/* Clean Market Info - Matching App Theme */}
      <Card className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white text-xl">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Market Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="text-sm text-white/60 mb-2 font-medium">Pool Liquidity</div>
              <div className="text-xl font-bold text-white">$99,171</div>
            </div>
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="text-sm text-white/60 mb-2 font-medium">24h Volume</div>
              <div className="text-xl font-bold text-white">$12,485</div>
            </div>
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="text-sm text-white/60 mb-2 font-medium">KILT Price</div>
              <div className="text-xl font-bold text-white">$0.0168</div>
            </div>
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
              <div className="text-sm text-white/60 mb-2 font-medium">24h Change</div>
              <div className="text-xl font-bold text-emerald-400">+1.70%</div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-white/10">
            <Button
              variant="outline"
              className="border-white/20 bg-black/30 backdrop-blur-sm text-white hover:bg-white/10 hover:border-white/30 rounded-xl px-6 py-3 transition-all duration-300"
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