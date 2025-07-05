import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Cpu, 
  Coins, 
  Clock, 
  TrendingUp, 
  Users, 
  Shield,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useKiltStaker } from '@/hooks/use-smart-contract';
import { useWallet } from '@/hooks/use-wallet';

export function SmartContractDemo() {
  const { address, isConnected } = useWallet();
  const {
    programStats,
    userStakes,
    pendingRewards,
    isLoading,
    isProgramActive,
    timeRemaining,
    totalStaked,
    totalDistributed,
    stakePosition,
    unstakePosition,
    claimRewards,
    approveNFT,
    isStaking,
    isUnstaking,
    isClaiming,
    isApproving,
    formatKiltAmount,
    formatTimeRemaining,
    calculateRewardParameters
  } = useKiltStaker();

  const [demoTokenId, setDemoTokenId] = useState('12345');
  const [demoLiquidity, setDemoLiquidity] = useState('1000');

  // Demo reward calculation
  const demoRewards = calculateRewardParameters(
    parseFloat(demoLiquidity) || 0,
    7 // 7 days staked
  );

  return (
    <div className="space-y-6">
      {/* Smart Contract Status */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <span>Smart Contract Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Program Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isProgramActive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <Label className="text-white/60 font-body text-sm">Program Status</Label>
              </div>
              <div className="text-white font-medium">
                {isProgramActive ? 'Active' : 'Inactive'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <Label className="text-white/60 font-body text-sm">Time Remaining</Label>
              </div>
              <div className="text-white font-medium">
                {formatTimeRemaining(timeRemaining)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-purple-400" />
                <Label className="text-white/60 font-body text-sm">Total Staked</Label>
              </div>
              <div className="text-white font-medium">
                {totalStaked.toString()} positions
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Coins className="h-4 w-4 text-amber-400" />
                <Label className="text-white/60 font-body text-sm">Distributed</Label>
              </div>
              <div className="text-white font-medium">
                {formatKiltAmount(totalDistributed)} KILT
              </div>
            </div>
          </div>

          {/* Contract Address */}
          <div className="cluely-card bg-white/3 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white/60 font-body text-sm">Contract Address</Label>
                <div className="text-white font-mono text-sm">
                  0x0000...0000 <Badge variant="secondary" className="ml-2">Not Deployed</Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-400 hover:text-blue-300"
                disabled
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Dashboard */}
      {isConnected && (
        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <Shield className="h-5 w-5 text-emerald-400" />
              <span>Your Staking Dashboard</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="cluely-card bg-white/3 p-4 rounded-xl">
                <div className="space-y-2">
                  <Label className="text-white/60 font-body text-sm">Staked Positions</Label>
                  <div className="text-2xl font-heading text-white">
                    {userStakes?.length || 0}
                  </div>
                </div>
              </div>

              <div className="cluely-card bg-white/3 p-4 rounded-xl">
                <div className="space-y-2">
                  <Label className="text-white/60 font-body text-sm">Pending Rewards</Label>
                  <div className="text-2xl font-heading text-emerald-400">
                    {formatKiltAmount(pendingRewards)} KILT
                  </div>
                </div>
              </div>

              <div className="cluely-card bg-white/3 p-4 rounded-xl">
                <div className="space-y-2">
                  <Label className="text-white/60 font-body text-sm">Wallet</Label>
                  <div className="text-sm font-mono text-white">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div className="flex space-x-3">
                <Button
                  onClick={() => claimRewards()}
                  disabled={isClaiming || !pendingRewards || pendingRewards === BigInt(0)}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-heading rounded-xl"
                >
                  {isClaiming ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Coins className="h-4 w-4 mr-2" />
                  )}
                  Claim Rewards
                </Button>
              </div>

              {/* Staked Positions List */}
              {userStakes && userStakes.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-white font-heading">Your Staked Positions</Label>
                  {userStakes.map((tokenId) => (
                    <div key={tokenId.toString()} className="cluely-card bg-white/3 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">Position #{tokenId.toString()}</div>
                          <div className="text-white/60 text-sm">Active since staking</div>
                        </div>
                        <Button
                          onClick={() => unstakePosition(tokenId)}
                          disabled={isUnstaking}
                          variant="outline"
                          size="sm"
                          className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                        >
                          {isUnstaking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Unstake'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Contract Demo */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <span>Reward Calculation Demo</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demo Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white font-heading text-sm">NFT Token ID</Label>
              <Input
                value={demoTokenId}
                onChange={(e) => setDemoTokenId(e.target.value)}
                placeholder="12345"
                className="cluely-button h-10 text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white font-heading text-sm">Liquidity Value (USD)</Label>
              <Input
                value={demoLiquidity}
                onChange={(e) => setDemoLiquidity(e.target.value)}
                placeholder="1000"
                className="cluely-button h-10 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          {/* Demo Calculation Results */}
          <div className="cluely-card bg-white/3 p-4 rounded-xl">
            <div className="space-y-4">
              <Label className="text-white font-heading">Smart Contract Calculation</Label>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Base APR</span>
                  <span className="text-white">{demoRewards.baseAPR}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Time Multiplier</span>
                  <span className="text-emerald-400">{demoRewards.timeMultiplier.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Size Multiplier</span>
                  <span className="text-amber-400">{demoRewards.sizeMultiplier.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Effective APR</span>
                  <span className="text-white font-medium">{demoRewards.effectiveAPR.toFixed(1)}%</span>
                </div>
              </div>

              <hr className="border-white/10" />

              <div className="text-center">
                <div className="text-white/60 text-sm">Daily Rewards</div>
                <div className="text-2xl font-heading text-white">
                  {demoRewards.dailyRewards.toFixed(1)} KILT
                </div>
              </div>
            </div>
          </div>

          {/* Demo Actions */}
          <div className="space-y-3">
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  if (!isConnected) return;
                  approveNFT(BigInt(demoTokenId));
                }}
                disabled={!isConnected || isApproving}
                variant="outline"
                className="flex-1 border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
              >
                {isApproving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Approve NFT
              </Button>

              <Button
                onClick={() => {
                  if (!isConnected) return;
                  stakePosition({
                    tokenId: BigInt(demoTokenId),
                    liquidity: BigInt(parseFloat(demoLiquidity) * 1e18)
                  });
                }}
                disabled={!isConnected || isStaking}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-heading rounded-xl"
              >
                {isStaking ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                Stake Position
              </Button>
            </div>

            {!isConnected && (
              <div className="flex items-center space-x-2 text-amber-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Connect wallet to interact with smart contracts</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <span>Technical Implementation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Smart Contract Features */}
            <div className="space-y-3">
              <Label className="text-white font-heading">Smart Contract Features</Label>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-white/80">Uniswap V3 NFT position validation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-white/80">Time-based reward multipliers (1x-2x)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-white/80">Size-based reward multipliers (1x-1.5x)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-white/80">Automatic reward accrual</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-white/80">Gas-optimized reward calculations</span>
                </li>
              </ul>
            </div>

            {/* Security Features */}
            <div className="space-y-3">
              <Label className="text-white font-heading">Security & Safety</Label>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <span className="text-white/80">ReentrancyGuard protection</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <span className="text-white/80">Access control mechanisms</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <span className="text-white/80">SafeERC20 token transfers</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <span className="text-white/80">Position ownership validation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <span className="text-white/80">Emergency withdrawal functions</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Contract Deployment Status */}
          <div className="cluely-card bg-white/3 p-4 rounded-xl">
            <div className="space-y-3">
              <Label className="text-white font-heading">Deployment Status</Label>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-white/80 text-sm">Ready for deployment to Base network</span>
              </div>
              <div className="text-white/60 text-sm">
                The smart contract has been developed and is ready for deployment. 
                Once deployed, users will be able to stake their Uniswap V3 KILT/ETH positions 
                and earn real KILT token rewards based on the implemented multiplier system.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}