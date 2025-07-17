import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Activity, Clock, Wallet } from 'lucide-react';
import { usePositionPerformance, usePositionFees } from '@/hooks/use-analytics';
import { useWallet } from '@/contexts/wallet-context';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

// Ethereum logo component
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

interface AnalyticsDashboardProps {
  selectedPositionId?: number | null;
  userId?: number | null;
}

export function AnalyticsDashboard({ selectedPositionId, userId }: AnalyticsDashboardProps) {
  const { address } = useWallet();
  const { kiltEthPositions } = useUniswapV3();
  
  // Get only essential analytics data
  const { data: positionPerformance } = usePositionPerformance(selectedPositionId || null);
  const { data: positionFees } = usePositionFees(selectedPositionId || null);

  // Check if user has Uniswap positions even if not in database
  const hasUniswapPositions = kiltEthPositions && kiltEthPositions.length > 0;
  
  const latestPerformance = positionPerformance?.[0];
  const totalFeesEarned = positionFees?.totals ? parseFloat(positionFees.totals.amountUSD) : 0;

  if (!address) {
    return (
      <Card className="cluely-card rounded-lg">
        <CardContent className="p-3">
          <div className="text-center text-white/60 text-xs">
            Connect your wallet to view analytics
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sleek Header */}
      <Card className="cluely-card rounded-lg">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-white font-heading text-sm">
            <BarChart3 className="h-3 w-3 text-emerald-400" />
            <span>Position Analytics</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Sleek Analytics Content */}
      {!selectedPositionId && !hasUniswapPositions ? (
        <div className="space-y-4">
          {/* Empty State with Better Guidance */}
          <Card className="cluely-card rounded-lg">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <BarChart3 className="h-12 w-12 text-white/30 mx-auto mb-3" />
                <h3 className="text-white font-heading text-sm mb-2">No Positions Yet</h3>
                <p className="text-white/60 text-xs mb-4">
                  Create your first KILT/ETH position to unlock detailed analytics and performance tracking
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2 text-xs text-white/50">
                  <TrendingUp className="h-3 w-3" />
                  <span>Position performance metrics</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-xs text-white/50">
                  <DollarSign className="h-3 w-3" />
                  <span>Fee earnings tracking</span>
                </div>
                <div className="flex items-center justify-center space-x-2 text-xs text-white/50">
                  <Activity className="h-3 w-3" />
                  <span>Impermanent loss analysis</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pool Overview - Always Show */}
          <Card className="cluely-card rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-heading text-sm flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-blue-400" />
                KILT/ETH Pool Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">Current TVL</span>
                    <TrendingUp className="h-3 w-3 text-blue-400" />
                  </div>
                  <div className="text-white font-bold text-sm">$81.8K</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">Fee Tier</span>
                    <DollarSign className="h-3 w-3 text-emerald-400" />
                  </div>
                  <div className="text-white font-bold text-sm">0.3%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Program Analytics - Always Show */}
          <Card className="cluely-card rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-heading text-sm flex items-center gap-2">
                <Clock className="h-3 w-3 text-purple-400" />
                Program Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">Treasury APR</span>
                    <Activity className="h-3 w-3 text-purple-400" />
                  </div>
                  <div className="text-white font-bold text-sm">64% - 86%</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">Active Users</span>
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                  </div>
                  <div className="text-white font-bold text-sm">1</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : hasUniswapPositions ? (
        <div className="space-y-4">
          {/* Show analytics for Uniswap positions */}
          <Card className="cluely-card rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-heading text-sm flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                Your KILT Positions Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">Total Positions</span>
                    <Wallet className="h-3 w-3 text-emerald-400" />
                  </div>
                  <div className="text-white font-bold text-sm">{kiltEthPositions?.length || 0}</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-xs">Pool Fee Tier</span>
                    <DollarSign className="h-3 w-3 text-blue-400" />
                  </div>
                  <div className="text-white font-bold text-sm">0.3%</div>
                </div>
              </div>
              <div className="text-center text-white/60 text-xs">
                Register positions in Overview tab to unlock detailed analytics and earn treasury rewards
              </div>
            </CardContent>
          </Card>

          {/* Position List */}
          <Card className="cluely-card rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-white font-heading text-sm">Position Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2">
                {kiltEthPositions?.map((position, index) => (
                  <div key={position.tokenId} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{index + 1}</span>
                        </div>
                        <span className="text-white text-sm">NFT #{position.tokenId}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-sm">
                          ${((parseFloat(position.amount0 || '0') * 0.0176) + (parseFloat(position.amount1 || '0') * 2500)).toFixed(2)}
                        </div>
                        <div className="text-white/60 text-xs">Estimated Value</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Position Performance Metrics */}
          {latestPerformance && (
            <Card className="cluely-card rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-white font-heading text-sm">Position Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-xs">Impermanent Loss</span>
                      <span className={`font-bold tabular-nums text-xs ${
                        parseFloat(latestPerformance.impermanentLoss) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {parseFloat(latestPerformance.impermanentLoss).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-xs">Annualized Return</span>
                      <span className={`font-bold tabular-nums text-xs ${
                        parseFloat(latestPerformance.annualizedReturn) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {parseFloat(latestPerformance.annualizedReturn).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-xs">Time in Range</span>
                      <span className="font-bold tabular-nums text-emerald-400 text-xs">
                        {(parseFloat(latestPerformance.timeInRange) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-xs">Fee Yield</span>
                      <span className="font-bold tabular-nums text-blue-400 text-xs">
                        {parseFloat(latestPerformance.feesVsHolding).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fee Analytics */}
          {totalFeesEarned > 0 && (
            <Card className="cluely-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white font-heading">Fee Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold tabular-nums text-blue-400">
                    ${totalFeesEarned.toFixed(4)}
                  </div>
                  <div className="text-white/60 text-sm mt-1">
                    Total fees earned from this position
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message when no data */}
          {!latestPerformance && totalFeesEarned === 0 && (
            <Card className="cluely-card rounded-2xl">
              <CardContent className="p-6">
                <div className="text-center text-white/60">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-white/30" />
                  <div className="text-lg font-medium mb-2">Analytics Building</div>
                  <div className="text-sm">
                    Position analytics will appear as trading activity generates data.
                    <br />
                    Check back after some time for performance metrics and fee tracking.
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}