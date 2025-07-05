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
    <div className="min-h-screen text-slate-100">
      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 kilt-gradient rounded-2xl flex items-center justify-center floating-animation">
                  <Coins className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-display text-white">KILT Liquidity Incentive Portal</h1>
                  <p className="text-xs text-slate-400 font-light">Decentralized Identity Meets DeFi</p>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-2 glass-button rounded-full px-3 py-1">
                <span className="text-xs text-slate-300 font-body">Base Network</span>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-3 text-sm">
                <span className="text-slate-400 font-body">Treasury Allocation:</span>
                <span className="text-kilt-500 font-heading">
                  {TREASURY_TOTAL.toLocaleString()} KILT
                </span>
              </div>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        {/* Pool Overview */}
        <section>
          <Card className="glass-card neon-border rounded-3xl overflow-hidden">
            <CardHeader className="pb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                  <CardTitle className="text-4xl font-display text-white mb-2">
                    KILT/ETH Pool
                  </CardTitle>
                  <p className="text-slate-300 font-body text-lg">
                    Uniswap V3 Liquidity Incentive Program on Base Network
                  </p>
                  <div className="flex items-center space-x-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-2 w-fit">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-yellow-400 text-sm font-body">Pool Deployment Pending</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3 mt-6 md:mt-0">
                  <div className="w-12 h-12 kilt-gradient rounded-2xl flex items-center justify-center floating-animation">
                    <Coins className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-slate-400 text-2xl font-light">/</span>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center floating-animation" style={{animationDelay: '2s'}}>
                    <span className="text-white text-lg font-bold">Ξ</span>
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
        <section>
          <LiquidityProvision />
        </section>

        {/* User Positions */}
        <section>
          <UserPositions />
        </section>

        {/* Rewards Tracking */}
        <section>
          <RewardsTracking />
        </section>
      </main>

      {/* Footer */}
      <footer className="glass-header mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-6 mb-6 md:mb-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 kilt-gradient rounded-2xl flex items-center justify-center">
                  <Coins className="h-4 w-4 text-white" />
                </div>
                <span className="text-white font-heading text-lg">KILT Liquidity Incentive Portal</span>
              </div>
              <div className="text-slate-400 text-sm font-body">
                Powered by Uniswap V3 on Base Network
              </div>
            </div>
            
            <div className="flex items-center space-x-8 text-sm text-slate-300">
              <a href="https://www.kilt.io/" className="hover:text-kilt-500 transition-colors font-body">Documentation</a>
              <a href="#" className="hover:text-kilt-500 transition-colors font-body">Support</a>
              <a href="#" className="hover:text-kilt-500 transition-colors font-body">Terms</a>
              <a href="#" className="hover:text-kilt-500 transition-colors font-body">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
