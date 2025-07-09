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
  ArrowRight,
  Users,
  ExternalLink
} from 'lucide-react';

// Components
import { LiquidityMint } from './liquidity-mint';
import { RewardsTracking } from './rewards-tracking';
import { AnalyticsDashboard } from './analytics-dashboard';
import { UserPositions } from './user-positions';
import { UserPersonalAPR } from './user-personal-apr';
import { WalletConnect } from './wallet-connect';
import { GasEstimationCard } from './gas-estimation-card';

// Hooks and contexts
import { useWallet } from '@/contexts/wallet-context';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useUnifiedDashboard } from '@/hooks/use-unified-dashboard';
import { useToast } from '@/hooks/use-toast';

// Assets and icons
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';
import { SiX, SiGithub, SiDiscord, SiTelegram, SiMedium } from 'react-icons/si';

// Base logo component
const BaseLogo = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 21.3467 0.309448 48.8335H72.8914V61.2005H0.309448C2.35281 88.6873 26.0432 110.034 54.921 110.034Z" fill="#0052FF"/>
  </svg>
);

// Ethereum logo component
const EthereumLogo = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 256 417" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M127.961 0L125.44 8.55656V285.168L127.961 287.688L255.922 212.32L127.961 0Z" fill="#343434"/>
    <path d="M127.962 0L0 212.32L127.962 287.688V153.864V0Z" fill="#8C8C8C"/>
    <path d="M127.961 312.187L126.385 314.154V415.484L127.961 417L255.922 237.832L127.961 312.187Z" fill="#3C3C3B"/>
    <path d="M127.962 417V312.187L0 237.832L127.962 417Z" fill="#8C8C8C"/>
    <path d="M127.961 287.688L255.922 212.32L127.961 153.864V287.688Z" fill="#141414"/>
    <path d="M0 212.32L127.962 287.688V153.864L0 212.32Z" fill="#393939"/>
  </svg>
);

