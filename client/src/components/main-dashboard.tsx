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
import { UserPositions } from './user-positions';
import { RewardsTracking } from './rewards-tracking';
import { AnalyticsDashboard } from './analytics-dashboard';
import { IntegrationDashboard } from './integration-dashboard';
import { WalletConnect } from './wallet-connect';
import { useWallet } from '@/hooks/use-wallet';
import { useKiltTokenData } from '@/hooks/use-kilt-data';

export function MainDashboard() {
  const { address, isConnected } = useWallet();
  const { data: kiltData } = useKiltTokenData();
  const [activeTab, setActiveTab] = useState('overview');

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Wallet className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-heading text-white mb-2">
                KILT Liquidity Portal
              </h1>
              <p className="text-white/60 text-lg">
                Connect your wallet to access advanced DeFi features
              </p>
            </div>
            <WalletConnect />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">
        {/* Header */}
        <Card className="cluely-card rounded-2xl mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Coins className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white font-heading text-2xl">
                    KILT Liquidity Portal
                  </CardTitle>
                  <p className="text-white/60">
                    Advanced DeFi liquidity management on Base network
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="border-emerald-500/20 text-emerald-400">
                  <Activity className="h-3 w-3 mr-1" />
                  Base Network
                </Badge>
                <Badge variant="outline" className="border-purple-500/20 text-purple-400">
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
                <TabsList className="grid w-full grid-cols-6 bg-white/5 h-10 sm:h-12 overflow-x-auto">
                  <TabsTrigger 
                    value="overview" 
                    className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3"
                  >
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Overview</span>
                    <span className="sm:hidden truncate">Home</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="liquidity" 
                    className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3"
                  >
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Liquidity</span>
                    <span className="sm:hidden truncate">Add</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="positions" 
                    className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3"
                  >
                    <Target className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Positions</span>
                    <span className="sm:hidden truncate">LPs</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rewards" 
                    className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3"
                  >
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Rewards</span>
                    <span className="sm:hidden truncate">Earn</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics" 
                    className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3"
                  >
                    <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Analytics</span>
                    <span className="sm:hidden truncate">Stats</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="integration" 
                    className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm min-w-0 px-1 sm:px-3"
                  >
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden sm:inline truncate">Integration</span>
                    <span className="sm:hidden truncate">Tech</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {/* Quick Stats */}
                    <Card className="cluely-card bg-white/3 rounded-xl">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white/60 text-sm">KILT Price</div>
                            <div className="text-white font-heading text-xl">
                              ${kiltData?.price?.toFixed(4) || '0.0000'}
                            </div>
                            <div className="text-emerald-400 text-xs">
                              +{kiltData?.priceChange24h?.toFixed(2) || '0.00'}%
                            </div>
                          </div>
                          <TrendingUp className="h-8 w-8 text-emerald-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="cluely-card bg-white/3 rounded-xl">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white/60 text-sm">Market Cap</div>
                            <div className="text-white font-heading text-xl">
                              ${((kiltData?.marketCap || 0) / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-blue-400 text-xs">
                              290.56M supply
                            </div>
                          </div>
                          <Coins className="h-8 w-8 text-blue-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="cluely-card bg-white/3 rounded-xl">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white/60 text-sm">Treasury APR</div>
                            <div className="text-white font-heading text-xl">
                              47.2%
                            </div>
                            <div className="text-purple-400 text-xs">
                              Base reward rate
                            </div>
                          </div>
                          <Award className="h-8 w-8 text-purple-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Welcome Message */}
                  <Card className="cluely-card bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                          <Wallet className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-heading text-lg">
                            Welcome to KILT Liquidity Portal
                          </h3>
                          <p className="text-white/60">
                            Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Liquidity Tab */}
              <TabsContent value="liquidity" className="p-6">
                <LiquidityProvision />
              </TabsContent>

              {/* Positions Tab */}
              <TabsContent value="positions" className="p-6">
                <UserPositions />
              </TabsContent>

              {/* Rewards Tab */}
              <TabsContent value="rewards" className="p-6">
                <RewardsTracking />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="p-6">
                <AnalyticsDashboard />
              </TabsContent>

              {/* Integration Tab */}
              <TabsContent value="integration" className="p-6">
                <IntegrationDashboard />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}