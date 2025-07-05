import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target,
  Plus,
  ExternalLink,
  Settings,
  Zap,
  Eye,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useWallet } from '@/hooks/use-wallet';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { TOKENS, UNISWAP_V3_CONTRACTS } from '@/lib/uniswap-v3';
import { LiquidityMint } from './liquidity-mint';
import { LiquidityProvision } from './liquidity-provision';
import { UniswapV3Manager } from './uniswap-v3-manager';
import { UserPositions } from './user-positions';

export function PositionsDashboard() {
  const { address, isConnected } = useWallet();
  const {
    kiltEthPositions,
    poolExists,
    formatTokenAmount,
    calculatePositionValue,
    isPositionInRange
  } = useUniswapV3();
  const { data: kiltData } = useKiltTokenData();

  const [activeTab, setActiveTab] = useState('overview');

  // Calculate metrics
  const totalPositionValue = kiltEthPositions.reduce((total, position) => {
    return total + calculatePositionValue(position);
  }, 0);
  const inRangePositions = kiltEthPositions.filter(position => isPositionInRange(position));

  if (!isConnected) {
    return (
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-12 text-center">
          <Target className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-white font-heading text-xl mb-2">Connect Wallet</h3>
          <p className="text-white/60">Connect your wallet to view and manage liquidity positions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Status */}
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-emerald-400" />
              <span className="text-white font-heading">Liquidity Management</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${poolExists ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <span className="text-white/60 text-sm">{poolExists ? 'Pool Live' : 'Pool Pending'}</span>
              </div>
              <Badge variant="outline" className="border-purple-500/20 text-purple-400">
                ${kiltData?.price?.toFixed(4) || '0.0000'} KILT
              </Badge>
            </div>
          </div>
          
          {kiltEthPositions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-white font-medium">{kiltEthPositions.length}</div>
                <div className="text-white/60 text-xs">Total Positions</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-white font-medium">{inRangePositions.length}</div>
                <div className="text-white/60 text-xs">In Range</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-white font-medium">${totalPositionValue.toFixed(2)}</div>
                <div className="text-white/60 text-xs">Total Value</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-white/10 px-6 pt-6">
              <TabsList className="grid w-full grid-cols-5 bg-white/5 h-12 text-xs">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 flex items-center space-x-1"
                >
                  <Eye className="h-3 w-3" />
                  <span>Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="pool" 
                  className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 flex items-center space-x-1"
                >
                  <Zap className="h-3 w-3" />
                  <span>Pool</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="manage" 
                  className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 flex items-center space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>V3 NFTs</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="positions" 
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 flex items-center space-x-1"
                >
                  <Target className="h-3 w-3" />
                  <span>Positions</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="technical" 
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 flex items-center space-x-1"
                >
                  <Settings className="h-3 w-3" />
                  <span>Technical</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Overview Tab */}
            <TabsContent value="overview" className="p-6">
              <div className="space-y-6">
                {kiltEthPositions.length === 0 ? (
                  <Card className="cluely-card bg-white/3 rounded-xl">
                    <CardContent className="p-8 text-center">
                      <Target className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                      <h3 className="text-white font-heading text-lg mb-2">No Positions Yet</h3>
                      <p className="text-white/60 mb-4">
                        Create your first liquidity position to start earning fees and rewards
                      </p>
                      <Button 
                        onClick={() => setActiveTab('manage')}
                        className="cluely-primary"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Liquidity
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {kiltEthPositions.slice(0, 3).map((position, index) => (
                      <Card key={index} className="cluely-card bg-white/3 rounded-xl">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">#{position.tokenId.toString().slice(-2)}</span>
                              </div>
                              <div>
                                <div className="text-white font-medium">KILT/ETH Position</div>
                                <div className="flex items-center space-x-2 text-sm">
                                  <Badge 
                                    variant="outline" 
                                    className={`${isPositionInRange(position) ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'}`}
                                  >
                                    {isPositionInRange(position) ? 'In Range' : 'Out of Range'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-medium">${calculatePositionValue(position).toFixed(2)}</div>
                              <div className="text-white/60 text-sm">Position Value</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {kiltEthPositions.length > 3 && (
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('positions')}
                        className="border-white/20 text-white/80 hover:bg-white/10"
                      >
                        View All {kiltEthPositions.length} Positions
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Pool Management Tab */}
            <TabsContent value="pool" className="p-6">
              <LiquidityProvision />
            </TabsContent>

            {/* Uniswap V3 NFTs Tab */}
            <TabsContent value="manage" className="p-6">
              <LiquidityMint />
            </TabsContent>

            {/* My Positions Tab */}
            <TabsContent value="positions" className="p-6">
              <UserPositions />
            </TabsContent>

            {/* Technical Tab */}
            <TabsContent value="technical" className="p-6">
              <div className="space-y-6">
                {/* Contract Links */}
                <Card className="cluely-card bg-white/3 rounded-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-white font-heading">
                      <Settings className="h-5 w-5 text-cyan-400" />
                      <span>Smart Contracts</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">Position Manager</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-mono text-xs">
                            {UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER.slice(0, 6)}...{UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER.slice(-4)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-cyan-400 hover:text-cyan-300"
                            asChild
                          >
                            <a href={`https://basescan.org/address/${UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-white/60">KILT Token</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-mono text-xs">
                            {TOKENS.KILT.slice(0, 6)}...{TOKENS.KILT.slice(-4)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-purple-400 hover:text-purple-300"
                            asChild
                          >
                            <a href={`https://basescan.org/address/${TOKENS.KILT}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Advanced Tools */}
                <UniswapV3Manager />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}