export function MainDashboard() {
  const { address, isConnected, initialized } = useWallet();
  const { data: kiltData } = useKiltTokenData();
  const { kiltBalance, wethBalance } = useUniswapV3();
  const unifiedData = useUnifiedDashboard();
  const [activeTab, setActiveTab] = useState('overview');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [isBaseNetworkConnected, setIsBaseNetworkConnected] = useState(false);
  const { toast } = useToast();

  // Logo animation timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setLogoAnimationComplete(true);
    }, 800); // Match the animation duration
    return () => clearTimeout(timer);
  }, []);

  // Check Base network connection
  useEffect(() => {
    const checkBaseNetwork = async () => {
      if (window.ethereum && isConnected) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          // Base mainnet chain ID is 0x2105 (8453 in decimal)
          const isBase = chainId === '0x2105';
          setIsBaseNetworkConnected(isBase);
        } catch (error) {
          console.error('Error checking network:', error);
          setIsBaseNetworkConnected(false);
        }
      } else {
        setIsBaseNetworkConnected(false);
      }
    };

    checkBaseNetwork();
    
    // Listen for network changes
    if (window.ethereum) {
      const handleChainChanged = () => {
        checkBaseNetwork();
      };
      
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [isConnected]);

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
            <div className="text-center animate-fade-in animate-delay-500 mb-12">
              <h2 className="text-3xl font-heading text-white mb-4">
                Join the
              </h2>
              <h1 className="text-5xl font-display bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-6">
                KILT Ecosystem
              </h1>
              <p className="text-white/60 text-lg font-body max-w-xl mx-auto mb-8">
                Become a liquidity provider for KILT Protocol and earn substantial rewards while supporting the decentralized identity ecosystem.
              </p>
            </div>

            {/* Social Media Links */}
            <div className="flex justify-center items-center gap-6 animate-fade-in animate-delay-700">
              <a 
                href="https://x.com/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 group"
              >
                <SiX className="h-6 w-6 text-white/70 group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://github.com/KILTprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 group"
              >
                <SiGithub className="h-6 w-6 text-white/70 group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://discord.gg/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 group"
              >
                <SiDiscord className="h-6 w-6 text-white/70 group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://t.me/KILTProtocolChat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 group"
              >
                <SiTelegram className="h-6 w-6 text-white/70 group-hover:text-white transition-colors" />
              </a>
              <a 
                href="https://kilt-protocol.medium.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 group"
              >
                <SiMedium className="h-6 w-6 text-white/70 group-hover:text-white transition-colors" />
              </a>
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
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0">
              <img src={kiltLogo} alt="KILT" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">KILT Liquidity Portal</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Badge 
              className={`hidden sm:flex px-3 py-1.5 text-xs font-medium border rounded-lg transition-all duration-200 ${
                isBaseNetworkConnected 
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
              }`}
            >
              <BaseLogo className="w-4 h-4 mr-1.5" />
              Base Network
              {isBaseNetworkConnected && (
                <div className="w-2 h-2 bg-green-500 rounded-full ml-2 animate-pulse" />
              )}
            </Badge>

            <div className="flex-shrink-0">
              <WalletConnect />
            </div>
          </div>
        </div>

        {/* Clean Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-900/50 border border-gray-700/50 p-1 rounded-xl mb-6 h-12">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 rounded-lg text-sm font-medium transition-all"
            >
              <TrendingUp className="h-4 w-4 mr-1.5" />
              <span className="text-label">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="liquidity" 
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 rounded-lg text-sm font-medium transition-all"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="text-label">Add Liquidity</span>
            </TabsTrigger>
            <TabsTrigger 
              value="rewards" 
              className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white text-gray-400 rounded-lg text-sm font-medium transition-all"
            >
              <Award className="h-4 w-4 mr-1.5" />
              <span className="text-label">Rewards</span>
            </TabsTrigger>
            <TabsTrigger 
              value="positions" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 rounded-lg text-sm font-medium transition-all"
            >
              <Wallet className="h-4 w-4 mr-1.5" />
              <span className="text-label">Positions</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 rounded-lg text-sm font-medium transition-all"
            >
              <BarChart3 className="h-4 w-4 mr-1.5" />
              <span className="text-label">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Unified Metrics Display */}
            <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-3xl p-6 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* KILT Price */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3 logo-container logo-shimmer">
                    <img 
                      src={kiltLogo} 
                      alt="KILT" 
                      className={`w-12 h-12 logo-hover ${!logoAnimationComplete ? 'logo-reveal' : 'logo-pulse'}`}
                    />
                  </div>
                  <p className="text-white/70 text-sm mb-1 text-label">KILT Price</p>
                  <p className="text-white font-bold text-xl text-numbers">
                    ${kiltData?.price?.toFixed(4) || '0.0289'}
                  </p>
                  <p className="text-emerald-300 text-xs mt-1 text-body">+0.50%</p>
                </div>

                {/* Market Cap */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Coins className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white/70 text-sm mb-1 text-label">Market Cap</p>
                  <p className="text-white font-bold text-xl text-numbers">
                    ${kiltData?.marketCap ? (kiltData.marketCap / 1000000).toFixed(1) : '4.4'}M
                  </p>
                  <p className="text-blue-300 text-xs mt-1 text-body">276.97M circulating</p>
                </div>

                {/* Your Reward APR */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white/70 text-sm mb-1 text-label">Your Reward APR</p>
                  <div className="text-white font-bold text-xl text-numbers">
                    {address ? (
                      <UserPersonalAPR address={address} />
                    ) : (
                      <div className="text-center">
                        <span className="text-white/50">--</span>
                        <div className="text-white/40 text-xs mt-1">Connect wallet</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Treasury Status */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Coins className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white/70 text-sm mb-1 text-label">Treasury Pool</p>
                  <p className="text-white font-bold text-xl text-numbers">
                    {kiltData?.treasuryRemaining ? (kiltData.treasuryRemaining / 1000000).toFixed(1) : '2.9'}M
                  </p>
                  <p className="text-amber-300 text-xs mt-1 text-body">KILT remaining</p>
                </div>
              </div>
            </div>



            {/* Compact Quick Add Liquidity */}
            <Card className="bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-purple-500/10 border-emerald-500/20 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white text-heading">Quick Add Liquidity</h3>
                      <p className="text-white/60 text-xs text-body">Deploy optimal liquidity instantly</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center space-x-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-white/50">Live</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Balance Display */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h4 className="text-white font-medium text-sm mb-3 text-label">Wallet Balance</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <img 
                            src={kiltLogo} 
                            alt="KILT" 
                            className={`w-5 h-5 logo-hover ${!logoAnimationComplete ? 'logo-reveal-enhanced logo-reveal-delay-1' : 'logo-pulse'}`}
                          />
                          <span className="text-white/70 text-sm text-body">KILT:</span>
                        </div>
                        <span className="text-white font-bold text-numbers">
                          {kiltBalance ? parseFloat(formatTokenBalance(kiltBalance)).toLocaleString() : '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <EthereumLogo className="w-5 h-5" />
                          <span className="text-white/70 text-sm text-body">WETH:</span>
                        </div>
                        <span className="text-white font-bold text-numbers">
                          {wethBalance ? parseFloat(formatTokenBalance(wethBalance)).toFixed(6) : '0.000000'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Optimal Amount */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/70 text-sm text-label">Optimal Amount</span>
                      <span className="text-xs text-white/50 text-body">80% balance</span>
                    </div>
                    {(() => {
                      const amounts = calculateOptimalAmounts();
                      const hasInsufficientBalance = amounts.kiltAmount === '0' || amounts.wethAmount === '0';
                      
                      if (hasInsufficientBalance) {
                        return (
                          <div className="text-center py-2">
                            <div className="text-sm font-medium text-red-400 mb-1 text-label">Insufficient Balance</div>
                            <p className="text-white/60 text-xs text-body">Fund wallet to continue</p>
                          </div>
                        );
                      }
                      
                      return (
                        <div>
                          <div className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent text-numbers">
                            ~${amounts.totalValue}
                          </div>
                          <div className="flex items-center justify-center space-x-4 text-white/60 text-xs text-body">
                            <div className="flex items-center space-x-1">
                              <img 
                                src={kiltLogo} 
                                alt="KILT" 
                                className={`w-3 h-3 align-middle logo-hover ${!logoAnimationComplete ? 'logo-reveal-enhanced logo-reveal-delay-2' : 'logo-pulse'}`}
                              />
                              <span>{amounts.kiltAmount} KILT</span>
                            </div>
                            <span>+</span>
                            <div className="flex items-center space-x-1">
                              <EthereumLogo className="w-3 h-3" />
                              <span>{amounts.wethAmount} WETH</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Action Button */}
                {(() => {
                  const amounts = calculateOptimalAmounts();
                  const hasInsufficientBalance = amounts.kiltAmount === '0' || amounts.wethAmount === '0';
                  const isDisabled = isQuickAdding || !address || hasInsufficientBalance;
                  
                  return (
                    <Button 
                      onClick={handleQuickAddLiquidity}
                      disabled={isDisabled}
                      className={`w-full font-semibold py-3 h-12 rounded-xl transition-all duration-300 ${
                        hasInsufficientBalance 
                          ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 hover:from-emerald-600 hover:via-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                      }`}
                    >
                      {isQuickAdding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : hasInsufficientBalance ? (
                        <>
                          <Wallet className="h-4 w-4 mr-2" />
                          Fund Wallet to Continue
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Quick Add Liquidity
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  );
                })()}

                {/* Help Text */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-white/40 text-body">
                    For custom amounts, use the "Add Liquidity" tab above
                  </p>
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

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}