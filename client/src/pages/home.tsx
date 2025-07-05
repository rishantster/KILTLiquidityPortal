import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletConnect } from '@/components/wallet-connect';
import { PoolOverview } from '@/components/pool-overview';
import { LiquidityProvision } from '@/components/liquidity-provision';
import { UserPositions } from '@/components/user-positions';
import { RewardsTracking } from '@/components/rewards-tracking';
import { SmartContractDemo } from '@/components/smart-contract-demo';
import { UniswapV3Manager } from '@/components/uniswap-v3-manager';
import { LiquidityMint } from '@/components/liquidity-mint';
import { IntegrationDashboard } from '@/components/integration-dashboard';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { TREASURY_TOTAL } from '@/lib/constants';
import { Coins } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="cluely-header sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 kilt-gradient rounded-xl flex items-center justify-center">
                  <Coins className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-heading text-white">KILT Liquidity Incentive Portal</h1>
                  <p className="text-xs text-slate-400 font-body">Decentralized Identity Meets DeFi</p>
                </div>
              </div>
              <div className="hidden lg:flex items-center space-x-2 cluely-button rounded-full px-3 py-1">
                <span className="text-xs text-white/80 font-medium">Base Network</span>
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-3 text-sm">
                <span className="text-white/60 font-body">Treasury:</span>
                <span className="text-white font-medium">
                  {TREASURY_TOTAL.toLocaleString()} KILT
                </span>
              </div>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-display text-white text-balance">
              Everything You Need.<br />
              <span className="text-white/60">Before You Provide.</span>
            </h1>
            <p className="text-xl text-white/70 font-body max-w-2xl mx-auto text-balance">
              KILT Liquidity Incentive Portal enables seamless liquidity provision for the KILT/ETH Uniswap V3 pool — with real-time rewards.
            </p>
          </div>
          
          <div className="flex items-center justify-center space-x-3 bg-amber-500/10 border border-amber-500/20 rounded-full px-6 py-3 w-fit mx-auto">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
            <span className="text-amber-300 font-medium">Pool Deployment Pending</span>
          </div>
        </section>

        {/* Pool Overview */}
        <section>
          <Card className="cluely-card rounded-2xl overflow-hidden">
            <CardHeader className="pb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-heading text-white">
                    KILT/ETH Pool
                  </CardTitle>
                  <p className="text-white/60 font-body">
                    Uniswap V3 Liquidity Incentive Program on Base Network
                  </p>
                </div>
                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                  <div className="w-10 h-10 kilt-gradient rounded-xl flex items-center justify-center">
                    <Coins className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-white/40 text-xl font-light">/</span>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">Ξ</span>
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

        {/* Real Uniswap V3 Integration Dashboard */}
        <section>
          <IntegrationDashboard />
        </section>

        {/* Advanced Analytics Dashboard */}
        <section>
          <AnalyticsDashboard />
        </section>

        {/* Smart Contract Demo - Temporarily Disabled */}
        {/* <section>
          <SmartContractDemo />
        </section> */}
      </main>

      {/* Footer */}
      <footer className="cluely-header mt-32">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-6 mb-8 md:mb-0">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 kilt-gradient rounded-lg flex items-center justify-center">
                  <Coins className="h-3 w-3 text-white" />
                </div>
                <span className="text-white font-medium">KILT Liquidity Incentive Portal</span>
              </div>
              <div className="text-white/40 text-sm font-body">
                Powered by Uniswap V3 on Base Network
              </div>
            </div>
            
            <div className="flex items-center space-x-8 text-sm text-white/60">
              <a href="https://www.kilt.io/" className="hover:text-white transition-colors font-body">Documentation</a>
              <a href="#" className="hover:text-white transition-colors font-body">Support</a>
              <a href="#" className="hover:text-white transition-colors font-body">Terms</a>
              <a href="#" className="hover:text-white transition-colors font-body">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
