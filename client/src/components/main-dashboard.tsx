import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  TrendingUp, 
  Zap, 
  Coins, 
  Award,
  Wallet,
  Plus,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  BarChart3
} from 'lucide-react';

// Lazy-loaded components for faster initial load
import { lazy, Suspense, useMemo } from 'react';

// Hooks and contexts
import { useWallet } from '@/contexts/wallet-context';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useUnifiedDashboard } from '@/hooks/use-unified-dashboard';
import { useAppSession } from '@/hooks/use-app-session';
// Removed deprecated hooks - consolidated into unified dashboard
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Lightweight components
import { UserPersonalAPR } from './user-personal-apr';
import { WalletConnect } from './wallet-connect';
// Removed gas estimation card - consolidated into main interface
import { PositionRegistration } from './position-registration';
import { LoadingScreen } from './loading-screen';

// Lazy load heavy components
const LiquidityMint = lazy(() => import('./liquidity-mint').then(m => ({ default: m.LiquidityMint })));
const RewardsTracking = lazy(() => import('./rewards-tracking').then(m => ({ default: m.RewardsTracking })));
const UserPositions = lazy(() => import('./user-positions').then(m => ({ default: m.UserPositions })));

// Removed tab loading spinner - using built-in loading states

// Optimized loading component for heavy tabs
const OptimizedLoadingFallback = ({ height = "400px" }) => (
  <div className="w-full flex items-center justify-center animate-pulse" style={{ height }}>
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <div className="text-white/60 text-sm">Loading...</div>
    </div>
  </div>
);

// Assets and icons
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';
import { SiX, SiGithub, SiDiscord, SiTelegram, SiMedium } from 'react-icons/si';

// Services
import { LiquidityService } from '@/services/liquidity-service';

// Universal logo components
import { TokenLogo, KiltLogo, EthLogo } from '@/components/ui/token-logo';

// Base logo component
const BaseLogo = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 21.3467 0.309448 48.8335H72.8914V61.2005H0.309448C2.35281 88.6873 26.0432 110.034 54.921 110.034Z" fill="#0052FF"/>
  </svg>
);

