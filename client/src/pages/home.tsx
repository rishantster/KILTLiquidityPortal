import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletConnect } from '@/components/wallet-connect';
import { PoolOverview } from '@/components/pool-overview';
import { LiquidityProvision } from '@/components/liquidity-provision';
import { UserPositions } from '@/components/user-positions';
import { RewardsTracking } from '@/components/rewards-tracking';
import { TREASURY_TOTAL } from '@/lib/constants';
import { Coins } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 kilt-gradient rounded-full flex items-center justify-center">
                  <Coins className="h-4 w-4 text-white" />
                </div>
                <span className="text-xl font-bold text-white">KILT Portal</span>
              </div>
              <div className="hidden md:flex items-center space-x-1 bg-slate-700 rounded-lg p-1">
                <span className="text-xs text-slate-400">Base Network</span>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-slate-400">
                <span>Treasury:</span>
                <span className="text-kilt-500 font-semibold">
                  {TREASURY_TOTAL.toLocaleString()} KILT
                </span>
              </div>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Pool Overview */}
        <section className="mb-8">
          <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold text-white mb-2">
                    KILT/ETH Pool
                  </CardTitle>
                  <p className="text-slate-400">
                    Uniswap V3 Liquidity Incentive Program on Base
                  </p>
                </div>
                <div className="flex items-center space-x-2 mt-4 md:mt-0">
                  <div className="w-8 h-8 kilt-gradient rounded-full flex items-center justify-center">
                    <Coins className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-slate-400">/</span>
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">Ξ</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PoolOverview />
            </CardContent>
          </Card>
        </section>

        {/* Liquidity Provision */}
        <section className="mb-8">
          <LiquidityProvision />
        </section>

        {/* User Positions */}
        <section className="mb-8">
          <UserPositions />
        </section>

        {/* Rewards Tracking */}
        <section className="mb-8">
          <RewardsTracking />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 kilt-gradient rounded-full flex items-center justify-center">
                  <Coins className="h-3 w-3 text-white" />
                </div>
                <span className="text-white font-medium">KILT Portal</span>
              </div>
              <div className="text-slate-400 text-sm">
                Powered by Uniswap V3 on Base
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-slate-400">
              <a href="#" className="hover:text-kilt-500 transition-colors">Documentation</a>
              <a href="#" className="hover:text-kilt-500 transition-colors">Support</a>
              <a href="#" className="hover:text-kilt-500 transition-colors">Terms</a>
              <a href="#" className="hover:text-kilt-500 transition-colors">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
