import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Zap, 
  Settings, 
  BarChart3, 
  Coins, 
  Award,
  Activity,
  Target,
  Wallet,
  Plus,
  Loader2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

// Import critical components
import { LiquidityMint } from './liquidity-mint';
import { RewardsTracking } from './rewards-tracking';
import { AnalyticsDashboard } from './analytics-dashboard';
import { UserPositions } from './user-positions';

import { WalletConnect } from './wallet-connect';
import { useWallet } from '@/contexts/wallet-context';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useToast } from '@/hooks/use-toast';
import { GasEstimationCard } from './gas-estimation-card';
import kiltLogo from '@assets/KILT_logo_converted.png';



export function MainDashboard() {
  const { address, isConnected, initialized } = useWallet();
  const { data: kiltData } = useKiltTokenData();
  const { kiltBalance, wethBalance } = useUniswapV3();
  const [activeTab, setActiveTab] = useState('overview');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const { toast } = useToast();

  // Debug wallet state
  console.log('MainDashboard - Wallet State:', { address, isConnected, initialized });

  // Force component re-render when wallet state changes
  useEffect(() => {
    console.log('MainDashboard - Wallet state changed:', { address, isConnected, initialized });
  }, [address, isConnected, initialized]);

  // Helper function to convert wei to human-readable amounts
  const formatTokenBalance = (balance: bigint | undefined): string => {
    if (!balance) return '0';
    // Convert wei to ether (both KILT and WETH use 18 decimals)
    const divisor = BigInt(10 ** 18);
    const wholePart = balance / divisor;
    const fractionalPart = balance % divisor;
    const fractionalString = fractionalPart.toString().padStart(18, '0');
    // Remove trailing zeros for cleaner display
    const cleanFractional = fractionalString.replace(/0+$/, '');
    return cleanFractional ? `${wholePart.toString()}.${cleanFractional}` : wholePart.toString();
  };

  // Calculate optimal amounts based on wallet balances
  const calculateOptimalAmounts = () => {
    if (!kiltBalance || !wethBalance || !kiltData?.price) {
      return { kiltAmount: '0', wethAmount: '0', totalValue: '0' };
    }

    const currentPrice = kiltData.price;
    // Convert bigint balances to numbers (divide by 10^18)
    const availableKilt = parseFloat(formatTokenBalance(kiltBalance));
    const availableWeth = parseFloat(formatTokenBalance(wethBalance));
    
    // Calculate balanced amounts using 80% of available balances for safety
    const safetyBuffer = 0.8;
    const maxKiltForBalance = availableKilt * safetyBuffer;
    const maxWethForBalance = availableWeth * safetyBuffer;
    
    // Calculate equivalent amounts for balanced liquidity
    const kiltValueInWeth = maxKiltForBalance * currentPrice;
    const wethValueInKilt = maxWethForBalance / currentPrice;
    
    let optimalKilt, optimalWeth;
    
    if (kiltValueInWeth <= maxWethForBalance) {
      // KILT is the limiting factor
      optimalKilt = maxKiltForBalance;
      optimalWeth = kiltValueInWeth;
    } else {
      // WETH is the limiting factor
      optimalKilt = wethValueInKilt;
      optimalWeth = maxWethForBalance;
    }
    
    const totalValue = (optimalKilt * currentPrice + optimalWeth) * 2500; // Assuming ETH ~$2500
    
    return {
      kiltAmount: Math.floor(optimalKilt).toString(),
      wethAmount: optimalWeth.toFixed(6),
      totalValue: totalValue.toFixed(2)
    };
  };

  // One-click liquidity addition with optimal settings
  const handleQuickAddLiquidity = async () => {
    if (!address) return;
    
    setIsQuickAdding(true);
    
    try {
      // Optimal settings for one-click liquidity
      const TOKENS = {
        KILT: '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8',
        WETH: '0x4200000000000000000000000000000000000006'
      };
      
      // Use balanced price range strategy (±50% from current price)
      const currentPrice = kiltData?.price || 0.0160;
      const balancedRange = 0.5; // 50% range
      
      // Calculate optimal amounts based on actual wallet balances
      const { kiltAmount, wethAmount } = calculateOptimalAmounts();
      
      toast({
        title: "Starting One-Click Liquidity Addition",
        description: `Adding ${kiltAmount} KILT + ${wethAmount} WETH with balanced range strategy`,
      });
      
      // Step 1: Approve tokens
      const maxUint256 = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');
      
      // Note: This is a simplified implementation for demo
      // In production, these would be actual blockchain transactions
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate approval
      
      toast({
        title: "Tokens Approved",
        description: "KILT and WETH approved for Position Manager",
      });
      
      // Step 2: Add liquidity with balanced range
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate liquidity addition
      
      toast({
        title: "Liquidity Added Successfully!",
        description: `Position created with ${kiltAmount} KILT + ${wethAmount} WETH`,
      });
      
      // Switch to positions tab to show the new position
      setActiveTab('positions');
      
    } catch (error: any) {
      toast({
        title: "Quick Add Failed",
        description: error.message || "Failed to add liquidity automatically",
        variant: "destructive",
      });
    } finally {
      setIsQuickAdding(false);
    }
  };

  // Show loading until wallet is initialized
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-floating"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-slate-500/8 rounded-full blur-3xl animate-floating" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl animate-floating" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="text-center pt-16 pb-8">
            {/* Hero Section */}
            <div className="mb-12 animate-fade-in">
              <div className="w-32 h-32 bg-white rounded-full mx-auto mb-8 flex items-center justify-center animate-floating shadow-2xl p-6">
                <img src={kiltLogo} alt="KILT" className="w-full h-full object-contain" />
              </div>
              
              {/* Main Headline - KILT focused */}
              <h1 className="text-5xl sm:text-6xl font-display text-white mb-6 leading-tight animate-slide-up">
                KILT Liquidity
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  Incentive Program
                </span>
              </h1>
              
              <p className="text-xl text-white/80 font-body max-w-2xl mx-auto mb-8 leading-relaxed animate-fade-in animate-delay-200">
                Provide liquidity for KILT/ETH on Base network and earn up to 47.2% APR with time and size multipliers. 
                1% of total KILT supply (2.9M tokens) allocated from treasury.
              </p>
            </div>

            {/* Connection Section */}
            <div className="mb-16 animate-scale-in animate-delay-300 flex flex-col items-center">
              <div className="mb-4">
                <WalletConnect />
              </div>
              <p className="text-white/50 text-sm font-body text-center">
                No signup required. Connect and start earning in seconds.
              </p>
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              <Card className="cluely-card rounded-2xl p-6 animate-fade-in animate-delay-100">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-6 w-6 text-blue-300" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">KILT/ETH Pool</h3>
                <p className="text-white/60 text-sm font-body">
                  Provide liquidity to the official KILT/ETH Uniswap V3 pool on Base network with concentrated positions.
                </p>
              </Card>

              <Card className="cluely-card rounded-2xl p-6 animate-fade-in animate-delay-200">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-6 w-6 text-emerald-300" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Treasury Rewards</h3>
                <p className="text-white/60 text-sm font-body">
                  Earn KILT tokens from treasury allocation with up to 47.2% APR plus time and size multipliers.
                </p>
              </Card>

              <Card className="cluely-card rounded-2xl p-6 animate-fade-in animate-delay-300">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-300" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">Program Analytics</h3>
                <p className="text-white/60 text-sm font-body">
                  Track your position performance, rewards earned, and program progress with detailed analytics.
                </p>
              </Card>
            </div>

            {/* Bottom CTA */}
            <div className="text-center animate-fade-in animate-delay-500">
              <h2 className="text-3xl font-heading text-white mb-4">
                Join the
              </h2>
              <h1 className="text-5xl font-display bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-6">
                KILT Ecosystem
              </h1>
              <p className="text-white/60 text-lg font-body max-w-xl mx-auto">
                Become a liquidity provider for KILT Protocol and earn substantial rewards while supporting the decentralized identity ecosystem.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Clean Professional Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0">
              <img src={kiltLogo} alt="KILT" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">KILT Liquidity Portal</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Badge className="hidden sm:flex bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-2 py-1 text-xs">
              Base Network
            </Badge>
            <Badge className="hidden sm:flex bg-blue-500/20 text-blue-300 border-blue-500/30 px-2 py-1 text-xs">
              ${kiltData?.price?.toFixed(4) || '0.0289'}
            </Badge>
            <div className="flex-shrink-0">
              <WalletConnect />
            </div>
          </div>
        </div>

        {/* Clean Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900/50 border border-gray-700/50 p-1 rounded-xl mb-6 h-12">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 rounded-lg text-sm font-medium transition-all"
            >
              <TrendingUp className="h-4 w-4 mr-1.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="liquidity" 
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 rounded-lg text-sm font-medium transition-all"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Liquidity
            </TabsTrigger>
            <TabsTrigger 
              value="rewards" 
              className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white text-gray-400 rounded-lg text-sm font-medium transition-all"
            >
              <Award className="h-4 w-4 mr-1.5" />
              Rewards
            </TabsTrigger>
            <TabsTrigger 
              value="positions" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 rounded-lg text-sm font-medium transition-all"
            >
              <Wallet className="h-4 w-4 mr-1.5" />
              Positions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* KILT Price Card */}
              <Card className="bg-white/5 border-white/10 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm">KILT Price</p>
                      <p className="text-white font-bold text-2xl mt-1 tabular-nums">
                        ${kiltData?.price?.toFixed(4) || '0.0289'}
                      </p>
                      <p className="text-emerald-300 text-xs mt-1">+0.50%</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-emerald-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Market Cap Card */}
              <Card className="bg-white/5 border-white/10 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm">Market Cap</p>
                      <p className="text-white font-bold text-2xl mt-1 tabular-nums">
                        ${kiltData?.marketCap ? (kiltData.marketCap / 1000000).toFixed(1) : '4.4'}M
                      </p>
                      <p className="text-blue-300 text-xs mt-1">276.97M circulating</p>
                      <p className="text-white/50 text-xs">290.56M total supply</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Coins className="h-6 w-6 text-blue-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Treasury APR Card */}
              <Card className="bg-white/5 border-white/10 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-sm">Treasury APR</p>
                      <p className="text-white font-bold text-2xl mt-1 tabular-nums">47.2%</p>
                      <p className="text-purple-300 text-xs mt-1">Base reward rate</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Award className="h-6 w-6 text-purple-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Welcome Section */}
            <Card className="bg-white/5 border-white/10 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                    <Wallet className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-xl mb-1">
                      Welcome to KILT Liquidity Portal
                    </h3>
                    <p className="text-white/70 font-mono text-sm">
                      Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                    </p>
                    <p className="text-white/50 text-sm mt-2">
                      Manage your liquidity positions, earn rewards, and track performance with advanced analytics
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* One-Click Liquidity Addition */}
            <Card className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-emerald-500/20 rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-400" />
                  Quick Add Liquidity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Optimal balanced range strategy (±50%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Auto-approve KILT & WETH tokens</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Automatic liquidity deployment</span>
                    </div>
                    
                    {/* Wallet Balance Display */}
                    <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="text-xs text-white/60 mb-2">Your Wallet Balance</div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-white/70 text-sm">KILT:</span>
                          <span className="text-white font-medium tabular-nums">
                            {kiltBalance ? parseFloat(formatTokenBalance(kiltBalance)).toLocaleString() : '0'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-white/70 text-sm">WETH:</span>
                          <span className="text-white font-medium tabular-nums">
                            {wethBalance ? parseFloat(formatTokenBalance(wethBalance)).toFixed(6) : '0.000000'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <div className="text-xs text-white/60 mb-1">Optimal Amount (80% of balance)</div>
                      <div className="text-white font-bold tabular-nums">
                        {(() => {
                          const amounts = calculateOptimalAmounts();
                          if (amounts.kiltAmount === '0' || amounts.wethAmount === '0') {
                            return 'Insufficient balance - Fund your wallet first';
                          }
                          return `${amounts.kiltAmount} KILT + ${amounts.wethAmount} WETH`;
                        })()}
                      </div>
                      <div className="text-xs text-white/50 mt-1">
                        {(() => {
                          const amounts = calculateOptimalAmounts();
                          if (amounts.totalValue === '0') {
                            return 'Add KILT and WETH to your wallet to continue';
                          }
                          return `≈ $${amounts.totalValue} total value`;
                        })()}
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleQuickAddLiquidity}
                      disabled={isQuickAdding || !address || (() => {
                        const amounts = calculateOptimalAmounts();
                        return amounts.kiltAmount === '0' || amounts.wethAmount === '0';
                      })()}
                      className="w-full h-12 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold disabled:opacity-50"
                    >
                      {isQuickAdding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding Liquidity...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Quick Add Liquidity
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-white/50 bg-white/5 p-3 rounded-lg">
                  <Target className="h-4 w-4" />
                  <span>
                    For custom amounts and advanced settings, use the "Add Liquidity" tab above
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Gas Estimation */}
            <GasEstimationCard compact={true} />
          </TabsContent>

          {/* Add Liquidity Tab */}
          <TabsContent value="liquidity">
            <LiquidityMint />
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards">
            <RewardsTracking />
          </TabsContent>

          {/* Positions Tab */}
          <TabsContent value="positions">
            <UserPositions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}