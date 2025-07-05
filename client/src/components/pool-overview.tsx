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
      <div className="text-center py-12">
        <div className="glass-card rounded-3xl p-8 max-w-md mx-auto">
          <div className="w-16 h-16 kilt-gradient rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-heading text-white mb-2">Pool Deployment Pending</h3>
          <p className="text-slate-400 font-body">
            The KILT/ETH Uniswap V3 pool is not yet deployed. Once launched, you'll be able to provide liquidity and earn rewards from the treasury allocation.
          </p>
          <div className="mt-6 p-4 bg-kilt-500/10 border border-kilt-500/20 rounded-2xl">
            <p className="text-kilt-400 text-sm font-body">
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="glass-card rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm font-body">Total Value Locked</span>
            <Lock className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-display text-white">
            ${tvl.toLocaleString()}
          </div>
          <div className="text-emerald-500 text-sm font-body">Pool pending</div>
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm font-body">Target APR</span>
            <TrendingUp className="h-5 w-5 text-kilt-500" />
          </div>
          <div className="text-3xl font-display text-white">
            47.2%
          </div>
          <div className="text-kilt-500 text-sm font-body">Base rewards</div>
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm font-body">24h Volume</span>
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl font-display text-white">
            $0
          </div>
          <div className="text-blue-500 text-sm font-body">Pending pool</div>
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm font-body">Your Positions</span>
            <User className="h-5 w-5 text-amber-500" />
          </div>
          <div className="text-3xl font-display text-white">0</div>
          <div className="text-amber-500 text-sm font-body">Active NFTs</div>
        </CardContent>
      </Card>
    </div>
  );
}
