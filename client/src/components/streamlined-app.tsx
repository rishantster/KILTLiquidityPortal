import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet,
  Plus,
  TrendingUp,
  DollarSign,
  Zap,
  Activity,
  BarChart3,
  Target,
  ArrowUpDown,
  Settings,
  Coins,
  Gift,
  Trophy,
  LineChart,
  ArrowRight,
  Star,
  Users,
  Lock,
  Sparkles
} from 'lucide-react';
import { WalletConnect } from './wallet-connect';
import { useWallet } from '@/hooks/use-wallet';
import { useKiltTokenData, useRewardCalculator } from '@/hooks/use-kilt-data';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useUserPositions, useUserRewards } from '@/hooks/use-pool-data';
import { TREASURY_TOTAL, BASE_APR, MAX_TIME_MULTIPLIER } from '@/lib/constants';

export default function StreamlinedApp() {
  const { address, isConnected } = useWallet();
  const { data: kiltData } = useKiltTokenData();
  const rewardCalculator = useRewardCalculator();
  const { 
    kiltEthPositions, 
    kiltBalance, 
    wethBalance, 
    poolExists,
    formatTokenAmount,
    calculatePositionValue,
    isPositionInRange
  } = useUniswapV3();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [liquidityAmount, setLiquidityAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');

  // Calculate portfolio metrics
  const totalPositionValue = kiltEthPositions.reduce((total, position) => {
    return total + calculatePositionValue(position);
  }, 0);

  const inRangePositions = kiltEthPositions.filter(position => isPositionInRange(position));
  
  // Calculate potential rewards for preview
  const potentialRewards = liquidityAmount && rewardCalculator.calculation ? {
    baseAPR: BASE_APR,
    effectiveAPR: BASE_APR * (1 + (parseFloat(liquidityAmount) / 100000)), // Simple multiplier preview
    dailyRewards: (parseFloat(liquidityAmount) * BASE_APR / 100 / 365),
    timeMultiplier: 1,
    sizeMultiplier: 1 + (parseFloat(liquidityAmount) / 100000)
  } : null;

  return (
    <div className="min-h-screen bg-black text-white">
      {!isConnected ? (
        /* Cluely-Inspired Landing Page */
        <div className="relative">
          {/* Header */}
          <div className="border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Coins className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-white">KILT Liquidity Portal</span>
              </div>
              <WalletConnect />
            </div>
          </div>

          {/* Hero Section */}
          <div className="px-6 py-20 text-center">
            <div className="max-w-4xl mx-auto space-y-8">
              <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight">
                Everything You Need.<br />
                <span className="text-white/60">Before You Provide.</span>
              </h1>
              
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                KILT Liquidity Incentive Portal enables seamless liquidity provision for the KILT/ETH Uniswap V3 pool — with real-time rewards.
              </p>
              
              <div className="flex justify-center">
                <WalletConnect />
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="px-6 py-16 border-t border-white/10">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Reward Stats */}
                <Card className="bg-white/5 border-white/10 rounded-2xl p-8">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-emerald-500/20 rounded-xl">
                        <Gift className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">{BASE_APR}%</div>
                        <div className="text-white/60">Base APR</div>
                      </div>
                    </div>
                    <div className="text-sm text-white/50">
                      Up to {MAX_TIME_MULTIPLIER}x multiplier with time locks
                    </div>
                  </div>
                </Card>

                {/* Treasury Stats */}
                <Card className="bg-white/5 border-white/10 rounded-2xl p-8">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-purple-500/20 rounded-xl">
                        <Trophy className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">
                          {(TREASURY_TOTAL / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-white/60">KILT Rewards</div>
                      </div>
                    </div>
                    <div className="text-sm text-white/50">
                      1% of total supply allocated
                    </div>
                  </div>
                </Card>

                {/* Price Chart */}
                <Card className="bg-white/5 border-white/10 rounded-2xl p-8">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-500/20 rounded-xl">
                        <LineChart className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">
                          ${kiltData?.price.toFixed(4) || '0.0289'}
                        </div>
                        <div className="text-white/60">KILT Price</div>
                      </div>
                    </div>
                    <div className="text-sm text-emerald-400">
                      +{kiltData?.priceChange24h.toFixed(2) || '0.00'}% 24h
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="px-6 py-16 border-t border-white/10">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-white text-center mb-16">
                The turning point of liquidity provision
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Uniswap V3 Integration */}
                <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-8">
                    <div className="mb-6">
                      <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl w-fit">
                        <Sparkles className="h-8 w-8 text-purple-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Uniswap V3 LP NFTs
                    </h3>
                    <p className="text-white/70 mb-6">
                      Real Uniswap V3 NFT positions with concentrated liquidity. Full position management with range orders.
                    </p>
                    <div className="flex items-center text-purple-400 hover:text-purple-300 cursor-pointer">
                      <span className="text-sm font-medium">Learn more</span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </div>
                  </div>
                </Card>

                {/* Reward System */}
                <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-8">
                    <div className="mb-6">
                      <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl w-fit">
                        <Star className="h-8 w-8 text-emerald-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Smart Rewards
                    </h3>
                    <p className="text-white/70 mb-6">
                      Time and size multipliers. Longer stakes and larger positions earn higher rewards automatically.
                    </p>
                    <div className="flex items-center text-emerald-400 hover:text-emerald-300 cursor-pointer">
                      <span className="text-sm font-medium">Calculate rewards</span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </div>
                  </div>
                </Card>

                {/* Base Network */}
                <Card className="bg-white/5 border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-8">
                    <div className="mb-6">
                      <div className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-2xl w-fit">
                        <Users className="h-8 w-8 text-blue-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">
                      Base Network
                    </h3>
                    <p className="text-white/70 mb-6">
                      Low gas fees and fast transactions. Built on Ethereum's secure L2 infrastructure.
                    </p>
                    <div className="flex items-center text-blue-400 hover:text-blue-300 cursor-pointer">
                      <span className="text-sm font-medium">View on Base</span>
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="px-6 py-20 border-t border-white/10 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-5xl font-bold text-white">
                Welcome to<br />
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  The Turning Point of Liquidity.
                </span>
              </h2>
              
              <div className="flex justify-center">
                <WalletConnect />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Connected User Dashboard */
        <div className="relative">
          {/* Header */}
          <div className="border-b border-white/10 px-6 py-4">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Coins className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-white">KILT Liquidity Portal</span>
              </div>
              <WalletConnect />
            </div>
          </div>

          {/* Portfolio Overview */}
          <div className="px-6 py-8 border-b border-white/10">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white/5 border-white/10 rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white/60 text-sm">Portfolio Value</div>
                        <div className="text-2xl font-bold text-white">
                          ${totalPositionValue.toFixed(2)}
                        </div>
                      </div>
                      <DollarSign className="h-8 w-8 text-emerald-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white/60 text-sm">LP Positions</div>
                        <div className="text-2xl font-bold text-white">
                          {kiltEthPositions.length}
                        </div>
                      </div>
                      <Target className="h-8 w-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white/60 text-sm">KILT Balance</div>
                        <div className="text-2xl font-bold text-white">
                          {formatTokenAmount(kiltBalance)}
                        </div>
                      </div>
                      <Zap className="h-8 w-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 rounded-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white/60 text-sm">In Range</div>
                        <div className="text-2xl font-bold text-white">
                          {inRangePositions.length}/{kiltEthPositions.length}
                        </div>
                      </div>
                      <Activity className="h-8 w-8 text-emerald-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Main Interface */}
          <div className="px-6 py-8">
            <div className="max-w-6xl mx-auto">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white/5 mb-8">
                  <TabsTrigger 
                    value="overview" 
                    className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="liquidity" 
                    className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Liquidity
                  </TabsTrigger>
                  <TabsTrigger 
                    value="positions" 
                    className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    My Positions
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* KILT Chart */}
                    <Card className="bg-white/5 border-white/10 rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <LineChart className="h-5 w-5" />
                          <span>KILT Price Chart</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="text-center space-y-4">
                          <div className="text-4xl font-bold text-white">
                            ${kiltData?.price.toFixed(4) || '0.0289'}
                          </div>
                          <div className="text-emerald-400">
                            +{kiltData?.priceChange24h.toFixed(2) || '0.00'}% 24h
                          </div>
                          <div className="h-32 bg-white/5 rounded-xl flex items-center justify-center">
                            <div className="text-white/60">Chart integration coming soon</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reward Calculator */}
                    <Card className="bg-white/5 border-white/10 rounded-2xl">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <Gift className="h-5 w-5" />
                          <span>Reward Calculator</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                          <label className="text-white/60 text-sm">Liquidity Amount (KILT)</label>
                          <Input
                            type="number"
                            placeholder="10000"
                            value={liquidityAmount}
                            onChange={(e) => setLiquidityAmount(e.target.value)}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </div>
                        {potentialRewards && (
                          <div className="space-y-3 p-4 bg-white/5 rounded-xl">
                            <div className="flex justify-between">
                              <span className="text-white/60">Base APR</span>
                              <span className="text-white">{potentialRewards.baseAPR}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Effective APR</span>
                              <span className="text-emerald-400">{potentialRewards.effectiveAPR}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/60">Daily Rewards</span>
                              <span className="text-white">{potentialRewards.dailyRewards.toFixed(2)} KILT</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Add Liquidity Tab */}
                <TabsContent value="liquidity" className="space-y-6">
                  <Card className="bg-white/5 border-white/10 rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-white">Add Liquidity to KILT/ETH</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {!poolExists && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                          <div className="text-amber-400">
                            Pool not yet deployed. Liquidity provision will be available once the pool is live.
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">KILT Amount</span>
                            <span className="text-white/60">Balance: {formatTokenAmount(kiltBalance)}</span>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0.0"
                              value={liquidityAmount}
                              onChange={(e) => setLiquidityAmount(e.target.value)}
                              className="bg-white/5 border-white/10 text-white text-lg h-12 pr-20"
                              disabled={!poolExists}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-xs">K</span>
                              </div>
                              <span className="text-white/60">KILT</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">ETH Amount</span>
                            <span className="text-white/60">Balance: {formatTokenAmount(wethBalance)}</span>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0.0"
                              value={ethAmount}
                              onChange={(e) => setEthAmount(e.target.value)}
                              className="bg-white/5 border-white/10 text-white text-lg h-12 pr-20"
                              disabled={!poolExists}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-xs">Ξ</span>
                              </div>
                              <span className="text-white/60">ETH</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button 
                        className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white"
                        disabled={!poolExists}
                      >
                        {poolExists ? 'Add Liquidity' : 'Pool Not Available'}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Positions Tab */}
                <TabsContent value="positions" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white">Your LP Positions</h3>
                    <Badge variant="secondary" className="bg-white/10">
                      {kiltEthPositions.length} positions
                    </Badge>
                  </div>

                  {kiltEthPositions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {kiltEthPositions.map((position) => {
                        const positionValue = calculatePositionValue(position);
                        const inRange = isPositionInRange(position);
                        
                        return (
                          <Card key={position.tokenId.toString()} className="bg-white/5 border-white/10 rounded-xl">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                                    <span className="text-white font-bold">
                                      #{position.tokenId.toString().slice(-2)}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-white font-semibold">
                                      NFT #{position.tokenId.toString()}
                                    </div>
                                    <div className="text-white/60 text-sm">
                                      {position.fee / 10000}% fee tier
                                    </div>
                                  </div>
                                </div>
                                <Badge 
                                  variant={inRange ? "default" : "secondary"}
                                  className={`${inRange ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
                                >
                                  {inRange ? "In Range" : "Out of Range"}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-white/60">Position Value</span>
                                  <span className="text-white font-semibold">${positionValue.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/60">Liquidity</span>
                                  <span className="text-white/60">{formatTokenAmount(position.liquidity)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card className="bg-white/5 border-white/10 rounded-2xl">
                      <CardContent className="p-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                          <Wallet className="h-8 w-8 text-white/60" />
                        </div>
                        <div className="text-white/60">No LP positions found</div>
                        <Button 
                          onClick={() => setActiveTab('liquidity')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          Add Your First Position
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}