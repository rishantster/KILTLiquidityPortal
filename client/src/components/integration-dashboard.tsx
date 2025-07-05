import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity,
  Coins, 
  Wallet, 
  ExternalLink, 
  Plus,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Target,
  Settings,
  Eye,
  Zap
} from 'lucide-react';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useWallet } from '@/hooks/use-wallet';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { TOKENS, UNISWAP_V3_CONTRACTS } from '@/lib/uniswap-v3';
import { LiquidityMint } from './liquidity-mint';
import { UniswapV3Manager } from './uniswap-v3-manager';

export function IntegrationDashboard() {
  const { address, isConnected } = useWallet();
  const {
    userPositions,
    kiltEthPositions,
    poolData,
    kiltEthPoolAddress,
    kiltBalance,
    wethBalance,
    poolExists,
    isLoading,
    formatTokenAmount,
    calculatePositionValue,
    isPositionInRange
  } = useUniswapV3();
  const { data: kiltData } = useKiltTokenData();

  const [activeTab, setActiveTab] = useState('overview');

  // Calculate total position value
  const totalPositionValue = kiltEthPositions.reduce((total, position) => {
    return total + calculatePositionValue(position);
  }, 0);

  const inRangePositions = kiltEthPositions.filter(position => isPositionInRange(position));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <Zap className="h-6 w-6 text-purple-400" />
            <span>Real Uniswap V3 Integration Dashboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Connection Status */}
            <div className="cluely-card bg-white/3 p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <div>
                  <div className="text-white font-medium text-sm">Wallet</div>
                  <div className="text-white/60 text-xs">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
              </div>
            </div>

            {/* Pool Status */}
            <div className="cluely-card bg-white/3 p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${poolExists ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <div>
                  <div className="text-white font-medium text-sm">KILT/ETH Pool</div>
                  <div className="text-white/60 text-xs">
                    {poolExists ? 'Live on Base' : 'Not Deployed'}
                  </div>
                </div>
              </div>
            </div>

            {/* Position Count */}
            <div className="cluely-card bg-white/3 p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <Eye className="h-4 w-4 text-blue-400" />
                <div>
                  <div className="text-white font-medium text-sm">LP Positions</div>
                  <div className="text-white/60 text-xs">
                    {kiltEthPositions.length} KILT/ETH, {inRangePositions.length} in range
                  </div>
                </div>
              </div>
            </div>

            {/* Total Value */}
            <div className="cluely-card bg-white/3 p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <div>
                  <div className="text-white font-medium text-sm">Total Value</div>
                  <div className="text-white/60 text-xs">
                    ${totalPositionValue.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Information */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <Settings className="h-5 w-5 text-blue-400" />
            <span>Live Contract Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Core Contracts */}
            <div className="space-y-3">
              <h4 className="text-white font-heading text-sm">Uniswap V3 Contracts</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Position Manager</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-mono text-xs">
                      {UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER.slice(0, 6)}...{UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER.slice(-4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-blue-400 hover:text-blue-300"
                      asChild
                    >
                      <a href={`https://basescan.org/address/${UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Factory</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-mono text-xs">
                      {UNISWAP_V3_CONTRACTS.FACTORY.slice(0, 6)}...{UNISWAP_V3_CONTRACTS.FACTORY.slice(-4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-blue-400 hover:text-blue-300"
                      asChild
                    >
                      <a href={`https://basescan.org/address/${UNISWAP_V3_CONTRACTS.FACTORY}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">V3 Staker</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-mono text-xs">
                      {UNISWAP_V3_CONTRACTS.V3_STAKER.slice(0, 6)}...{UNISWAP_V3_CONTRACTS.V3_STAKER.slice(-4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-blue-400 hover:text-blue-300"
                      asChild
                    >
                      <a href={`https://basescan.org/address/${UNISWAP_V3_CONTRACTS.V3_STAKER}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Contracts */}
            <div className="space-y-3">
              <h4 className="text-white font-heading text-sm">Token Contracts</h4>
              <div className="space-y-2 text-sm">
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
                <div className="flex justify-between items-center">
                  <span className="text-white/60">WETH</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-mono text-xs">
                      {TOKENS.WETH.slice(0, 6)}...{TOKENS.WETH.slice(-4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-blue-400 hover:text-blue-300"
                      asChild
                    >
                      <a href={`https://basescan.org/address/${TOKENS.WETH}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
                {kiltEthPoolAddress && poolExists && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">KILT/ETH Pool</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-mono text-xs">
                        {kiltEthPoolAddress.slice(0, 6)}...{kiltEthPoolAddress.slice(-4)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-emerald-400 hover:text-emerald-300"
                        asChild
                      >
                        <a href={`https://basescan.org/address/${kiltEthPoolAddress}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Token Balances */}
      {isConnected && (
        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <Wallet className="h-5 w-5 text-emerald-400" />
              <span>Live Token Balances</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KILT Balance */}
              <div className="cluely-card bg-white/3 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">K</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">KILT Token</div>
                      <div className="text-white/60 text-sm">ERC20 Balance</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-heading text-lg">
                      {formatTokenAmount(kiltBalance)}
                    </div>
                    <div className="text-white/60 text-sm">
                      ${((Number(formatTokenAmount(kiltBalance)) || 0) * (kiltData?.price || 0.0289)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* WETH Balance */}
              <div className="cluely-card bg-white/3 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">Ξ</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">Wrapped ETH</div>
                      <div className="text-white/60 text-sm">ERC20 Balance</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-heading text-lg">
                      {formatTokenAmount(wethBalance)}
                    </div>
                    <div className="text-white/60 text-sm">
                      ${((Number(formatTokenAmount(wethBalance)) || 0) * 3000).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pool Statistics */}
      {poolExists && poolData && (
        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <Activity className="h-5 w-5 text-blue-400" />
              <span>Live Pool Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-white font-heading text-xl">{poolData.fee / 10000}%</div>
                <div className="text-white/60 text-sm">Fee Tier</div>
              </div>
              <div className="text-center">
                <div className="text-white font-heading text-xl">{formatTokenAmount(poolData.liquidity)}</div>
                <div className="text-white/60 text-sm">Total Liquidity</div>
              </div>
              <div className="text-center">
                <div className="text-white font-heading text-xl">{poolData.tick}</div>
                <div className="text-white/60 text-sm">Current Tick</div>
              </div>
              <div className="text-center">
                <div className="text-white font-heading text-xl">{poolData.tickSpacing}</div>
                <div className="text-white/60 text-sm">Tick Spacing</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Interface Tabs */}
      <Card className="cluely-card rounded-2xl">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-white/10 px-6 pt-6">
              <TabsList className="grid w-full grid-cols-2 bg-white/5">
                <TabsTrigger 
                  value="mint" 
                  className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Mint Positions
                </TabsTrigger>
                <TabsTrigger 
                  value="manage" 
                  className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Positions
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="mint" className="p-6 pt-6">
              <LiquidityMint />
            </TabsContent>

            <TabsContent value="manage" className="p-6 pt-6">
              <UniswapV3Manager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card className="cluely-card border-emerald-500/20 bg-emerald-500/10 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <div>
              <div className="text-emerald-300 font-medium">Real Uniswap V3 Integration Active</div>
              <div className="text-emerald-200/80 text-sm">
                Connected to live contracts on Base network. All operations use real blockchain data and transactions.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card className="cluely-card rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
              <span className="text-white/60">Loading live contract data...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}