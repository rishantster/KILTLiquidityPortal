import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calculator, Building2, Loader2 } from 'lucide-react';
import { useKiltTokenData, useRewardCalculator } from '@/hooks/use-kilt-data';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

export function RewardsTracking() {
  const { data: kiltData, isLoading: kiltLoading } = useKiltTokenData();
  const { params, calculation, setParams, isLoading: calcLoading } = useRewardCalculator();
  const [liquidityInput, setLiquidityInput] = useState('1000');
  const [daysInput, setDaysInput] = useState('0');

  useEffect(() => {
    const liquidity = parseFloat(liquidityInput) || 0;
    const days = parseInt(daysInput) || 0;
    setParams(prev => ({ 
      ...prev, 
      liquidityAmount: liquidity,
      daysStaked: days,
      positionSize: liquidity // Use liquidity as position size for simplicity
    }));
  }, [liquidityInput, daysInput, setParams]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Reward Calculator */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <Calculator className="h-5 w-5 text-emerald-400" />
            <span>Reward Calculator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-medium">Liquidity Amount (USD)</Label>
              <Input
                type="number"
                value={liquidityInput}
                onChange={(e) => setLiquidityInput(e.target.value)}
                placeholder="1000"
                className="cluely-button border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/60 text-sm font-medium">Days Staked</Label>
              <Input
                type="number"
                value={daysInput}
                onChange={(e) => setDaysInput(e.target.value)}
                placeholder="0"
                className="cluely-button border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Calculation Results */}
          <Card className="cluely-card bg-white/3">
            <CardContent className="p-4">
              {calcLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-white/60" />
                </div>
              ) : calculation ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 font-body">Base APR</span>
                    <span className="text-white font-medium">{calculation.baseAPR}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 font-body">Time Multiplier</span>
                    <span className="text-emerald-400 font-medium">{calculation.timeMultiplier.toFixed(1)}x</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 font-body">Size Multiplier</span>
                    <span className="text-amber-400 font-medium">{calculation.sizeMultiplier.toFixed(1)}x</span>
                  </div>
                  <hr className="border-white/10 my-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Effective APR</span>
                    <span className="text-white font-heading text-lg">{calculation.effectiveAPR.toFixed(1)}%</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-white/40 py-4 font-body">
                  Enter liquidity amount to calculate rewards
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Rewards Display */}
          <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20 rounded-xl">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-sm text-white/60 mb-1 font-body">Daily Rewards</div>
                <div className="text-3xl font-display text-white">
                  {calculation ? `${calculation.dailyRewards.toFixed(1)} KILT` : '0.0 KILT'}
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Treasury Information */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <Building2 className="h-5 w-5 text-emerald-400" />
            <span>Treasury Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {kiltLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
          ) : kiltData ? (
            <>
              <Card className="cluely-card bg-white/3">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 font-body">Total KILT Supply</span>
                      <span className="text-white font-medium">
                        {kiltData.totalSupply.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 font-body">Treasury Allocation</span>
                      <span className="text-blue-400 font-medium">
                        {kiltData.treasuryAllocation.toLocaleString()} KILT (1%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 font-body">Remaining</span>
                      <span className="text-emerald-400 font-medium">
                        {kiltData.treasuryRemaining.toLocaleString()} KILT
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cluely-card bg-white/3">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 font-body">Distribution Rate</span>
                      <span className="text-white font-medium">~{kiltData.distributionRate} KILT/day</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 font-body">Program Duration</span>
                      <span className="text-white font-medium">~{kiltData.programDuration.toLocaleString()} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 font-body">Progress</span>
                      <span className="text-white font-medium">{kiltData.progress.toFixed(3)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="cluely-card bg-white/3">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-white/60 font-body">
                      <span>Program Progress</span>
                      <span>{kiltData.progress.toFixed(3)}% Complete</span>
                    </div>
                    <Progress value={kiltData.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center text-white/40 py-8 font-body">
              Failed to load treasury data
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
