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
  Settings
} from 'lucide-react';
import { WalletConnect } from './wallet-connect';
import { useWallet } from '@/hooks/use-wallet';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';

export default function StreamlinedApp() {
  const { address, isConnected } = useWallet();
  const { data: kiltData } = useKiltTokenData();
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

  // Calculate portfolio metrics
  const totalPositionValue = kiltEthPositions.reduce((total, position) => {
    return total + calculatePositionValue(position);
  }, 0);

  const inRangePositions = kiltEthPositions.filter(position => isPositionInRange(position));

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">K</span>
            </div>
            <h1 className="text-xl font-heading text-white">KILT Liquidity Portal</h1>
          </div>
          <WalletConnect />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {!isConnected ? (
          /* Landing View */
          <div className="text-center space-y-8 py-16">
            <div className="space-y-4">
              <h2 className="text-4xl font-heading text-white">
                Earn Rewards with KILT Liquidity
              </h2>
              <p className="text-white/60 text-lg max-w-2xl mx-auto">
                Provide liquidity to the KILT/ETH pool on Base network and earn rewards from our incentive program.
              </p>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Card className="bg-white/5 border-white/10 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-heading text-emerald-400">47.2%</div>
                  <div className="text-white/60">Base APR</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-heading text-blue-400">${kiltData?.price.toFixed(4) || '0.0289'}</div>
                  <div className="text-white/60">KILT Price</div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10 rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-heading text-purple-400">2.9M</div>
                  <div className="text-white/60">Total Rewards</div>
                </CardContent>
              </Card>
            </div>

            <WalletConnect />
          </div>
        ) : (
          /* Main App Interface */
          <div className="space-y-6">
            {/* Portfolio Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10 rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white/60 text-sm">Portfolio Value</div>
                      <div className="text-white font-heading text-xl">
                        ${totalPositionValue.toFixed(2)}
                      </div>
                    </div>
                    <DollarSign className="h-6 w-6 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white/60 text-sm">Positions</div>
                      <div className="text-white font-heading text-xl">
                        {kiltEthPositions.length}
                      </div>
                    </div>
                    <Target className="h-6 w-6 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white/60 text-sm">KILT Balance</div>
                      <div className="text-white font-heading text-xl">
                        {formatTokenAmount(kiltBalance)}
                      </div>
                    </div>
                    <Zap className="h-6 w-6 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white/60 text-sm">In Range</div>
                      <div className="text-white font-heading text-xl">
                        {inRangePositions.length}/{kiltEthPositions.length}
                      </div>
                    </div>
                    <Activity className="h-6 w-6 text-emerald-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Interface */}
            <Card className="bg-white/5 border-white/10 rounded-2xl">
              <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="border-b border-white/10 px-6 pt-6">
                    <TabsList className="grid w-full grid-cols-3 bg-white/5">
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
                        Positions
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="p-6 space-y-6">
                    {poolExists ? (
                      <div className="text-center space-y-4">
                        <div className="text-emerald-400 text-lg font-medium">
                          KILT/ETH Pool is Live on Base
                        </div>
                        <p className="text-white/60">
                          Start earning rewards by providing liquidity to the KILT/ETH pool
                        </p>
                        <Button 
                          onClick={() => setActiveTab('liquidity')}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          Add Liquidity
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="text-amber-400 text-lg font-medium">
                          KILT/ETH Pool Coming Soon
                        </div>
                        <p className="text-white/60">
                          The pool will be deployed soon. Connect your wallet to get ready.
                        </p>
                      </div>
                    )}

                    {/* Current Price */}
                    <Card className="bg-white/3 rounded-xl">
                      <CardContent className="p-6 text-center">
                        <div className="space-y-2">
                          <div className="text-white/60">KILT Price</div>
                          <div className="text-3xl font-heading text-white">
                            ${kiltData?.price.toFixed(4) || '0.0289'}
                          </div>
                          <div className="text-emerald-400 text-sm">
                            +{kiltData?.priceChange24h.toFixed(2) || '0.00'}% 24h
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Add Liquidity Tab */}
                  <TabsContent value="liquidity" className="p-6 space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-white font-heading text-lg">Add Liquidity to KILT/ETH</h3>
                      
                      {!poolExists && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                          <div className="text-amber-400 text-sm">
                            Pool not yet deployed. Liquidity provision will be available once the pool is live.
                          </div>
                        </div>
                      )}

                      {/* Token Inputs */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/60">KILT Amount</span>
                            <span className="text-white/60">Balance: {formatTokenAmount(kiltBalance)}</span>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0.0"
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

                        <div className="flex justify-center">
                          <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center">
                            <ArrowUpDown className="h-4 w-4 text-white/60" />
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
                    </div>
                  </TabsContent>

                  {/* Positions Tab */}
                  <TabsContent value="positions" className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-heading text-lg">Your Positions</h3>
                      <Badge variant="secondary" className="bg-white/10">
                        {kiltEthPositions.length} positions
                      </Badge>
                    </div>

                    {kiltEthPositions.length > 0 ? (
                      <div className="space-y-4">
                        {kiltEthPositions.map((position) => {
                          const positionValue = calculatePositionValue(position);
                          const inRange = isPositionInRange(position);
                          
                          return (
                            <Card key={position.tokenId.toString()} className="bg-white/3 rounded-xl">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                                      <span className="text-white font-bold text-sm">
                                        #{position.tokenId.toString().slice(-2)}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="text-white font-medium">
                                        Position #{position.tokenId.toString()}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge 
                                          variant={inRange ? "default" : "secondary"}
                                          className={`text-xs ${inRange ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
                                        >
                                          {inRange ? "In Range" : "Out of Range"}
                                        </Badge>
                                        <span className="text-white/60 text-sm">
                                          {position.fee / 10000}% fee
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-white font-heading">
                                      ${positionValue.toFixed(2)}
                                    </div>
                                    <div className="text-white/60 text-sm">
                                      {formatTokenAmount(position.liquidity)} liquidity
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 space-y-4">
                        <div className="text-white/60">No positions found</div>
                        <Button 
                          onClick={() => setActiveTab('liquidity')}
                          variant="outline"
                          className="border-white/20 text-white"
                        >
                          Add Your First Position
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}