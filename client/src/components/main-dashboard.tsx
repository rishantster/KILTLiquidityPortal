import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Zap, 
  Settings, 
  BarChart3, 
  Coins, 
  Award,
  Activity,
  Target,
  Wallet,
  Plus
} from 'lucide-react';

// Import critical components
import { LiquidityMint } from './liquidity-mint';
import { RewardsTracking } from './rewards-tracking';
import { AnalyticsDashboard } from './analytics-dashboard';
import { PositionsDashboard } from './positions-dashboard';
import { WalletConnect } from './wallet-connect';
import { useWallet } from '@/contexts/wallet-context';
import { useKiltTokenData } from '@/hooks/use-kilt-data';

export function MainDashboard() {
  const { address, isConnected, initialized } = useWallet();
  const { data: kiltData } = useKiltTokenData();
  const [activeTab, setActiveTab] = useState('overview');

  // Debug wallet state
  console.log('MainDashboard - Wallet State:', { address, isConnected, initialized });

  // Force component re-render when wallet state changes
  useEffect(() => {
    console.log('MainDashboard - Wallet state changed:', { address, isConnected, initialized });
  }, [address, isConnected, initialized]);

  // Show loading until wallet is initialized
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-floating"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-slate-500/8 rounded-full blur-3xl animate-floating" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl animate-floating" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="text-center pt-16 pb-8">
            {/* Hero Section */}
            <div className="mb-12 animate-fade-in">
              <div className="w-32 h-32 cluely-card rounded-full mx-auto mb-8 flex items-center justify-center animate-floating">
                <Coins className="h-16 w-16 text-white" />
              </div>
              
              {/* Main Headline - KILT focused */}
              <h1 className="text-5xl sm:text-6xl font-display text-white mb-6 leading-tight animate-slide-up">
                KILT Liquidity
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Incentive Program
                </span>
              </h1>
              
              <p className="text-xl text-white/80 font-body max-w-2xl mx-auto mb-8 leading-relaxed animate-fade-in animate-delay-200">
                Provide liquidity for KILT/ETH on Base network and earn up to 47.2% APR with time and size multipliers. 
                1% of total KILT supply (2.9M tokens) allocated from treasury.
              </p>
            </div>

            {/* Connection Section */}
            <div className="mb-16 animate-scale-in animate-delay-300 flex flex-col items-center">
              <div className="mb-4">
                <WalletConnect />
              </div>
              <p className="text-white/50 text-sm font-body text-center">
                No signup required. Connect and start earning in seconds.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              <Card className="cluely-card rounded-2xl p-6 animate-fade-in animate-delay-100">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-blue-300" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">KILT/ETH Pool</h3>
                <p className="text-white/60 text-sm font-body">
                  Provide liquidity to the official KILT/ETH Uniswap V3 pool on Base network with concentrated positions.
                </p>
              </Card>

              <Card className="cluely-card rounded-2xl p-6 animate-fade-in animate-delay-200">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-6 w-6 text-emerald-300" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Treasury Rewards</h3>
                <p className="text-white/60 text-sm font-body">
                  Earn KILT tokens from treasury allocation with up to 47.2% APR plus time and size multipliers.
                </p>
              </Card>

              <Card className="cluely-card rounded-2xl p-6 animate-fade-in animate-delay-300">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-300" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Program Analytics</h3>
                <p className="text-white/60 text-sm font-body">
                  Track your position performance, rewards earned, and program progress with detailed analytics.
                </p>
              </Card>
            </div>

            {/* Bottom CTA */}
            <div className="text-center animate-fade-in animate-delay-500">
              <h2 className="text-3xl font-heading text-white mb-4">
                Join the
              </h2>
              <h1 className="text-5xl font-display bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-6">
                KILT Ecosystem
              </h1>
              <p className="text-white/60 text-lg font-body max-w-xl mx-auto">
                Become a liquidity provider for KILT Protocol and earn substantial rewards while supporting the decentralized identity ecosystem.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">
        {/* Header */}
        <Card className="cluely-card rounded-2xl mb-6 animate-slide-up">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 animate-slide-in-left">
                <div className="w-12 h-12 cluely-primary rounded-xl flex items-center justify-center animate-floating">
                  <Coins className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white font-display text-2xl">
                    KILT Liquidity Portal
                  </CardTitle>
                  <p className="text-white/70 font-medium">
                    Advanced DeFi liquidity management on Base network
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 animate-fade-in animate-delay-200">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 animate-pulse-glow">
                  <Activity className="h-3 w-3 mr-1" />
                  Base Network
                </Badge>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                  ${kiltData?.price?.toFixed(4) || '0.0000'}
                </Badge>
                <div className="flex items-center space-x-2">
                  <WalletConnect />
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Tabbed Interface */}
        <Card className="cluely-card rounded-2xl animate-scale-in animate-delay-300">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-white/10 px-3 sm:px-6 pt-6 animate-fade-in animate-delay-400">
                <TabsList className="grid w-full grid-cols-4 nav-glass h-10 sm:h-12 overflow-x-auto rounded-xl">
                  <TabsTrigger 
                    value="overview" 
                    className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30 tab-glass flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3 font-medium rounded-lg"
                  >
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Overview</span>
                    <span className="sm:hidden truncate">Home</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="liquidity" 
                    className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 tab-glass flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3 font-medium rounded-lg"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Add Liquidity</span>
                    <span className="sm:hidden truncate">Add</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rewards" 
                    className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30 tab-glass flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3 font-medium rounded-lg"
                  >
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Rewards</span>
                    <span className="sm:hidden truncate">Rewards</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="positions" 
                    className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border-purple-500/30 tab-glass flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3 font-medium rounded-lg"
                  >
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Positions</span>
                    <span className="sm:hidden truncate">Positions</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Quick Stats */}
                    <Card className="cluely-card rounded-2xl animate-fade-in animate-delay-100">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white/70 text-sm font-medium">KILT Price</div>
                            <div className="text-white font-mono-numbers text-2xl mt-1">
                              ${kiltData?.price?.toFixed(4) || '0.0000'}
                            </div>
                            <div className="text-emerald-300 text-xs font-semibold mt-1">
                              +{kiltData?.priceChange24h?.toFixed(2) || '0.00'}%
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center animate-pulse-glow">
                            <TrendingUp className="h-6 w-6 text-emerald-300" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="cluely-card rounded-2xl animate-fade-in animate-delay-200">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white/70 text-sm font-medium">Market Cap</div>
                            <div className="text-white font-mono-numbers text-2xl mt-1">
                              ${((kiltData?.marketCap || 0) / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-blue-300 text-xs font-semibold mt-1">
                              290.56M supply
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center animate-floating">
                            <Coins className="h-6 w-6 text-blue-300" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="cluely-card rounded-2xl animate-fade-in animate-delay-300">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white/70 text-sm font-medium">Treasury APR</div>
                            <div className="text-white font-mono-numbers text-2xl mt-1">
                              47.2%
                            </div>
                            <div className="text-purple-300 text-xs font-semibold mt-1">
                              Base reward rate
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center animate-pulse-glow">
                            <Award className="h-6 w-6 text-purple-300" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Welcome Message */}
                  <Card className="cluely-card rounded-2xl relative overflow-hidden animate-fade-in animate-delay-400">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 cluely-primary rounded-2xl flex items-center justify-center animate-floating">
                          <Wallet className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1 animate-slide-in-left animate-delay-500">
                          <h3 className="text-white font-semibold text-xl mb-1">
                            Welcome to KILT Liquidity Portal
                          </h3>
                          <p className="text-white/70 font-mono-numbers">
                            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                          </p>
                          <p className="text-white/50 text-sm mt-2 font-body">
                            Manage your liquidity positions, earn rewards, and track performance with advanced analytics
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Add Liquidity Tab */}
              <TabsContent value="liquidity" className="p-6">
                <LiquidityMint />
              </TabsContent>

              {/* Dedicated Rewards Tab */}
              <TabsContent value="rewards" className="p-6">
                <RewardsTracking />
              </TabsContent>

              {/* My Positions Tab - Clean without rewards */}
              <TabsContent value="positions" className="p-6">
                <PositionsDashboard />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}