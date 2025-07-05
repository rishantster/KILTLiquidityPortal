import { useState } from 'react';
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
  Wallet
} from 'lucide-react';

// Import critical components
import { LiquidityProvision } from './liquidity-provision';
import { RewardsTracking } from './rewards-tracking';
import { AnalyticsDashboard } from './analytics-dashboard';
import { PositionsDashboard } from './positions-dashboard';
import { WalletConnect } from './wallet-connect';
import { useWallet } from '@/hooks/use-wallet';
import { useKiltTokenData } from '@/hooks/use-kilt-data';

export function MainDashboard() {
  const { address, isConnected } = useWallet();
  const { data: kiltData } = useKiltTokenData();
  const [activeTab, setActiveTab] = useState('overview');

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="mb-8">
              <div className="w-24 h-24 cluely-card rounded-full mx-auto mb-6 flex items-center justify-center">
                <Wallet className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-4xl font-heading text-white mb-3">
                KILT Liquidity Portal
              </h1>
              <p className="text-white/70 text-lg font-body max-w-md mx-auto">
                Connect your wallet to access advanced DeFi liquidity management
              </p>
            </div>
            <WalletConnect />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">
        {/* Header */}
        <Card className="cluely-card rounded-2xl mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 cluely-primary rounded-xl flex items-center justify-center">
                  <Coins className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white font-heading text-2xl">
                    KILT Liquidity Portal
                  </CardTitle>
                  <p className="text-white/70 font-body">
                    Advanced DeFi liquidity management on Base network
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  <Activity className="h-3 w-3 mr-1" />
                  Base Network
                </Badge>
                <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10">
                  ${kiltData?.price?.toFixed(4) || '0.0000'}
                </Badge>
                <WalletConnect />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Tabbed Interface */}
        <Card className="cluely-card rounded-2xl">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-white/10 px-3 sm:px-6 pt-6">
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
                    value="positions" 
                    className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 data-[state=active]:border-emerald-500/30 tab-glass flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3 font-medium rounded-lg"
                  >
                    <Target className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Liquidity</span>
                    <span className="sm:hidden truncate">LPs</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rewards" 
                    className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 data-[state=active]:border-amber-500/30 tab-glass flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3 font-medium rounded-lg"
                  >
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Rewards</span>
                    <span className="sm:hidden truncate">Earn</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics" 
                    className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 data-[state=active]:border-purple-500/30 tab-glass flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3 font-medium rounded-lg"
                  >
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Analytics</span>
                    <span className="sm:hidden truncate">Stats</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Quick Stats */}
                    <Card className="cluely-card rounded-2xl">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white/70 text-sm font-body">KILT Price</div>
                            <div className="text-white font-heading text-2xl mt-1">
                              ${kiltData?.price?.toFixed(4) || '0.0000'}
                            </div>
                            <div className="text-emerald-300 text-xs font-medium mt-1">
                              +{kiltData?.priceChange24h?.toFixed(2) || '0.00'}%
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-emerald-300" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="cluely-card rounded-2xl">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white/70 text-sm font-body">Market Cap</div>
                            <div className="text-white font-heading text-2xl mt-1">
                              ${((kiltData?.marketCap || 0) / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-blue-300 text-xs font-medium mt-1">
                              290.56M supply
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Coins className="h-6 w-6 text-blue-300" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="cluely-card rounded-2xl">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white/70 text-sm font-body">Treasury APR</div>
                            <div className="text-white font-heading text-2xl mt-1">
                              47.2%
                            </div>
                            <div className="text-purple-300 text-xs font-medium mt-1">
                              Base reward rate
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Award className="h-6 w-6 text-purple-300" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Welcome Message */}
                  <Card className="cluely-card rounded-2xl relative overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 cluely-primary rounded-2xl flex items-center justify-center">
                          <Wallet className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-heading text-xl mb-1">
                            Welcome to KILT Liquidity Portal
                          </h3>
                          <p className="text-white/70 font-body">
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

              {/* Liquidity & Positions Tab */}
              <TabsContent value="positions" className="p-6">
                <PositionsDashboard />
              </TabsContent>

              {/* Rewards Tab */}
              <TabsContent value="rewards" className="p-6">
                <RewardsTracking />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="p-6">
                <AnalyticsDashboard selectedPositionId={null} userId={null} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}