export function MainDashboard() {
  const { address, isConnected, initialized } = useWallet();
  const { data: kiltData } = useKiltTokenData();
  const unifiedData = useUnifiedDashboard();
  const appSession = useAppSession();
  
  // Use balance data from unified dashboard hook
  const { 
    kiltBalance, 
    wethBalance, 
    ethBalance,
    formatTokenAmount
  } = unifiedData;
  

  // Removed deprecated hooks - using unified dashboard data instead
  const [activeTab, setActiveTab] = useState('overview');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [isBaseNetworkConnected, setIsBaseNetworkConnected] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState(80);
  const { toast } = useToast();

  // Navigation function for components to use
  const navigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  // Expose navigation function globally for position registration component
  useEffect(() => {
    (window as unknown as { navigateToTab?: (tab: string) => void }).navigateToTab = navigateToTab;
    return () => {
      delete (window as unknown as { navigateToTab?: (tab: string) => void }).navigateToTab;
    };
  }, []);

  // Optimize effects - combine network check and animation
  useEffect(() => {
    // Logo animation timing
    const logoTimer = setTimeout(() => {
      setLogoAnimationComplete(true);
    }, 800);

    // Check Base network connection
    const checkBaseNetwork = async () => {
      const ethereum = (window as unknown as { ethereum?: { request: (params: { method: string }) => Promise<string> } }).ethereum;
      if (ethereum && isConnected) {
        try {
          const chainId = await ethereum.request({ method: 'eth_chainId' });
          const isBase = chainId === '0x2105';
          setIsBaseNetworkConnected(isBase);
        } catch (error: unknown) {
          setIsBaseNetworkConnected(false);
        }
      } else {
        setIsBaseNetworkConnected(false);
      }
    };

    checkBaseNetwork();
    
    // Listen for network changes
    const ethereum = (window as unknown as { ethereum?: { on: (event: string, handler: () => void) => void; removeListener: (event: string, handler: () => void) => void } }).ethereum;
    if (ethereum) {
      const handleChainChanged = () => checkBaseNetwork();
      ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        clearTimeout(logoTimer);
        ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
    
    return () => clearTimeout(logoTimer);
  }, [isConnected]);

  // Helper function to convert wei to human-readable amounts
  const formatTokenBalance = (balance: string | bigint | undefined): string => {
    if (!balance) return '0';
    try {
      // Convert to string if it's a bigint or number
      let balanceStr: string;
      if (typeof balance === 'bigint') {
        balanceStr = balance.toString();
      } else if (typeof balance === 'number') {
        balanceStr = balance.toString();
      } else {
        balanceStr = balance;
      }
      
      // Convert wei to ether (both KILT and WETH use 18 decimals)
      // Use BigInt division to avoid precision issues
      const balanceBigInt = BigInt(balanceStr);
      const divisor = BigInt(1e18);
      const wholePart = balanceBigInt / divisor;
      const fractionalPart = balanceBigInt % divisor;
      
      // Convert fractional part to decimal
      const fractionalStr = fractionalPart.toString().padStart(18, '0');
      const trimmedFractional = fractionalStr.slice(0, 4);
      
      return `${wholePart.toString()}.${trimmedFractional}`;
    } catch {
      return '0.0000';
    }
  };

  // Calculate optimal amounts using universal LiquidityService
  const calculateOptimalAmounts = (percentage = selectedPercentage) => {
    return LiquidityService.calculateOptimalAmounts(
      kiltBalance,
      wethBalance,
      ethBalance,
      kiltData?.price || 0.0160,
      percentage,
      formatTokenBalance
    );
  };

  // One-click liquidity addition using universal LiquidityService
  const handleQuickAddLiquidity = async () => {
    if (!address) return;
    
    setIsQuickAdding(true);
    
    try {
      // Calculate optimal amounts based on selected percentage
      const { kiltAmount, ethAmount, useNativeEth } = calculateOptimalAmounts(selectedPercentage);
      
      // Prepare liquidity parameters
      const liquidityParams = {
        kiltAmount,
        ethAmount,
        useNativeEth,
        strategy: 'balanced' as const,
        slippage: 5
      };
      
      toast({
        title: "Starting Quick Add Liquidity",
        description: `Adding ${kiltAmount} KILT + ${ethAmount} ${useNativeEth ? 'ETH' : 'WETH'} (${selectedPercentage}% of balance)`,
      });
      
      // Execute liquidity addition using universal service
      const success = await LiquidityService.executeQuickAddLiquidity(
        liquidityParams,
        mintPosition,
        approveToken,
        parseTokenAmount,
        toast,
        appSession.sessionId,
        appSession.createAppSession,
        appSession.recordAppTransaction
      );
      
      if (success) {
        // Switch to positions tab to show the new position
        setActiveTab('positions');
      }
      
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

  // Render loading state or disconnected state after all hooks are called
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
        {/* Clean Changing Gradient Background */}
        <div className="absolute inset-0 -z-10">
          <div className="gradient-background"></div>
        </div>
        <div className="max-w-5xl mx-auto">
          <div className="text-center pt-16 pb-8">
            {/* Hero Section */}
            <div className="mb-12">
              <div className="relative w-32 h-32 mx-auto mb-8">
                {/* Matrix Green Glow Container */}
                <div className="absolute inset-0 bg-matrix-green/20 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute inset-2 bg-black rounded-full flex items-center justify-center shadow-2xl border-2 border-matrix-green/40">
                  {/* KILT Logo with Matrix Green Border */}
                  <img 
                    src={kiltLogo} 
                    alt="KILT" 
                    className="w-20 h-20 object-contain drop-shadow-lg" 
                  />
                </div>
              </div>
              
              {/* Main Headline - Clean Typography */}
              <h1 className="text-6xl sm:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                <span className="block text-white">KILT Liquidity</span>
                <span className="block text-white/90 text-5xl sm:text-6xl font-normal">
                  Incentive Program
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-white/90 font-medium max-w-4xl mx-auto mb-8 leading-relaxed">
                Earn <span className="text-matrix-green font-bold">up to {unifiedData.maxAPRData?.aprRange || '67% - 89%'} APR</span> from the <span className="text-pink-400 font-bold">500K KILT treasury</span> by providing liquidity to Uniswap V3 pools on Base network.
              </p>
            </div>

            {/* Connection Section */}
            <div className="mb-16 flex flex-col items-center">
              <div className="mb-4">
                <WalletConnect />
              </div>
              <p className="text-white/80 text-lg font-medium text-center">
                No signup required. Connect and start earning in seconds.
              </p>
            </div>

            {/* Clean Feature Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {/* KILT/ETH Pool */}
              <div className="group relative animate-fade-in animate-delay-100">
                <div className="relative bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-4 transition-all duration-300 hover:border-matrix-green/40 h-[160px] flex flex-col">
                  <div className="flex items-center mb-3">
                    <TrendingUp className="h-5 w-5 text-matrix-green mr-2" />
                    <h3 className="text-white font-semibold text-base">KILT/ETH Pool</h3>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Deploy capital efficiently with concentrated liquidity positions and advanced range strategies.
                    </p>
                  </div>
                </div>
              </div>

              {/* Treasury Rewards */}
              <div className="group relative animate-fade-in animate-delay-200">
                <div className="relative bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-4 transition-all duration-300 hover:border-pink-500/40 h-[160px] flex flex-col">
                  <div className="flex items-center mb-3">
                    <Award className="h-5 w-5 text-pink-400 mr-2" />
                    <h3 className="text-white font-semibold text-base">Treasury Rewards</h3>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Receive attractive rewards from <span className="text-pink-400">500K KILT</span> treasury allocation with secure smart contract distribution.
                    </p>
                  </div>
                </div>
              </div>

              {/* Program Analytics */}
              <div className="group relative animate-fade-in animate-delay-300">
                <div className="relative bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-4 transition-all duration-300 hover:border-matrix-green/40 h-[160px] flex flex-col">
                  <div className="flex items-center mb-3">
                    <BarChart3 className="h-5 w-5 text-matrix-green mr-2" />
                    <h3 className="text-white font-semibold text-base">Program Analytics</h3>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Track your position performance, rewards earned, and program progress with detailed analytics.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clean Bottom CTA */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Join the KILT Ecosystem
              </h2>
              <p className="text-white/80 text-lg font-medium max-w-2xl mx-auto mb-6 leading-relaxed">
                Connect with the KILT Protocol community and stay updated on the latest developments.
              </p>
            </div>

            {/* Clean Social Media Links */}
            <div className="flex justify-center items-center gap-3">
              <a 
                href="https://x.com/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/40 hover:bg-matrix-green/10 border border-gray-800 hover:border-matrix-green/30 rounded-lg transition-all duration-300 backdrop-blur-sm"
              >
                <SiX className="h-5 w-5 text-white/80 hover:text-matrix-green transition-colors duration-300" />
              </a>
              <a 
                href="https://github.com/KILTprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/40 hover:bg-matrix-green/10 border border-gray-800 hover:border-matrix-green/30 rounded-lg transition-all duration-300 backdrop-blur-sm"
              >
                <SiGithub className="h-5 w-5 text-white/80 hover:text-matrix-green transition-colors duration-300" />
              </a>
              <a 
                href="https://discord.gg/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/40 hover:bg-matrix-green/10 border border-gray-800 hover:border-matrix-green/30 rounded-lg transition-all duration-300 backdrop-blur-sm"
              >
                <SiDiscord className="h-5 w-5 text-white/80 hover:text-matrix-green transition-colors duration-300" />
              </a>
              <a 
                href="https://t.me/KILTProtocolChat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/40 hover:bg-matrix-green/10 border border-gray-800 hover:border-matrix-green/30 rounded-lg transition-all duration-300 backdrop-blur-sm"
              >
                <SiTelegram className="h-5 w-5 text-white/80 hover:text-matrix-green transition-colors duration-300" />
              </a>
              <a 
                href="https://kilt-protocol.medium.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/40 hover:bg-matrix-green/10 border border-gray-800 hover:border-matrix-green/30 rounded-lg transition-all duration-300 backdrop-blur-sm"
              >
                <SiMedium className="h-5 w-5 text-white/80 hover:text-matrix-green transition-colors duration-300" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative">
      {/* Clean Changing Gradient Background */}
      <div className="absolute inset-0 -z-10">
        <div className="gradient-background"></div>
      </div>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        {/* Clean Professional Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0">
              <img src={kiltLogo} alt="KILT" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate font-mono">KILT Liquidity Portal</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Badge 
              className={`hidden sm:flex px-3 py-1.5 text-xs font-medium border rounded-full transition-all duration-200 font-mono ${
                isConnected && isBaseNetworkConnected 
                  ? 'bg-pink-500/20 text-white border-pink-500/30' 
                  : 'bg-gray-500/20 text-white border-gray-500/30'
              }`}
            >
              <BaseLogo className="w-4 h-4 mr-1.5" />
              Base Network
              {isConnected && isBaseNetworkConnected && (
                <div className="w-2 h-2 bg-green-500 rounded-full ml-2" />
              )}
            </Badge>

            <div className="flex-shrink-0">
              <WalletConnect />
            </div>
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // Invalidate positions cache when switching to positions tab
          if (value === 'positions') {
            queryClient.invalidateQueries({ queryKey: ['wallet-positions'] });
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-slate-700/60 p-1 rounded-xl mb-6 h-12 gap-1 shadow-lg">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 text-white/70 hover:text-white rounded-lg text-sm font-medium transition-all duration-300 px-3 py-2 flex items-center justify-center min-w-0 hover:bg-white/10 hover:shadow-md"
            >
              <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-semibold truncate">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="liquidity" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 text-white/70 hover:text-white rounded-lg text-sm font-medium transition-all duration-300 px-3 py-2 flex items-center justify-center min-w-0 hover:bg-white/10 hover:shadow-md"
            >
              <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-semibold truncate">Add Liquidity</span>
            </TabsTrigger>
            <TabsTrigger 
              value="rewards" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/25 text-white/70 hover:text-white rounded-lg text-sm font-medium transition-all duration-300 px-3 py-2 flex items-center justify-center min-w-0 hover:bg-white/10 hover:shadow-md"
            >
              <Award className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-semibold truncate">Rewards</span>
            </TabsTrigger>
            <TabsTrigger 
              value="positions" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 text-white/70 hover:text-white rounded-lg text-sm font-medium transition-all duration-300 px-3 py-2 flex items-center justify-center min-w-0 hover:bg-white/10 hover:shadow-md"
            >
              <Wallet className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-semibold truncate">Active Position</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Streamlined Metrics Display */}
            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-3 mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* KILT Price */}
                <div className="text-center group hover:scale-105 transition-transform duration-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-matrix-green/20 to-matrix-green/30 rounded-lg flex items-center justify-center mx-auto mb-2 border border-matrix-green/40">
                    <img 
                      src={kiltLogo} 
                      alt="KILT" 
                      className="w-6 h-6"
                    />
                  </div>
                  <p className="text-white/90 text-sm mb-1 font-medium">KILT Price</p>
                  <p className="text-matrix-green font-bold text-lg font-mono">
                    ${kiltData?.price?.toFixed(4) || '0.0289'}
                  </p>
                  <p className="text-matrix-green/70 text-xs font-medium">+0.50%</p>
                </div>

                {/* Market Cap */}
                <div className="text-center group hover:scale-105 transition-transform duration-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-matrix-green/20 to-matrix-green/30 rounded-lg flex items-center justify-center mx-auto mb-2 border border-matrix-green/40">
                    <Coins className="h-5 w-5 text-matrix-green" />
                  </div>
                  <p className="text-white/90 text-sm mb-1 font-medium">Market Cap</p>
                  <p className="text-matrix-green font-bold text-lg font-mono">
                    ${kiltData?.marketCap ? (kiltData.marketCap / 1000000).toFixed(1) : '4.4'}M
                  </p>
                  <p className="text-white/60 text-xs font-medium">276.97M circulating</p>
                </div>

                {/* Your Reward APR */}
                <div className="text-center group hover:scale-105 transition-transform duration-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-matrix-green/20 to-matrix-green/30 rounded-lg flex items-center justify-center mx-auto mb-2 border border-matrix-green/40">
                    <Award className="h-5 w-5 text-matrix-green" />
                  </div>
                  <p className="text-white/90 text-sm mb-1 font-medium">Your Reward APR</p>
                  <div className="text-matrix-green font-bold text-lg font-mono">
                    {address ? (
                      <UserPersonalAPR address={address} />
                    ) : (
                      <div className="text-center">
                        <span className="text-white/50">--</span>
                        <div className="text-white/60 text-xs mt-1">Connect wallet</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Maximum APR */}
                <div className="text-center group hover:scale-105 transition-transform duration-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-matrix-green/20 to-matrix-green/30 rounded-lg flex items-center justify-center mx-auto mb-2 border border-matrix-green/40">
                    <TrendingUp className="h-5 w-5 text-matrix-green" />
                  </div>
                  <p className="text-white/90 text-sm mb-1 font-medium">Current APR</p>
                  <p className="text-matrix-green font-bold text-lg font-mono">
                    {unifiedData?.maxAPRData?.aprRange || '31%'}
                  </p>
                  <p className="text-matrix-green/70 text-xs font-medium">High yields available!</p>
                </div>
              </div>
            </div>

            {/* Two Column Layout - Mobile Responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Left Column - Position Registration */}
              <div className="h-full">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mb-3">
                  <Plus className="h-4 w-4 text-pink-400" />
                  Register Existing Positions
                </h2>
                <div className="h-[400px] sm:h-[440px] lg:h-[480px] flex flex-col">
                  <PositionRegistration />
                </div>
              </div>

              {/* Right Column - Quick Add Liquidity */}
              <div className="h-full">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-pink-400" />
                  Quick Add Liquidity
                </h2>
                <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg h-[400px] sm:h-[440px] lg:h-[480px] flex flex-col overflow-hidden">
                  <CardContent className="p-2 flex-1 flex flex-col overflow-hidden">
                    <div className="space-y-2 flex-1">
                      {/* Balance Display */}
                      <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-2">
                        <h4 className="text-white font-bold text-base mb-2">Wallet Balance</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {/* KILT Balance Card */}
                          <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-sm rounded-lg p-3 border border-pink-500/30">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full flex items-center justify-center mb-1 border border-pink-500/50">
                                <KiltLogo size="lg" showBackground={false} />
                              </div>
                              <span className="text-white text-sm font-medium">KILT</span>
                              <span className="text-matrix-green font-bold text-sm font-mono mt-0.5" style={{ textShadow: '0 0 10px rgba(0, 255, 0, 0.4)' }}>
                                {kiltBalance ? parseFloat(kiltBalance).toLocaleString() : '0'}
                              </span>
                            </div>
                          </div>
                          
                          {/* ETH Balance Card */}
                          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full flex items-center justify-center mb-1 border border-blue-500/50">
                                <EthLogo size="lg" showBackground={false} />
                              </div>
                              <span className="text-white text-sm font-medium">ETH</span>
                              <span className="text-matrix-green font-bold text-sm font-mono mt-0.5" style={{ textShadow: '0 0 10px rgba(0, 255, 0, 0.4)' }}>
                                {ethBalance ? parseFloat(ethBalance).toFixed(6) : '0.000000'}
                              </span>
                            </div>
                          </div>
                          
                          {/* WETH Balance Card */}
                          <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-sm rounded-lg p-3 border border-emerald-500/30">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-full flex items-center justify-center mb-1 border border-emerald-500/50">
                                <EthLogo size="lg" showBackground={false} />
                              </div>
                              <span className="text-white text-sm font-medium">WETH</span>
                              <span className="text-matrix-green font-bold text-sm font-mono mt-0.5" style={{ textShadow: '0 0 10px rgba(0, 255, 0, 0.4)' }}>
                                {wethBalance ? parseFloat(wethBalance).toFixed(6) : '0.000000'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Percentage Selector */}
                      <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70 text-sm font-medium">Balance Usage</span>
                          <span className="text-sm text-white/50">{selectedPercentage}% of wallet</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 mb-2">
                          {LiquidityService.getPercentageOptions().map(({ value, label }) => (
                            <Button
                              key={value}
                              variant={selectedPercentage === value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedPercentage(value)}
                              className={`text-xs py-1 px-1 h-6 transition-all duration-200 ${
                                selectedPercentage === value 
                                  ? 'bg-matrix-green hover:bg-matrix-green/80 text-black' 
                                  : 'hover:bg-matrix-green/10 hover:border-matrix-green/50'
                              }`}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                        
                        {/* Seek Bar Slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-white/60 text-xs">Precise Control</span>
                            <span className="text-white/40 text-xs">{selectedPercentage}%</span>
                          </div>
                          <Slider
                            value={[selectedPercentage]}
                            onValueChange={(value) => setSelectedPercentage(value[0])}
                            max={100}
                            min={0}
                            step={1}
                            className="w-full"
                          />
                        </div>
                      </div>

                      {/* Optimal Amount */}
                      <div className="theme-card p-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70 text-sm font-medium text-label">Liquidity Amount</span>
                          <span className="text-sm text-white/50 text-body">Balanced strategy</span>
                        </div>
                        {(() => {
                          const amounts = calculateOptimalAmounts();
                          const hasInsufficientBalance = parseFloat(amounts.kiltAmount) <= 0 || parseFloat(amounts.ethAmount) <= 0 || parseFloat(amounts.totalValue) < 10;
                          
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
                              <div className="text-2xl font-bold text-matrix-green text-numbers mb-2" style={{ textShadow: '0 0 20px rgba(0, 255, 0, 0.6)' }}>
                                ~${amounts.totalValue}
                              </div>
                              <div className="flex items-center justify-center space-x-4 text-white text-sm text-body">
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full flex items-center justify-center border border-pink-500/50">
                                    <KiltLogo size="sm" showBackground={false} />
                                  </div>
                                  <span className="font-medium text-matrix-green">{amounts.kiltAmount} KILT</span>
                                </div>
                                <span className="text-matrix-green text-lg">+</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full flex items-center justify-center border border-blue-500/50">
                                    <EthLogo size="sm" showBackground={false} />
                                  </div>
                                  <span className="font-medium text-matrix-green">{amounts.ethAmount} {amounts.useNativeEth ? 'ETH' : 'WETH'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Action Button and Help Text - Bottom of Card */}
                    <div className="space-y-1 mt-1 px-1">
                      {/* Action Button */}
                      {(() => {
                        const amounts = calculateOptimalAmounts();
                        const hasInsufficientBalance = parseFloat(amounts.kiltAmount) <= 0 || parseFloat(amounts.ethAmount) <= 0 || parseFloat(amounts.totalValue) < 10;
                        const isDisabled = isQuickAdding || !address || hasInsufficientBalance;
                        
                        return (
                          <Button 
                            onClick={handleQuickAddLiquidity}
                            disabled={isDisabled}
                            className={`w-full font-semibold py-1.5 h-8 rounded-lg transition-all duration-300 text-sm ${
                              hasInsufficientBalance 
                                ? 'theme-badge-danger cursor-not-allowed' 
                                : 'theme-button-primary'
                            }`}
                          >
                            {isQuickAdding ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Processing...
                              </>
                            ) : hasInsufficientBalance ? (
                              <>
                                <Wallet className="h-3 w-3 mr-1.5" />
                                Fund Wallet
                              </>
                            ) : (
                              <>
                                <Zap className="h-3 w-3 mr-1.5" />
                                Quick Add Liquidity
                                <ArrowRight className="h-3 w-3 ml-1.5" />
                              </>
                            )}
                          </Button>
                        );
                      })()}

                      
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Add Liquidity Tab */}
          <TabsContent value="liquidity">
            <Suspense fallback={<OptimizedLoadingFallback height="600px" />}>
              <LiquidityMint 
                kiltBalance={kiltBalance}
                wethBalance={wethBalance}
                ethBalance={ethBalance}
                formatTokenAmount={formatTokenAmount}
              />
            </Suspense>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards">
            <Suspense fallback={<OptimizedLoadingFallback height="500px" />}>
              <RewardsTracking />
            </Suspense>
          </TabsContent>

          {/* Positions Tab */}
          <TabsContent value="positions">
            <Suspense fallback={<OptimizedLoadingFallback height="400px" />}>
              <UserPositions />
            </Suspense>
          </TabsContent>




        </Tabs>
      </div>
    </div>
  );
}