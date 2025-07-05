import { Card, CardContent } from '@/components/ui/card';
import { usePoolData } from '@/hooks/use-pool-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, TrendingUp, BarChart3, User } from 'lucide-react';

export function PoolOverview() {
  const { data: poolData, isLoading } = usePoolData();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-slate-700 border-slate-600">
            <CardContent className="p-4">
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
        <p className="text-slate-400">Failed to load pool data</p>
      </div>
    );
  }

  const tvl = parseFloat(poolData.tvl);
  const volume = parseFloat(poolData.volume24h);
  const apr = parseFloat(poolData.apr);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Total Value Locked</span>
            <Lock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            ${tvl.toLocaleString()}
          </div>
          <div className="text-emerald-500 text-sm">+12.3% 24h</div>
        </CardContent>
      </Card>

      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">APR</span>
            <TrendingUp className="h-4 w-4 text-kilt-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            {apr.toFixed(1)}%
          </div>
          <div className="text-kilt-500 text-sm">Base rewards</div>
        </CardContent>
      </Card>

      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">24h Volume</span>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-white">
            ${volume.toLocaleString()}
          </div>
          <div className="text-blue-500 text-sm">Active trading</div>
        </CardContent>
      </Card>

      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Your Positions</span>
            <User className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-amber-500 text-sm">Active NFTs</div>
        </CardContent>
      </Card>
    </div>
  );
}
