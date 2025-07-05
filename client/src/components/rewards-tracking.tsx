import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calculator, Building2 } from 'lucide-react';
import { TREASURY_TOTAL, KILT_TOTAL_SUPPLY, BASE_APR } from '@/lib/constants';

export function RewardsTracking() {
  const distributionRate = 95.2; // KILT per day
  const programDuration = Math.floor(TREASURY_TOTAL / distributionRate);
  const remainingTreasury = TREASURY_TOTAL - 289.1; // Assuming 289.1 KILT distributed
  const progress = ((TREASURY_TOTAL - remainingTreasury) / TREASURY_TOTAL) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-kilt-500" />
            <span>Reward Calculator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Card className="bg-slate-600 border-slate-500">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Base APR</span>
                  <span className="text-white font-semibold">{BASE_APR}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Time Multiplier</span>
                  <span className="text-emerald-500 font-semibold">1.3x</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Size Multiplier</span>
                  <span className="text-amber-500 font-semibold">1.1x</span>
                </div>
                <hr className="border-slate-500 my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Effective APR</span>
                  <span className="text-kilt-500 font-bold text-lg">67.6%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-kilt-500/10 to-purple-500/10 border-kilt-500/20">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm text-slate-300 mb-1">Daily Rewards</div>
                <div className="text-2xl font-bold text-kilt-500">23.7 KILT</div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card className="bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-kilt-500" />
            <span>Treasury Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Card className="bg-slate-600 border-slate-500">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Total KILT Supply</span>
                  <span className="text-white font-semibold">
                    {KILT_TOTAL_SUPPLY.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Treasury Allocation</span>
                  <span className="text-kilt-500 font-semibold">
                    {TREASURY_TOTAL.toLocaleString()} KILT (1%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Remaining</span>
                  <span className="text-emerald-500 font-semibold">
                    {remainingTreasury.toLocaleString()} KILT
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-600 border-slate-500">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Distribution Rate</span>
                  <span className="text-white">~{distributionRate} KILT/day</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Program Duration</span>
                  <span className="text-white">~{programDuration} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Progress</span>
                  <span className="text-kilt-500">{progress.toFixed(2)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-600 border-slate-500">
            <CardContent className="p-4">
              <Progress value={progress} className="mb-2" />
              <div className="flex justify-between text-sm text-slate-400">
                <span>Program Progress</span>
                <span>{progress.toFixed(2)}% Complete</span>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
