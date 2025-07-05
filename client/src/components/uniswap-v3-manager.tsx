import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Coins, 
  Wallet, 
  ExternalLink, 
  Plus, 
  Minus,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useWallet } from '@/hooks/use-wallet';
import { TOKENS, UNISWAP_V3_CONTRACTS } from '@/lib/uniswap-v3';

export function UniswapV3Manager() {
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
    approveToken,
    approveNFT,
    setApprovalForAll,
    mintPosition,
    increaseLiquidity,
    decreaseLiquidity,
    collectFees,
    burnPosition,
    isApproving,
    isApprovingNFT,
    isMinting,
    isIncreasing,
    isDecreasing,
    isCollecting,
    isBurning,
    formatTokenAmount,
    parseTokenAmount,
    calculatePositionValue,
    isPositionInRange
  } = useUniswapV3();

  const [selectedPosition, setSelectedPosition] = useState<number>(-1);
  const [showMintForm, setShowMintForm] = useState(false);
  const [mintParams, setMintParams] = useState({
    amount0: '',
    amount1: '',
    tickLower: '-887220', // Full range default
    tickUpper: '887220'   // Full range default
  });

  return (
    <div className="space-y-6">
      {/* Uniswap V3 Status */}
      <Card className="cluely-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white font-heading">
            <Coins className="h-5 w-5 text-blue-400" />
            <span>Uniswap V3 Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <Label className="text-white/60 font-body text-sm">Wallet Status</Label>
              </div>
              <div className="text-white font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${poolExists ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <Label className="text-white/60 font-body text-sm">KILT/ETH Pool</Label>
              </div>
              <div className="text-white font-medium">
                {poolExists ? 'Available' : 'Not Deployed'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Wallet className="h-4 w-4 text-purple-400" />
                <Label className="text-white/60 font-body text-sm">NFT Positions</Label>
              </div>
              <div className="text-white font-medium">
                {userPositions.length} total, {kiltEthPositions.length} KILT/ETH
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <Label className="text-white/60 font-body text-sm">Network</Label>
              </div>
              <div className="text-white font-medium">
                Base Mainnet
              </div>
            </div>
          </div>

          {/* Contract Addresses */}
          <div className="cluely-card bg-white/3 p-4 rounded-xl">
            <div className="space-y-3">
              <Label className="text-white font-heading">Contract Addresses</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Position Manager</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-mono text-xs">
                      {UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER.slice(0, 6)}...{UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER.slice(-4)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                      asChild
                    >
                      <a href={`https://basescan.org/address/${UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Pool Address</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-mono text-xs">
                      {kiltEthPoolAddress ? 
                        `${kiltEthPoolAddress.slice(0, 6)}...${kiltEthPoolAddress.slice(-4)}` : 
                        'Not Available'
                      }
                    </span>
                    {kiltEthPoolAddress && poolExists && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                        asChild
                      >
                        <a href={`https://basescan.org/address/${kiltEthPoolAddress}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Balances & Pool Info */}
      {isConnected && (
        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <Wallet className="h-5 w-5 text-emerald-400" />
              <span>Token Balances</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KILT Balance */}
              <div className="cluely-card bg-white/3 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">K</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">KILT</div>
                      <div className="text-white/60 text-sm">Balance</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-heading text-lg">
                      {formatTokenAmount(kiltBalance)}
                    </div>
                    <div className="text-white/60 text-sm">tokens</div>
                  </div>
                </div>
              </div>

              {/* WETH Balance */}
              <div className="cluely-card bg-white/3 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">Ξ</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">WETH</div>
                      <div className="text-white/60 text-sm">Balance</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-heading text-lg">
                      {formatTokenAmount(wethBalance)}
                    </div>
                    <div className="text-white/60 text-sm">tokens</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pool Information */}
            {poolExists && poolData && (
              <div className="cluely-card bg-white/3 p-4 rounded-xl">
                <div className="space-y-3">
                  <Label className="text-white font-heading">KILT/ETH Pool Stats</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-white/60">Fee Tier</div>
                      <div className="text-white font-medium">{poolData.fee / 10000}%</div>
                    </div>
                    <div>
                      <div className="text-white/60">Liquidity</div>
                      <div className="text-white font-medium">{formatTokenAmount(poolData.liquidity)}</div>
                    </div>
                    <div>
                      <div className="text-white/60">Current Tick</div>
                      <div className="text-white font-medium">{poolData.tick}</div>
                    </div>
                    <div>
                      <div className="text-white/60">Tick Spacing</div>
                      <div className="text-white font-medium">{poolData.tickSpacing}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Positions */}
      {isConnected && kiltEthPositions.length > 0 && (
        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <Eye className="h-5 w-5 text-emerald-400" />
              <span>Your KILT/ETH Positions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {kiltEthPositions.map((position, index) => {
              const positionValue = calculatePositionValue(position);
              const inRange = isPositionInRange(position);
              
              return (
                <div key={position.tokenId.toString()} className="cluely-card bg-white/3 p-4 rounded-xl">
                  <div className="space-y-4">
                    {/* Position Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold">#{position.tokenId.toString().slice(-3)}</span>
                        </div>
                        <div>
                          <div className="text-white font-medium">Position #{position.tokenId.toString()}</div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={inRange ? "default" : "secondary"} className="text-xs">
                              {inRange ? "In Range" : "Out of Range"}
                            </Badge>
                            <span className="text-white/60 text-sm">Fee: {position.fee / 10000}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-heading">${positionValue.toFixed(2)}</div>
                        <div className="text-white/60 text-sm">Estimated Value</div>
                      </div>
                    </div>

                    {/* Position Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-white/60">Liquidity</div>
                        <div className="text-white font-medium">{formatTokenAmount(position.liquidity)}</div>
                      </div>
                      <div>
                        <div className="text-white/60">Lower Tick</div>
                        <div className="text-white font-medium">{position.tickLower}</div>
                      </div>
                      <div>
                        <div className="text-white/60">Upper Tick</div>
                        <div className="text-white font-medium">{position.tickUpper}</div>
                      </div>
                      <div>
                        <div className="text-white/60">Fees Earned</div>
                        <div className="text-white font-medium">
                          {formatTokenAmount(position.tokensOwed0 + position.tokensOwed1)}
                        </div>
                      </div>
                    </div>

                    {/* Position Actions */}
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => collectFees({
                          tokenId: position.tokenId,
                          recipient: address!,
                          amount0Max: BigInt('340282366920938463463374607431768211455'),
                          amount1Max: BigInt('340282366920938463463374607431768211455')
                        })}
                        disabled={isCollecting}
                        size="sm"
                        className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/20"
                      >
                        {isCollecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                        Collect Fees
                      </Button>
                      
                      <Button
                        onClick={() => approveNFT({ 
                          tokenId: position.tokenId, 
                          spender: UNISWAP_V3_CONTRACTS.V3_STAKER 
                        })}
                        disabled={isApprovingNFT}
                        size="sm"
                        variant="outline"
                        className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                      >
                        {isApprovingNFT ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve for Staking
                      </Button>

                      <Button
                        onClick={() => window.open(`https://app.uniswap.org/#/pool/${position.tokenId}`, '_blank')}
                        size="sm"
                        variant="ghost"
                        className="text-white/60 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View on Uniswap
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {isConnected && (
        <Card className="cluely-card rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-white font-heading">
              <Settings className="h-5 w-5 text-emerald-400" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Token Approvals */}
              <div className="space-y-3">
                <Label className="text-white font-heading text-sm">Token Approvals</Label>
                <div className="space-y-2">
                  <Button
                    onClick={() => approveToken({ 
                      tokenAddress: TOKENS.KILT, 
                      amount: BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935') 
                    })}
                    disabled={isApproving}
                    className="w-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/20"
                  >
                    {isApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Approve KILT
                  </Button>
                  
                  <Button
                    onClick={() => approveToken({ 
                      tokenAddress: TOKENS.WETH, 
                      amount: BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935') 
                    })}
                    disabled={isApproving}
                    className="w-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/20"
                  >
                    {isApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Approve WETH
                  </Button>
                </div>
              </div>

              {/* NFT Approvals */}
              <div className="space-y-3">
                <Label className="text-white font-heading text-sm">NFT Permissions</Label>
                <div className="space-y-2">
                  <Button
                    onClick={() => setApprovalForAll({ 
                      operator: UNISWAP_V3_CONTRACTS.V3_STAKER, 
                      approved: true 
                    })}
                    disabled={isApproving}
                    className="w-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/20"
                  >
                    {isApproving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Approve All for Staking
                  </Button>
                  
                  <div className="text-xs text-white/60">
                    This allows the staking contract to manage all your Uniswap V3 positions
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pool Status Alert */}
      {!poolExists && (
        <Card className="cluely-card border-amber-500/20 bg-amber-500/10 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-amber-400" />
              <div>
                <div className="text-amber-300 font-medium">KILT/ETH Pool Not Available</div>
                <div className="text-amber-200/80 text-sm">
                  The KILT/ETH Uniswap V3 pool has not been deployed yet. Once available, you'll be able to provide liquidity and earn rewards.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="cluely-card rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-white/60" />
              <span className="text-white/60">Loading Uniswap V3 data...</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}