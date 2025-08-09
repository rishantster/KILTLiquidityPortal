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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ArrowUpDown className="w-6 h-6 text-pink-400" />
        <h2 className="text-2xl font-bold text-white">Swap</h2>
      </div>

      {/* Swap Interface */}
      <Card className="border border-white/10 bg-black/40 backdrop-blur-sm">
        <CardContent className="space-y-6 pt-6">
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

          {/* Open Swap Modal Button */}
          <Button 
            onClick={() => setShowSwapModal(true)}
            className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-medium transition-all duration-200"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
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