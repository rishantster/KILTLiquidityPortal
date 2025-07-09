import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Activity, Clock } from 'lucide-react';
import { usePositionPerformance, usePositionFees } from '@/hooks/use-analytics';
import { useWallet } from '@/contexts/wallet-context';
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
  
  // Get only essential analytics data
  const { data: positionPerformance } = usePositionPerformance(selectedPositionId || null);
  const { data: positionFees } = usePositionFees(selectedPositionId || null);

  const latestPerformance = positionPerformance?.[0];
  const totalFeesEarned = positionFees?.totals ? parseFloat(positionFees.totals.amountUSD) : 0;

  if (!address) {
    return (
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-6">
          <div className="text-center text-white/60">
            Connect your wallet to view analytics
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simplified Header */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <BarChart3 className="h-6 w-6 text-purple-400" />
            <span>Position Analytics</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Streamlined Analytics Content */}
      {!selectedPositionId ? (
        <Card className="cluely-card rounded-2xl">
          <CardContent className="p-6">
            <div className="text-center text-white/60">
              Add a liquidity position to view detailed analytics
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Position Performance Metrics */}
          {latestPerformance && (
            <Card className="cluely-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-white font-heading">Position Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Impermanent Loss</span>
                      <span className={`font-bold tabular-nums ${
                        parseFloat(latestPerformance.impermanentLoss) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {parseFloat(latestPerformance.impermanentLoss).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Annualized Return</span>
                      <span className={`font-bold tabular-nums ${
                        parseFloat(latestPerformance.annualizedReturn) >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {parseFloat(latestPerformance.annualizedReturn).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Time in Range</span>
                      <span className="font-bold tabular-nums text-purple-400">
                        {(parseFloat(latestPerformance.timeInRange) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Fee Yield</span>
                      <span className="font-bold tabular-nums text-blue-400">
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