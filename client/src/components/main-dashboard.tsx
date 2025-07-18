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
import { useRealTimeDashboard } from '@/hooks/use-real-time-data';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Lightweight components
import { UserPersonalAPR } from './user-personal-apr';
import { WalletConnect } from './wallet-connect';
import { GasEstimationCard } from './gas-estimation-card';
import { PositionRegistration } from './position-registration';
import { LoadingScreen } from './loading-screen';

// Lazy load heavy components
const LiquidityMint = lazy(() => import('./liquidity-mint').then(m => ({ default: m.LiquidityMint })));
const RewardsTracking = lazy(() => import('./rewards-tracking').then(m => ({ default: m.RewardsTracking })));
const UserPositions = lazy(() => import('./user-positions-new').then(m => ({ default: m.default })));

// Import optimized loading components
import { TabLoadingSpinner } from './loading-screen';

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
  const { 
    kiltBalance, 
    wethBalance, 
    ethBalance,
    mintPosition,
    approveToken,
    isMinting,
    isApproving,
    formatTokenAmount,
    parseTokenAmount 
  } = useUniswapV3();
  const unifiedData = useUnifiedDashboard();
  const appSession = useAppSession();
  const realTimeData = useRealTimeDashboard(address, unifiedData.user?.id);
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
                {/* Simple Logo Container */}
                <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center shadow-2xl">
                  {/* KILT Logo - Simple and Clean */}
                  <img 
                    src={kiltLogo} 
                    alt="KILT" 
                    className="w-20 h-20 object-contain" 
                  />
                </div>
              </div>
              
              {/* Main Headline - Enhanced Typography */}
              <h1 className="text-7xl sm:text-8xl font-bold text-white mb-6 leading-tight tracking-tight">
                <span className="block text-white">KILT Liquidity</span>
                <span className="block text-white/90 text-6xl sm:text-7xl font-normal">
                  Incentive Program
                </span>
              </h1>
              
              <p className="text-2xl sm:text-3xl text-white font-medium max-w-4xl mx-auto mb-8 leading-relaxed">
                Earn <span className="text-pink-400 font-bold">up to {unifiedData.maxAPRData?.aprRange || '67% - 89%'} APR</span> from the <span className="text-pink-400 font-bold">{unifiedData.programAnalytics && unifiedData.programAnalytics.totalBudget ? `${(unifiedData.programAnalytics.totalBudget / 1000000).toFixed(1)}M` : '500K'} KILT treasury</span> by providing liquidity to Uniswap V3 pools on Base network.
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

            {/* Modern Hexagonal Feature Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {/* KILT/ETH Pool - Streamlined */}
              <div className="group relative animate-fade-in animate-delay-100">
                <div className="relative bg-black/40 backdrop-blur-sm border border-pink-500/20 rounded-xl p-4 transition-all duration-300 hover:border-pink-500/40 h-[220px] flex flex-col">
                  {/* Simple Icon */}
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-lg bg-[#f90263]">
                      <TrendingUp className="h-7 w-7 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  
                  <div className="pt-8 text-center flex-1 flex flex-col justify-center px-2">
                    <h3 className="text-white font-bold text-lg mb-2">KILT/ETH Pool</h3>
                    <p className="text-gray-200 text-sm leading-relaxed font-medium">
                      Deploy capital efficiently with concentrated liquidity positions and advanced range strategies.
                    </p>
                  </div>
                </div>
              </div>

              {/* Treasury Rewards - Streamlined */}
              <div className="group relative animate-fade-in animate-delay-200">
                <div className="relative bg-black/40 backdrop-blur-sm border border-pink-500/20 rounded-xl p-4 transition-all duration-300 hover:border-pink-500/40 h-[220px] flex flex-col">
                  {/* Simple Icon */}
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="w-12 h-12 from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg border-2 border-white/20 bg-[#f90263]">
                      <Award className="h-7 w-7 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  
                  <div className="pt-8 text-center flex-1 flex flex-col justify-center px-2">
                    <h3 className="text-white font-bold text-lg mb-2">Treasury Rewards</h3>
                    <p className="text-gray-200 text-sm leading-relaxed font-medium">
                      Receive attractive rewards from KILT treasury allocation with secure smart contract distribution.
                    </p>
                  </div>
                </div>
              </div>

              {/* Program Analytics - Streamlined */}
              <div className="group relative animate-fade-in animate-delay-300">
                <div className="relative bg-black/40 backdrop-blur-sm border border-pink-500/20 rounded-xl p-4 transition-all duration-300 hover:border-pink-500/40 h-[220px] flex flex-col">
                  {/* Simple Icon */}
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="w-12 h-12 from-pink-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg border-2 border-white/20 bg-[#f40261]">
                      <BarChart3 className="h-7 w-7 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  
                  <div className="pt-8 text-center flex-1 flex flex-col justify-center px-2">
                    <h3 className="text-white font-bold text-lg mb-2">Program Analytics</h3>
                    <p className="text-gray-200 text-sm leading-relaxed font-medium">
                      Track your position performance, rewards earned, and program progress with detailed analytics.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Streamlined Bottom CTA */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-white mb-3">
                Join the
              </h2>
              <h1 className="text-6xl font-bold text-pink-400 mb-6 leading-tight">
                KILT Ecosystem
              </h1>
              <p className="text-white text-xl font-medium max-w-2xl mx-auto mb-6 leading-relaxed">
                Join thousands earning massive rewards while supporting the future of decentralized identity. Limited treasury - act now!
              </p>
            </div>

            {/* Enhanced Social Media Links */}
            <div className="flex justify-center items-center gap-4">
              <a 
                href="https://x.com/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/60 hover:bg-pink-500/20 border border-pink-500/30 hover:border-pink-500/50 rounded-2xl transition-all duration-300 backdrop-blur-sm"
              >
                <SiX className="h-5 w-5 text-white/80 hover:text-pink-400 transition-colors duration-300" />
              </a>
              <a 
                href="https://github.com/KILTprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/60 hover:bg-pink-500/20 border border-pink-500/30 hover:border-pink-500/50 rounded-2xl transition-all duration-300 backdrop-blur-sm"
              >
                <SiGithub className="h-5 w-5 text-white/80 hover:text-pink-400 transition-colors duration-300" />
              </a>
              <a 
                href="https://discord.gg/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/60 hover:bg-pink-500/20 border border-pink-500/30 hover:border-pink-500/50 rounded-2xl transition-all duration-300 backdrop-blur-sm"
              >
                <SiDiscord className="h-5 w-5 text-white/80 hover:text-pink-400 transition-colors duration-300" />
              </a>
              <a 
                href="https://t.me/KILTProtocolChat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/60 hover:bg-pink-500/20 border border-pink-500/30 hover:border-pink-500/50 rounded-2xl transition-all duration-300 backdrop-blur-sm"
              >
                <SiTelegram className="h-5 w-5 text-white/80 hover:text-pink-400 transition-colors duration-300" />
              </a>
              <a 
                href="https://kilt-protocol.medium.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/60 hover:bg-pink-500/20 border border-pink-500/30 hover:border-pink-500/50 rounded-2xl transition-all duration-300 backdrop-blur-sm"
              >
                <SiMedium className="h-5 w-5 text-white/80 hover:text-pink-400 transition-colors duration-300" />
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
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/30' 
                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
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

        {/* Clean Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // Invalidate positions cache when switching to positions tab
          if (value === 'positions') {
            queryClient.invalidateQueries({ queryKey: ['wallet-positions'] });
          }
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-black/90 border border-pink-500/30 p-0.5 sm:p-1 rounded-xl mb-6 h-10 sm:h-14 gap-0.5 sm:gap-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-pink-500 data-[state=active]:text-white text-pink-200 rounded-lg text-xs sm:text-sm font-medium font-mono transition-all px-1 sm:px-2 py-1 sm:py-2 flex flex-col sm:flex-row items-center justify-center min-w-0 hover:bg-pink-500/10"
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 flex-shrink-0 text-pink-300" />
              <span className="text-xs sm:text-sm font-mono truncate leading-tight">
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Over</span>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="liquidity" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-pink-500 data-[state=active]:text-white text-pink-200 rounded-lg text-xs sm:text-sm font-medium font-mono transition-all px-1 sm:px-2 py-1 sm:py-2 flex flex-col sm:flex-row items-center justify-center min-w-0 hover:bg-pink-500/10"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 flex-shrink-0 text-pink-300" />
              <span className="text-xs sm:text-sm font-mono truncate leading-tight">
                <span className="hidden sm:inline">Add Liquidity</span>
                <span className="sm:hidden">Add</span>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="rewards" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-pink-500 data-[state=active]:text-white text-pink-200 rounded-lg text-xs sm:text-sm font-medium font-mono transition-all px-1 sm:px-2 py-1 sm:py-2 flex flex-col sm:flex-row items-center justify-center min-w-0 hover:bg-pink-500/10"
            >
              <Award className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 flex-shrink-0 text-pink-300" />
              <span className="text-xs sm:text-sm font-mono truncate leading-tight">
                <span className="hidden sm:inline">Rewards</span>
                <span className="sm:hidden">Rwd</span>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="positions" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-pink-500 data-[state=active]:text-white text-pink-200 rounded-lg text-xs sm:text-sm font-medium font-mono transition-all px-1 sm:px-2 py-1 sm:py-2 flex flex-col sm:flex-row items-center justify-center min-w-0 hover:bg-pink-500/10"
            >
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 flex-shrink-0 text-pink-300" />
              <span className="text-xs sm:text-sm font-mono truncate leading-tight">
                <span className="hidden sm:inline">Positions</span>
                <span className="sm:hidden">Pos</span>
              </span>
            </TabsTrigger>


          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Sleek Metrics Display */}
            <div className="theme-card p-2 sm:p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {/* KILT Price */}
                <div className="text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-lg flex items-center justify-center mx-auto mb-1 sm:mb-2 border border-pink-400/30">
                    <img 
                      src={kiltLogo} 
                      alt="KILT" 
                      className="w-4 h-4 sm:w-6 sm:h-6"
                    />
                  </div>
                  <p className="text-white/80 text-sm mb-1 font-medium">KILT Price</p>
                  <p className="text-white font-bold text-lg sm:text-xl">
                    ${kiltData?.price?.toFixed(4) || '0.0289'}
                  </p>
                  <p className="text-pink-400 text-sm font-medium">+0.50%</p>
                </div>

                {/* Market Cap */}
                <div className="text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-lg flex items-center justify-center mx-auto mb-1 sm:mb-2 border border-blue-400/30">
                    <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
                  </div>
                  <p className="text-white/80 text-sm mb-1 font-medium">Market Cap</p>
                  <p className="text-white font-bold text-lg sm:text-xl">
                    ${kiltData?.marketCap ? (kiltData.marketCap / 1000000).toFixed(1) : '4.4'}M
                  </p>
                  <p className="text-pink-400 text-sm font-medium">276.97M circulating</p>
                </div>

                {/* Your Reward APR */}
                <div className="text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-lg flex items-center justify-center mx-auto mb-1 sm:mb-2 border border-purple-400/30">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
                  </div>
                  <p className="text-white/80 text-sm mb-1 font-medium">Your Reward APR</p>
                  <div className="text-white font-bold text-lg sm:text-xl">
                    {address ? (
                      <UserPersonalAPR address={address} />
                    ) : (
                      <div className="text-center">
                        <span className="text-white/50">--</span>
                        <div className="text-white/60 text-sm mt-1">Connect wallet</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Maximum APR */}
                <div className="text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-lg flex items-center justify-center mx-auto mb-1 sm:mb-2 border border-amber-400/30">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
                  </div>
                  <p className="text-white/80 text-sm mb-1 font-medium">Current APR</p>
                  <p className="text-white font-bold text-lg sm:text-xl">
                    {unifiedData?.maxAPRData?.aprRange || '31%'}
                  </p>
                  <p className="text-pink-400 text-sm font-medium">High yields available!</p>
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
                <Card className="theme-card h-[400px] sm:h-[440px] lg:h-[480px] flex flex-col">
                  <CardContent className="p-3 flex-1 flex flex-col">
                    <div className="space-y-3 flex-1">
                      {/* Balance Display */}
                      <div className="theme-card p-3">
                        <h4 className="text-white font-bold text-base mb-3">Wallet Balance</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {/* KILT Balance Card */}
                          <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 backdrop-blur-sm rounded-lg p-3 border border-pink-500/30">
                            <div className="flex flex-col items-center text-center">
                              <KiltLogo size="md" showBackground={true} />
                              <span className="text-white/80 text-sm font-medium mt-1">KILT</span>
                              <span className="text-white font-bold text-sm mt-0.5">
                                {kiltBalance ? parseFloat(formatTokenBalance(kiltBalance)).toLocaleString() : '0'}
                              </span>
                            </div>
                          </div>
                          
                          {/* ETH Balance Card */}
                          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
                            <div className="flex flex-col items-center text-center">
                              <EthLogo size="md" showBackground={true} />
                              <span className="text-white/80 text-sm font-medium mt-1">ETH</span>
                              <span className="text-white font-bold text-sm mt-0.5">
                                {ethBalance ? parseFloat(formatTokenBalance(ethBalance)).toFixed(6) : '0.000000'}
                              </span>
                            </div>
                          </div>
                          
                          {/* WETH Balance Card */}
                          <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-sm rounded-lg p-3 border border-emerald-500/30">
                            <div className="flex flex-col items-center text-center">
                              <EthLogo size="md" showBackground={true} />
                              <span className="text-white/70 text-xs font-medium mt-1">WETH</span>
                              <span className="text-white font-bold text-xs text-numbers mt-0.5">
                                {wethBalance ? parseFloat(formatTokenBalance(wethBalance)).toFixed(6) : '0.000000'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Percentage Selector */}
                      <div className="theme-card p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70 text-sm font-medium text-label">Balance Usage</span>
                          <span className="text-sm text-white/50 text-body">{selectedPercentage}% of wallet</span>
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
                                  ? 'theme-button-primary' 
                                  : 'theme-button-secondary'
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
                      <div className="theme-card p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70 text-sm font-medium text-label">Liquidity Amount</span>
                          <span className="text-sm text-white/50 text-body">Balanced strategy</span>
                        </div>
                        {(() => {
                          const amounts = calculateOptimalAmounts();
                          const hasInsufficientBalance = parseFloat(amounts.kiltAmount) < 0.01 || parseFloat(amounts.wethAmount) < 0.000001;
                          
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
                              <div className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent text-numbers mb-2">
                                ~${amounts.totalValue}
                              </div>
                              <div className="flex items-center justify-center space-x-4 text-white/60 text-xs text-body">
                                <div className="flex items-center space-x-1">
                                  <KiltLogo size="xs" showBackground={true} />
                                  <span>{amounts.kiltAmount} KILT</span>
                                </div>
                                <span>+</span>
                                <div className="flex items-center space-x-1">
                                  <EthLogo size="xs" showBackground={true} />
                                  <span>{amounts.ethAmount} {amounts.useNativeEth ? 'ETH' : 'WETH'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Action Button and Help Text - Bottom of Card */}
                    <div className="space-y-2 mt-3">
                      {/* Action Button */}
                      {(() => {
                        const amounts = calculateOptimalAmounts();
                        const hasInsufficientBalance = parseFloat(amounts.kiltAmount) < 0.01 || parseFloat(amounts.wethAmount) < 0.000001;
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

                      {/* Help Text */}
                      <div className="text-center">
                        <p className="text-xs text-white/40 text-body">
                          For custom amounts, use "Add Liquidity" tab
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Add Liquidity Tab */}
          <TabsContent value="liquidity">
            <Suspense fallback={<OptimizedLoadingFallback height="600px" />}>
              <LiquidityMint />
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