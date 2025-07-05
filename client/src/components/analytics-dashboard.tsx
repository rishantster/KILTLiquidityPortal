import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Activity,
  DollarSign,
  Percent,
  Clock,
  Target,
  Calendar,
  LineChart,
  PieChart,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Award
} from 'lucide-react';
import { 
  usePositionHistory,
  usePositionPerformance,
  usePositionFees,
  usePoolPriceHistory,
  usePoolTVLHistory,
  useUserAnalyticsDashboard,
  AnalyticsUtils,
  type PositionSnapshot,
  type PerformanceMetrics
} from '@/hooks/use-analytics';
import { useWallet } from '@/contexts/wallet-context';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';

interface AnalyticsDashboardProps {
  selectedPositionId?: number | null;
  userId?: number | null;
}

export function AnalyticsDashboard({ selectedPositionId, userId }: AnalyticsDashboardProps) {
  const { address } = useWallet();
  const { kiltEthPositions, poolData, kiltEthPoolAddress } = useUniswapV3();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Get analytics data
  const { data: userDashboard, isLoading: userLoading } = useUserAnalyticsDashboard(userId || null);
  const { data: positionHistory } = usePositionHistory(selectedPositionId || null, timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90);
  const { data: positionPerformance } = usePositionPerformance(selectedPositionId || null);
  const { data: positionFees } = usePositionFees(selectedPositionId || null);
  const { data: poolPriceHistory } = usePoolPriceHistory(kiltEthPoolAddress || null, timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720);
  const { data: poolTVLHistory } = usePoolTVLHistory(kiltEthPoolAddress || null, timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90);

  // Calculate key metrics
  const currentPositionValue = positionHistory?.[0] ? parseFloat(positionHistory[0].totalValueUSD) : 0;
  const previousPositionValue = positionHistory?.[1] ? parseFloat(positionHistory[1].totalValueUSD) : currentPositionValue;
  const positionValueChange = AnalyticsUtils.calculatePercentageChange(currentPositionValue, previousPositionValue);

  const totalFeesEarned = positionFees?.totals ? parseFloat(positionFees.totals.amountUSD) : 0;
  const latestPerformance = positionPerformance?.[0];

  const currentPoolPrice = poolPriceHistory?.[0] ? parseFloat(poolPriceHistory[0].price) : 0;
  const previousPoolPrice = poolPriceHistory?.[1] ? parseFloat(poolPriceHistory[1].price) : currentPoolPrice;
  const priceChange = AnalyticsUtils.calculatePercentageChange(currentPoolPrice, previousPoolPrice);

  if (!address) {
    return (
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-6">
          <div className="text-center text-white/60">
            Connect your wallet to view analytics dashboard
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <BarChart3 className="h-6 w-6 text-purple-400" />
              <span>Advanced Analytics Dashboard</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              {/* Time Range Selector */}
              <div className="flex bg-white/5 rounded-lg p-1">
                {(['24h', '7d', '30d', '90d'] as const).map((range) => (
                  <Button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    variant={timeRange === range ? "default" : "ghost"}
                    size="sm"
                    className={`px-3 py-1 text-xs ${
                      timeRange === range 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {range}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Portfolio Value */}
        <Card className="cluely-card rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Portfolio Value</div>
                <div className="text-white font-heading text-xl">
                  ${userDashboard?.metrics?.totalValueUSD ? parseFloat(userDashboard.metrics.totalValueUSD).toFixed(2) : '0.00'}
                </div>
                <div className={`text-xs flex items-center space-x-1 ${positionValueChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {positionValueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{AnalyticsUtils.formatPercentage(positionValueChange)}</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        {/* Total Fees Earned */}
        <Card className="cluely-card rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Fees Earned</div>
                <div className="text-white font-heading text-xl">
                  ${userDashboard?.metrics?.totalFeesEarnedUSD ? parseFloat(userDashboard.metrics.totalFeesEarnedUSD).toFixed(2) : '0.00'}
                </div>
                <div className="text-blue-400 text-xs">
                  {userDashboard?.metrics?.totalPositions || 0} positions
                </div>
              </div>
              <Zap className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        {/* Current Pool Price */}
        <Card className="cluely-card rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">KILT Price</div>
                <div className="text-white font-heading text-xl">
                  ${currentPoolPrice.toFixed(4)}
                </div>
                <div className={`text-xs flex items-center space-x-1 ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {priceChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{AnalyticsUtils.formatPercentage(priceChange)}</span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        {/* Best Position APR */}
        <Card className="cluely-card rounded-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white/60 text-sm">Best Position APR</div>
                <div className="text-white font-heading text-xl">
                  {latestPerformance ? parseFloat(latestPerformance.annualizedReturn).toFixed(1) : '0.0'}%
                </div>
                <div className="text-emerald-400 text-xs">
                  {latestPerformance ? `${parseFloat(latestPerformance.timeInRange) * 100}% in range` : 'No data'}
                </div>
              </div>
              <Award className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-white/10 px-6 pt-6">
              <TabsList className="grid w-full grid-cols-4 bg-white/5">
                <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                  <LineChart className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="fees" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Fee Analytics
                </TabsTrigger>
                <TabsTrigger value="pool" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                  <Activity className="h-4 w-4 mr-2" />
                  Pool Data
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="p-6 space-y-6">
              {/* Position Value Chart */}
              <Card className="cluely-card bg-white/3 rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white font-heading text-lg">Position Value Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {positionHistory && positionHistory.length > 0 ? (
                    <div className="space-y-4">
                      {/* Simple chart representation */}
                      <div className="h-48 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg flex items-end justify-between p-4">
                        {positionHistory.slice(0, 10).reverse().map((snapshot, index) => {
                          const value = parseFloat(snapshot.totalValueUSD);
                          const maxValue = Math.max(...positionHistory.map(s => parseFloat(s.totalValueUSD)));
                          const height = (value / maxValue) * 100;
                          
                          return (
                            <div
                              key={snapshot.id}
                              className="bg-purple-400/60 rounded-t-sm flex-1 mx-1 transition-all hover:bg-purple-400"
                              style={{ height: `${Math.max(height, 5)}%` }}
                              title={`$${value.toFixed(2)} on ${new Date(snapshot.snapshotAt).toLocaleDateString()}`}
                            />
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-white/60">Current Value</div>
                          <div className="text-white font-medium">${currentPositionValue.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-white/60">24h Change</div>
                          <div className={`font-medium ${positionValueChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {AnalyticsUtils.formatPercentage(positionValueChange)}
                          </div>
                        </div>
                        <div>
                          <div className="text-white/60">In Range</div>
                          <div className="text-white font-medium">
                            {positionHistory[0]?.inRange ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-white/60 py-8">
                      No position data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Performing Positions */}
              {userDashboard?.topPositions && userDashboard.topPositions.length > 0 && (
                <Card className="cluely-card bg-white/3 rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white font-heading text-lg">Top Performing Positions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {userDashboard.topPositions.map((position, index) => (
                        <div key={position.positionId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-sm">#{index + 1}</span>
                            </div>
                            <div>
                              <div className="text-white font-medium">Position #{position.positionId}</div>
                              <div className="text-white/60 text-sm">
                                {parseFloat(position.timeInRange) * 100}% time in range
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-emerald-400 font-medium">
                              {parseFloat(position.annualizedReturn).toFixed(1)}% APR
                            </div>
                            <div className="text-white/60 text-sm">
                              {parseFloat(position.feesVsHolding).toFixed(2)}% fees
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="p-6 space-y-6">
              {positionPerformance && positionPerformance.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Impermanent Loss */}
                  <Card className="cluely-card bg-white/3 rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white font-heading text-lg">Impermanent Loss</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className={`text-3xl font-heading ${parseFloat(latestPerformance?.impermanentLoss || '0') >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {parseFloat(latestPerformance?.impermanentLoss || '0').toFixed(2)}%
                        </div>
                        <div className="text-white/60 text-sm mt-1">
                          Current impermanent loss vs holding
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Fees vs Holding */}
                  <Card className="cluely-card bg-white/3 rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white font-heading text-lg">Fees vs Holding</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-heading text-blue-400">
                          {parseFloat(latestPerformance?.feesVsHolding || '0').toFixed(2)}%
                        </div>
                        <div className="text-white/60 text-sm mt-1">
                          Fee yield on capital
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Annualized Return */}
                  <Card className="cluely-card bg-white/3 rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white font-heading text-lg">Annualized Return</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className={`text-3xl font-heading ${parseFloat(latestPerformance?.annualizedReturn || '0') >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {parseFloat(latestPerformance?.annualizedReturn || '0').toFixed(1)}%
                        </div>
                        <div className="text-white/60 text-sm mt-1">
                          Projected annual performance
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Time in Range */}
                  <Card className="cluely-card bg-white/3 rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white font-heading text-lg">Time in Range</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-heading text-purple-400">
                          {(parseFloat(latestPerformance?.timeInRange || '0') * 100).toFixed(1)}%
                        </div>
                        <div className="text-white/60 text-sm mt-1">
                          Position actively earning fees
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center text-white/60 py-8">
                  No performance data available for selected position
                </div>
              )}
            </TabsContent>

            {/* Fee Analytics Tab */}
            <TabsContent value="fees" className="p-6 space-y-6">
              {positionFees ? (
                <div className="space-y-6">
                  {/* Fee Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="cluely-card bg-white/3 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-heading text-blue-400">
                          ${parseFloat(positionFees.totals.amountUSD).toFixed(2)}
                        </div>
                        <div className="text-white/60 text-sm">Total Fees (USD)</div>
                      </CardContent>
                    </Card>
                    <Card className="cluely-card bg-white/3 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-heading text-purple-400">
                          {parseFloat(positionFees.totals.amount0).toFixed(4)}
                        </div>
                        <div className="text-white/60 text-sm">Token0 Fees</div>
                      </CardContent>
                    </Card>
                    <Card className="cluely-card bg-white/3 rounded-xl">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-heading text-emerald-400">
                          {parseFloat(positionFees.totals.amount1).toFixed(4)}
                        </div>
                        <div className="text-white/60 text-sm">Token1 Fees</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Fee Events */}
                  <Card className="cluely-card bg-white/3 rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white font-heading text-lg">Recent Fee Events</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {positionFees.events.length > 0 ? (
                        <div className="space-y-3">
                          {positionFees.events.slice(0, 5).map((event) => (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                              <div>
                                <div className="text-white font-medium">
                                  {event.eventType === 'collect' ? 'Fee Collection' : 'Fee Compound'}
                                </div>
                                <div className="text-white/60 text-sm">
                                  {new Date(event.timestamp).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-emerald-400 font-medium">
                                  ${parseFloat(event.amountUSD).toFixed(2)}
                                </div>
                                <div className="text-white/60 text-sm">
                                  Block #{event.blockNumber}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-white/60 py-4">
                          No fee events recorded
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center text-white/60 py-8">
                  No fee data available for selected position
                </div>
              )}
            </TabsContent>

            {/* Pool Data Tab */}
            <TabsContent value="pool" className="p-6 space-y-6">
              {poolPriceHistory && poolTVLHistory ? (
                <div className="space-y-6">
                  {/* Pool Price Chart */}
                  <Card className="cluely-card bg-white/3 rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white font-heading text-lg">Pool Price History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg flex items-end justify-between p-4">
                        {poolPriceHistory.slice(0, 20).reverse().map((point, index) => {
                          const price = parseFloat(point.price);
                          const maxPrice = Math.max(...poolPriceHistory.map(p => parseFloat(p.price)));
                          const height = (price / maxPrice) * 100;
                          
                          return (
                            <div
                              key={point.id}
                              className="bg-amber-400/60 rounded-t-sm flex-1 mx-0.5 transition-all hover:bg-amber-400"
                              style={{ height: `${Math.max(height, 5)}%` }}
                              title={`$${price.toFixed(4)} at ${new Date(point.timestamp).toLocaleString()}`}
                            />
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pool TVL Chart */}
                  <Card className="cluely-card bg-white/3 rounded-xl">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white font-heading text-lg">Pool TVL History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg flex items-end justify-between p-4">
                        {poolTVLHistory.slice(0, 20).reverse().map((point, index) => {
                          const tvl = parseFloat(point.tvl);
                          const maxTVL = Math.max(...poolTVLHistory.map(p => parseFloat(p.tvl)));
                          const height = (tvl / maxTVL) * 100;
                          
                          return (
                            <div
                              key={point.id}
                              className="bg-emerald-400/60 rounded-t-sm flex-1 mx-0.5 transition-all hover:bg-emerald-400"
                              style={{ height: `${Math.max(height, 5)}%` }}
                              title={`$${AnalyticsUtils.formatLargeNumber(tvl)} at ${new Date(point.timestamp).toLocaleString()}`}
                            />
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center text-white/60 py-8">
                  No pool data available
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-white font-medium">Export Analytics Data</div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="border-white/10 text-white/60">
                <Download className="h-4 w-4 mr-2" />
                CSV Export
              </Button>
              <Button variant="outline" size="sm" className="border-white/10 text-white/60">
                <Download className="h-4 w-4 mr-2" />
                PDF Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}