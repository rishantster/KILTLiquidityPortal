import { Card, CardContent } from '@/components/ui/card';
import { usePoolData } from '@/hooks/use-pool-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, TrendingUp, BarChart3, User } from 'lucide-react';
import { TREASURY_TOTAL } from '@/lib/constants';

export function PoolOverview() {
  const { data: poolData, isLoading } = usePoolData();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="glass-card rounded-2xl">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!poolData) {
    return (
      <div className="text-center py-8">
        <div className="cluely-card rounded-2xl p-8 max-w-lg mx-auto">
          <div className="w-12 h-12 kilt-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-heading text-white mb-2">Pool Deployment Pending</h3>
          <p className="text-white/60 font-body text-sm">
            The KILT/ETH Uniswap V3 pool is not yet deployed. Once launched, you'll be able to provide liquidity and earn rewards from the treasury allocation.
          </p>
          <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-white/80 text-sm font-medium">
              <strong>{TREASURY_TOTAL.toLocaleString()} KILT</strong> ready for distribution
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tvl = parseFloat((poolData as any)?.tvl || "0");
  const volume = parseFloat((poolData as any)?.volume24h || "0");
  const apr = parseFloat((poolData as any)?.apr || "0");

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="cluely-card rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/60 text-sm font-medium">Total Value Locked</span>
            <Lock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-heading text-white">
            $0
          </div>
          <div className="text-white/40 text-xs font-body mt-1">Pool pending</div>
        </CardContent>
      </Card>

      <Card className="cluely-card rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/60 text-sm font-medium">Target APR</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-heading text-white">
            47.2%
          </div>
          <div className="text-white/40 text-xs font-body mt-1">Base rewards</div>
        </CardContent>
      </Card>

      <Card className="cluely-card rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/60 text-sm font-medium">24h Volume</span>
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-heading text-white">
            $0
          </div>
          <div className="text-white/40 text-xs font-body mt-1">Pending pool</div>
        </CardContent>
      </Card>

      <Card className="cluely-card rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/60 text-sm font-medium">Your Positions</span>
            <User className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-heading text-white">0</div>
          <div className="text-white/40 text-xs font-body mt-1">Active NFTs</div>
        </CardContent>
      </Card>
    </div>
  );
}
