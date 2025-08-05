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
  BarChart3,
  TrendingUp as ChartIcon
} from 'lucide-react';

// Lazy-loaded components for faster initial load
import { lazy, Suspense, useMemo } from 'react';

// Hooks and contexts
import { useWagmiWallet } from '@/hooks/use-wagmi-wallet';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useUnifiedDashboard } from '@/hooks/use-unified-dashboard';
// Removed use-optimized-queries - cleaned up during optimization
// Removed blazing fast hooks - cleaned up during optimization
import { useAppSession } from '@/hooks/use-app-session';
// Removed deprecated hooks - consolidated into unified dashboard
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

// Lightweight components
import { UserPersonalAPR } from './user-personal-apr';
import { MobileWalletConnect } from './mobile-wallet-connect';

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
import backgroundVideo from '@assets/Untitled design (22)_1752822331413.mp4';
import { SiX, SiGithub, SiDiscord, SiTelegram, SiMedium } from 'react-icons/si';

// Services
import { LiquidityService } from '@/services/liquidity-service';
import { useEthPrice } from '@/hooks/use-eth-price';

// Universal logo components
import { TokenLogo, KiltLogo, EthLogo } from '@/components/ui/token-logo';

// Viem utilities for token amount parsing
import { parseUnits } from 'viem';

// Token contract addresses
const WETH_TOKEN = '0x4200000000000000000000000000000000000006'; // Base WETH
const KILT_TOKEN = '0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8';



// SINGLE SOURCE OF TRUTH APR COMPONENTS - Replaces all other APR calculations
import { useExpectedReturns } from '@/hooks/use-single-source-apr';

function SingleSourceProgramAPR() {
  const { data: expectedReturns, isLoading, error } = useExpectedReturns();

  if (isLoading) return <span className="text-white/50">--</span>;
  if (error) return <span className="text-red-400">Error</span>;
  
  const programAPR = expectedReturns?.incentiveAPR;
  return (
    <span>
      {programAPR ? `${Math.round(parseFloat(programAPR))}%` : '--'}
    </span>
  );
}

function SingleSourceTradingAPR() {
  const { data: expectedReturns, isLoading, error } = useExpectedReturns();

  if (isLoading) return <span className="text-white/50">--</span>;
  if (error) return <span className="text-red-400">Error</span>;
  
  const tradingAPR = expectedReturns?.tradingAPR;
  return (
    <span>
      {tradingAPR ? `${parseFloat(tradingAPR).toFixed(1)}%` : '--'}
    </span>
  );
}

function SingleSourceTotalAPR() {
  const { data: expectedReturns, isLoading, error } = useExpectedReturns();

  if (isLoading) return <span className="text-white/50">--</span>;
  if (error) return <span className="text-red-400">Error</span>;
  
  const totalAPR = expectedReturns?.totalAPR;
  return (
    <span>
      {totalAPR ? `${parseFloat(totalAPR).toFixed(1)}%` : '--'}
    </span>
  );
}



export function MainDashboard() {
  const { address, isConnected, isConnecting } = useWagmiWallet();
  const { data: kiltData } = useKiltTokenData();
  const unifiedData = useUnifiedDashboard();
  const appSession = useAppSession();
  
  // Uniswap V3 hooks for liquidity provision
  const { mintPosition, isMinting } = useUniswapV3();
  
  // Chart modal state
  const [showChartModal, setShowChartModal] = useState(false);
  
  // Get optimized queries for real trading fees APR data
  // Removed optimized queries - using unified dashboard instead
  
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
    
    // Add event listener for modal redirect to Add Liquidity
    const handleNavigateToAddLiquidity = (event: CustomEvent) => {
      const { tab, prefilledAmounts } = event.detail;
      setActiveTab(tab);
      
      // Store prefilled amounts for the Add Liquidity interface
      if (prefilledAmounts) {
        sessionStorage.setItem('prefilledLiquidityAmounts', JSON.stringify(prefilledAmounts));
      }
    };
    
    window.addEventListener('navigateToAddLiquidity', handleNavigateToAddLiquidity as EventListener);
    
    return () => {
      delete (window as unknown as { navigateToTab?: (tab: string) => void }).navigateToTab;
      window.removeEventListener('navigateToAddLiquidity', handleNavigateToAddLiquidity as EventListener);
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
        balanceStr = String(balance);
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

  // Get real-time ETH price
  const { data: ethPriceData } = useEthPrice();

  // Calculate optimal amounts using universal LiquidityService
  const calculateOptimalAmounts = (percentage = selectedPercentage) => {
    return LiquidityService.calculateOptimalAmounts(
      kiltBalance,
      wethBalance,
      ethBalance,
      kiltData?.price || 0.0160,
      percentage,
      formatTokenBalance,
      ethPriceData?.ethPrice // Pass real-time ETH price
    );
  };

  // Quick Add Liquidity with actual token approval and position minting
  const handleQuickAddLiquidity = async () => {
    if (!address || isMinting) return;
    
    try {
      console.log('🚀 Starting Quick Add Liquidity process...');
      
      const amounts = calculateOptimalAmounts();
      const hasInsufficientBalance = parseFloat(amounts.kiltAmount) <= 0 || parseFloat(amounts.ethAmount) <= 0 || parseFloat(amounts.totalValue) < 10;
      
      if (hasInsufficientBalance) {
        toast({
          title: "Insufficient Balance",
          description: "You need both KILT and ETH tokens to add liquidity",
          variant: "destructive"
        });
        return;
      }
      
      // Convert to BigInt values (18 decimals)
      const amount0Desired = parseUnits(amounts.ethAmount, 18); // WETH
      const amount1Desired = parseUnits(amounts.kiltAmount, 18); // KILT
      
      console.log('💰 Quick Add amounts:', {
        eth: amounts.ethAmount,
        kilt: amounts.kiltAmount,
        amount0Desired: amount0Desired.toString(),
        amount1Desired: amount1Desired.toString()
      });
      
      toast({
        title: "Creating Liquidity Position",
        description: "Processing transaction...",
      });
      
      // Create the position using mintPosition from useUniswapV3
      console.log('🏗️ Creating liquidity position...');
      const txHash = await mintPosition({
        token0: WETH_TOKEN as `0x${string}`,
        token1: KILT_TOKEN as `0x${string}`,
        fee: 3000, // 0.3%
        tickLower: -887220, // Full range
        tickUpper: 887220,  // Full range
        amount0Desired,
        amount1Desired,
        amount0Min: (amount0Desired * 95n) / 100n, // 5% slippage
        amount1Min: (amount1Desired * 95n) / 100n, // 5% slippage
        recipient: address as `0x${string}`,
        deadline: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
        useNativeETH: true
      });
      
      console.log('✅ Position created! Hash:', txHash);
      
      toast({
        title: "Liquidity Added Successfully!",
        description: `Added ${amounts.ethAmount} ETH + ${amounts.kiltAmount} KILT to the pool`,
      });
      
      // Invalidate cache to refresh position data
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rewards'] });
      
      // Switch to positions tab to show the new position
      setActiveTab('positions');
      
    } catch (error: any) {
      console.error('Quick Add Liquidity error:', error);
      
      let errorMessage = "Failed to add liquidity";
      if (error.message?.includes('insufficient funds')) {
        errorMessage = "Insufficient token balance";
      } else if (error.message?.includes('user rejected')) {
        errorMessage = "Transaction rejected";
      } else if (error.message?.includes('slippage')) {
        errorMessage = "Price changed too much during transaction";
      }
      
      toast({
        title: "Quick Add Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Connecting wallet...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 relative overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 1 }}
            onLoadStart={() => console.log('Landing page video loading started')}
            onCanPlay={() => console.log('Landing page video can play')}
            onError={(e) => console.error('Landing page video error:', e)}
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        </div>
        
        {/* Overlay for content readability */}
        <div className="absolute inset-0 bg-black/20" style={{ zIndex: 2 }}></div>
        
        {/* Cyberpunk Beta Badge - Fixed position in top right corner */}
        <div className="fixed top-6 right-6 sm:top-8 sm:right-8 z-50">
          <div className="relative group">
            {/* Animated cyberpunk glow layers */}
            <div className="absolute inset-0 bg-matrix-green/30 rounded-lg blur-lg animate-pulse"></div>
            <div className="absolute inset-0 bg-cyan-400/20 rounded-lg blur-md animate-ping"></div>
            
            {/* Main beta badge with cyberpunk styling */}
            <div className="relative bg-black/95 border-2 border-matrix-green/80 text-matrix-green text-xs sm:text-sm font-black px-4 py-2 uppercase tracking-widest backdrop-blur-xl shadow-2xl shadow-matrix-green/25 transform hover:scale-110 transition-all duration-300 rounded-lg overflow-hidden">
              {/* Inner cyberpunk grid pattern */}
              <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-transparent via-matrix-green/20 to-transparent animate-pulse"></div>
              
              {/* Glitch effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-transparent to-matrix-green/10 animate-pulse opacity-50"></div>
              
              {/* Beta text with cyberpunk styling */}
              <span className="relative z-10 font-mono text-shadow-glow drop-shadow-lg">
                BETA
              </span>
              
              {/* Scanning line effect */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-matrix-green/60 animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-full h-0.5 bg-cyan-400/40 animate-pulse delay-75"></div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto relative" style={{ zIndex: 10 }}>
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
              
              {/* Modern Typography - Clean & Professional */}
              <div className="mb-8">
                {/* Main title with subtle gradient */}
                <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight tracking-tight">
                  <span className="block bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                    KILT Liquidity
                  </span>
                  <span className="block text-5xl sm:text-6xl lg:text-7xl mt-2 text-white/90 font-normal">
                    Incentive Program
                  </span>
                </h1>
              </div>
              
              {/* Clean Description */}
              <div className="relative max-w-4xl mx-auto mb-8">
                <p className="text-xl sm:text-2xl text-white/90 font-medium leading-relaxed text-center">
                  Earn <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded">{unifiedData.programAnalytics?.averageAPR ? `${Math.round(unifiedData.programAnalytics.averageAPR)}%` : '125%'} APR</span> from the <span className="text-pink-400 font-bold bg-pink-400/10 px-2 py-1 rounded">{unifiedData.programAnalytics?.treasuryTotal ? (unifiedData.programAnalytics.treasuryTotal >= 1000000 ? `${(unifiedData.programAnalytics.treasuryTotal / 1000000).toFixed(1)}M` : `${(unifiedData.programAnalytics.treasuryTotal / 1000).toFixed(0)}K`) : '3M'} KILT treasury</span> by providing liquidity to Uniswap V3 pools on Base network.
                </p>
              </div>
            </div>

            {/* Connection Section */}
            <div className="mb-16 flex flex-col items-center">
              <div className="mb-4">
                <MobileWalletConnect />
              </div>
            </div>

            {/* Clean Feature Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {/* KILT/ETH Pool */}
              <div className="group relative animate-fade-in animate-delay-100">
                <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-emerald-500/30 hover:bg-black/60 h-[180px] flex flex-col">
                  <div className="flex items-center mb-4">
                    <TrendingUp className="h-6 w-6 text-emerald-400 mr-3" />
                    <h3 className="text-white font-bold text-lg">KILT/ETH Pool</h3>
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
                <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-pink-500/30 hover:bg-black/60 h-[180px] flex flex-col">
                  <div className="flex items-center mb-4">
                    <Award className="h-6 w-6 text-pink-400 mr-3" />
                    <h3 className="text-white font-bold text-lg">Treasury Rewards</h3>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Receive attractive rewards from <span className="text-pink-400 font-semibold">{unifiedData?.programAnalytics?.treasuryTotal ? (unifiedData.programAnalytics.treasuryTotal >= 1000000 ? `${(unifiedData.programAnalytics.treasuryTotal / 1000000).toFixed(1)}M KILT` : `${(unifiedData.programAnalytics.treasuryTotal / 1000).toFixed(0)}K KILT`) : '500K KILT'}</span> treasury allocation with secure smart contract distribution.
                    </p>
                  </div>
                </div>
              </div>

              {/* Program Analytics */}
              <div className="group relative animate-fade-in animate-delay-300">
                <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 transition-all duration-300 hover:border-blue-500/30 hover:bg-black/60 h-[180px] flex flex-col">
                  <div className="flex items-center mb-4">
                    <BarChart3 className="h-6 w-6 text-blue-400 mr-3" />
                    <h3 className="text-white font-bold text-lg">Program Analytics</h3>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Track your position performance, rewards earned, and program progress with detailed analytics.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
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
      {/* Background Video - Testing higher z-index */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline
        preload="auto"
        className="fixed top-0 left-0 w-full h-full object-cover"
        style={{ zIndex: 1 }}
        onLoadStart={() => console.log('Video loading started')}
        onCanPlay={() => console.log('Video can play')}
        onError={(e) => console.error('Video error:', e)}
      >
        <source src={backgroundVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {/* Transparent overlay for content readability */}
      <div className="absolute inset-0 bg-black/30" style={{ zIndex: 2 }}></div>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative" style={{ zIndex: 10 }}>
        {/* Clean Professional Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl flex items-center justify-center p-2 flex-shrink-0">
              <img src={kiltLogo} alt="KILT" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
            </div>
            <div className="min-w-0 flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate font-mono">KILT Liquidity Portal</h1>
              
              {/* Cyberpunk Beta Badge - Dashboard Header */}
              <div className="relative group flex-shrink-0">
                {/* Animated cyberpunk glow layers */}
                <div className="absolute inset-0 bg-matrix-green/30 rounded-lg blur-md animate-pulse"></div>
                <div className="absolute inset-0 bg-cyan-400/20 rounded-lg blur-sm animate-ping"></div>
                
                {/* Main beta badge with cyberpunk styling */}
                <div className="relative bg-black/95 border-2 border-matrix-green/80 text-matrix-green text-xs font-black px-3 py-1.5 uppercase tracking-widest backdrop-blur-xl shadow-xl shadow-matrix-green/25 transform hover:scale-110 transition-all duration-300 rounded-lg overflow-hidden">
                  {/* Inner cyberpunk grid pattern */}
                  <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-transparent via-matrix-green/20 to-transparent animate-pulse"></div>
                  
                  {/* Glitch effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-transparent to-matrix-green/10 animate-pulse opacity-50"></div>
                  
                  {/* Beta text with cyberpunk styling */}
                  <span className="relative z-10 font-mono text-shadow-glow drop-shadow-lg">
                    BETA
                  </span>
                  
                  {/* Scanning line effect */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-matrix-green/60 animate-pulse"></div>
                  <div className="absolute bottom-0 right-0 w-full h-0.5 bg-cyan-400/40 animate-pulse delay-75"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex-shrink-0">
              <MobileWalletConnect />
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
          <TabsList className="grid w-full grid-cols-4 bg-black/40 backdrop-blur-xl border border-white/10 p-1 rounded-2xl mb-8 h-12 gap-1 shadow-2xl">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white/15 data-[state=active]:to-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg text-white/70 hover:text-white/90 rounded-xl text-sm font-medium transition-all duration-300 px-3 py-2 flex items-center justify-center min-w-0 hover:bg-white/5 group"
            >
              <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0 transition-colors duration-300 group-data-[state=active]:text-white group-hover:text-[#ff0066]" />
              <span className="text-sm font-medium truncate">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="liquidity" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white/15 data-[state=active]:to-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg text-white/70 hover:text-white/90 rounded-xl text-sm font-medium transition-all duration-300 px-3 py-2 flex items-center justify-center min-w-0 hover:bg-white/5 group"
            >
              <Plus className="h-4 w-4 mr-2 flex-shrink-0 transition-colors duration-300 group-data-[state=active]:text-white group-hover:text-[#ff0066]" />
              <span className="text-sm font-medium truncate">Add Liquidity</span>
            </TabsTrigger>
            <TabsTrigger 
              value="rewards" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white/15 data-[state=active]:to-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg text-white/70 hover:text-white/90 rounded-xl text-sm font-medium transition-all duration-300 px-3 py-2 flex items-center justify-center min-w-0 hover:bg-white/5 group"
            >
              <Award className="h-4 w-4 mr-2 flex-shrink-0 transition-colors duration-300 group-data-[state=active]:text-white group-hover:text-[#ff0066]" />
              <span className="text-sm font-medium truncate">Rewards</span>
            </TabsTrigger>
            <TabsTrigger 
              value="positions" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-white/15 data-[state=active]:to-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg text-white/70 hover:text-white/90 rounded-xl text-sm font-medium transition-all duration-300 px-3 py-2 flex items-center justify-center min-w-0 hover:bg-white/5 group"
            >
              <Wallet className="h-4 w-4 mr-2 flex-shrink-0 transition-colors duration-300 group-data-[state=active]:text-white group-hover:text-[#ff0066]" />
              <span className="text-sm font-medium truncate">Positions</span>
            </TabsTrigger>

          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Sophisticated Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KILT Price Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff0066]/20 to-transparent rounded-xl blur-xl transition-all duration-300 group-hover:from-[#ff0066]/30"></div>
                <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4 transition-all duration-300 group-hover:border-[#ff0066]/30 group-hover:shadow-lg group-hover:shadow-[#ff0066]/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/10 border border-[#ff0066]/30 flex items-center justify-center">
                        <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
                      </div>
                      <span className="text-white/70 text-sm font-medium">KILT Price</span>
                    </div>
                    <button
                      onClick={() => setShowChartModal(true)}
                      className="w-6 h-6 rounded-md bg-[#ff0066]/10 border border-[#ff0066]/30 flex items-center justify-center hover:bg-[#ff0066]/20 transition-all duration-200 group"
                      title="View KILT/WETH Chart"
                    >
                      <BarChart3 className="h-3 w-3 text-[#ff0066] group-hover:text-white" />
                    </button>
                  </div>
                  <div className="text-white text-xl mb-1 numeric-large">
                    {kiltData?.price ? `$${kiltData.price.toFixed(4)}` : (
                      <div className="h-6 w-20 bg-slate-700 animate-pulse rounded"></div>
                    )}
                  </div>
                  <div className={`text-xs font-medium numeric-mono ${
                    (kiltData?.priceChange24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {kiltData?.priceChange24h !== null && kiltData?.priceChange24h !== undefined ? 
                      `${kiltData.priceChange24h >= 0 ? '+' : ''}${kiltData.priceChange24h.toFixed(2)}% (24h)` : 
                      <div className="h-4 w-16 bg-slate-700 animate-pulse rounded"></div>
                    }
                  </div>
                </div>
              </div>

              {/* Market Cap Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-transparent rounded-xl blur-xl transition-all duration-300 group-hover:from-green-400/30"></div>
                <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4 transition-all duration-300 group-hover:border-green-400/30 group-hover:shadow-lg group-hover:shadow-green-400/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400/20 to-green-400/10 border border-green-400/30 flex items-center justify-center">
                      <Coins className="h-4 w-4 text-green-400" />
                    </div>
                    <span className="text-white/70 text-sm font-medium">Market Cap</span>
                  </div>
                  <div className="text-white text-xl mb-1 numeric-large">
                    {kiltData?.marketCap ? `$${(kiltData.marketCap / 1000000).toFixed(1)}M` : (
                      <div className="h-6 w-16 bg-slate-700 animate-pulse rounded"></div>
                    )}
                  </div>
                  <div className="text-white/50 text-xs font-medium">
                    277.0M circulating
                  </div>
                </div>
              </div>

              {/* Trading Fees APR Card - Using Real Data */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent rounded-xl blur-xl transition-all duration-300 group-hover:from-emerald-400/30"></div>
                <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4 transition-all duration-300 group-hover:border-emerald-400/30 group-hover:shadow-lg group-hover:shadow-emerald-400/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400/20 to-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="text-white/70 text-sm font-medium">Trading Fees APR</span>
                  </div>
                  <div className="text-white text-xl mb-1 numeric-large">
                    <SingleSourceTradingAPR />
                  </div>
                  <div className="text-white/50 text-xs font-medium">
                    DexScreener API
                  </div>
                </div>
              </div>

              {/* Program APR Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent rounded-xl blur-xl transition-all duration-300 group-hover:from-green-500/30"></div>
                <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-4 transition-all duration-300 group-hover:border-green-500/30 group-hover:shadow-lg group-hover:shadow-green-500/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/30 flex items-center justify-center">
                      <Award className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="text-white/70 text-sm font-medium">Program APR</span>
                  </div>
                  <div className="text-white text-xl mb-1 numeric-large">
                    <SingleSourceProgramAPR />
                  </div>
                  <div className="text-white/50 text-xs font-medium">
                    Treasury rewards
                  </div>
                </div>
              </div>
            </div>

            {/* Two Column Layout - Fixed Mobile Responsive */}
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-6">
              {/* Left Column - Position Registration */}
              <div className="w-full mb-8 lg:mb-0">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white flex items-center gap-2 mb-3">
                  <Plus className="h-4 w-4" style={{ color: '#ff0066' }} />
                  <span className="hidden sm:inline">Register Existing Positions</span>
                  <span className="sm:hidden">Register Positions</span>
                </h2>
                <div className="h-[400px] sm:h-[450px] lg:h-[520px] flex flex-col">
                  <PositionRegistration />
                </div>
              </div>

              {/* Right Column - Quick Add Liquidity */}
              <div className="w-full">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-white flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4" style={{ color: '#ff0066' }} />
                  <span className="hidden sm:inline">Quick Add Liquidity</span>
                  <span className="sm:hidden">Add Liquidity</span>
                </h2>
                <Card className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg h-[400px] sm:h-[450px] lg:h-[520px] flex flex-col overflow-hidden cluely-card mobile-stack-fix">
                  <CardContent className="p-4 flex-1 flex flex-col overflow-hidden">
                    <div className="space-y-4 flex-1">
                      {/* Balance Display */}
                      <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-2 sm:p-3 cluely-card">
                        <h4 className="text-white font-bold text-sm sm:text-base mb-2 sm:mb-3">Wallet Balance</h4>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {/* KILT Balance Card */}
                          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-white/10">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border" style={{ backgroundColor: 'rgba(255, 0, 102, 0.3)', borderColor: 'rgba(255, 0, 102, 0.5)' }}>
                                <img 
                                  src={kiltLogo} 
                                  alt="KILT" 
                                  className="w-3 h-3 sm:w-5 sm:h-5"
                                  style={{ 
                                    filter: 'brightness(1.5) contrast(1.2) drop-shadow(0 0 3px rgba(255,255,255,0.3))'
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-xs font-medium">KILT</div>
                                <div className="text-matrix-green font-bold text-xs sm:text-sm numeric-display truncate" style={{ textShadow: '0 0 10px rgba(0, 255, 0, 0.4)' }}>
                                  {kiltBalance ? parseFloat(kiltBalance).toLocaleString() : '0'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* ETH Balance Card */}
                          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-white/10">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border" style={{ backgroundColor: 'rgba(255, 0, 102, 0.3)', borderColor: 'rgba(255, 0, 102, 0.5)' }}>
                                <svg className="w-3 h-3 sm:w-5 sm:h-5" viewBox="0 0 256 417" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'brightness(1.5) contrast(1.2) drop-shadow(0 0 3px rgba(255,255,255,0.3))' }}>
                                  <path d="M127.961 0L125.44 8.55656V285.168L127.961 287.688L255.922 212.32L127.961 0Z" fill="#8A92B2"/>
                                  <path d="M127.962 0L0 212.32L127.962 287.688V153.864V0Z" fill="#62688F"/>
                                  <path d="M127.961 312.187L126.385 314.154V415.484L127.961 417L255.922 237.832L127.961 312.187Z" fill="#8A92B2"/>
                                  <path d="M127.962 417V312.187L0 237.832L127.962 417Z" fill="#62688F"/>
                                  <path d="M127.961 287.688L255.922 212.32L127.961 153.864V287.688Z" fill="#454A75"/>
                                  <path d="M0 212.32L127.962 287.688V153.864L0 212.32Z" fill="#8A92B2"/>
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-xs font-medium">ETH</div>
                                <div className="text-matrix-green font-bold text-xs sm:text-sm numeric-display truncate" style={{ textShadow: '0 0 10px rgba(0, 255, 0, 0.4)' }}>
                                  {ethBalance ? parseFloat(ethBalance).toFixed(6) : '0.000000'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* WETH Balance Card */}
                          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-white/10">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border" style={{ backgroundColor: 'rgba(255, 0, 102, 0.3)', borderColor: 'rgba(255, 0, 102, 0.5)' }}>
                                <svg className="w-3 h-3 sm:w-5 sm:h-5" viewBox="0 0 256 417" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'brightness(1.5) contrast(1.2) drop-shadow(0 0 3px rgba(255,255,255,0.3))' }}>
                                  <path d="M127.961 0L125.44 8.55656V285.168L127.961 287.688L255.922 212.32L127.961 0Z" fill="#8A92B2"/>
                                  <path d="M127.962 0L0 212.32L127.962 287.688V153.864V0Z" fill="#62688F"/>
                                  <path d="M127.961 312.187L126.385 314.154V415.484L127.961 417L255.922 237.832L127.961 312.187Z" fill="#8A92B2"/>
                                  <path d="M127.962 417V312.187L0 237.832L127.962 417Z" fill="#62688F"/>
                                  <path d="M127.961 287.688L255.922 212.32L127.961 153.864V287.688Z" fill="#454A75"/>
                                  <path d="M0 212.32L127.962 287.688V153.864L0 212.32Z" fill="#8A92B2"/>
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-white text-xs font-medium">WETH</div>
                                <div className="text-matrix-green font-bold text-xs sm:text-sm numeric-display truncate" style={{ textShadow: '0 0 10px rgba(0, 255, 0, 0.4)' }}>
                                  {wethBalance ? parseFloat(wethBalance).toFixed(6) : '0.000000'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        
                      </div>

                      {/* Percentage Selector */}
                      <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-3 cluely-card">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white text-sm font-medium">Balance Usage</span>
                          <span className="text-sm text-white/80 numeric-mono">{selectedPercentage}% of wallet</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {LiquidityService.getPercentageOptions().map(({ value, label }) => (
                            <Button
                              key={value}
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPercentage(value)}
                              className={`text-xs py-1 px-1 h-6 transition-all duration-200 border ${
                                selectedPercentage === value 
                                  ? 'text-black font-bold border-2' 
                                  : 'border text-white/80 hover:bg-matrix-green/10 hover:border-matrix-green/50 hover:text-white'
                              }`}
                              style={selectedPercentage === value ? { 
                                backgroundColor: '#ff0066', 
                                borderColor: '#ff0066',
                                color: 'white'
                              } : { 
                                borderColor: 'rgba(255, 255, 255, 0.2)' 
                              }}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                        
                        {/* Seek Bar Slider */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-white text-xs">Precise Control</span>
                            <span className="text-white/80 text-xs">{selectedPercentage}%</span>
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
                      <div className="theme-card p-3 cluely-card">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-white text-sm font-medium text-label">Liquidity Amount</span>
                          <span className="text-sm text-white/80 text-body">Balanced strategy</span>
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
                                  <div className="w-6 h-6 bg-gradient-to-br from-[#ff0066]/30 to-[#ff0066]/30 rounded-full flex items-center justify-center border border-[#ff0066]/50">
                                    <KiltLogo size="sm" showBackground={false} />
                                  </div>
                                  <span className="font-medium text-matrix-green">{amounts.kiltAmount} KILT</span>
                                </div>
                                <span className="text-matrix-green text-lg">+</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-gradient-to-br from-[#ff0066]/30 to-[#ff0066]/30 rounded-full flex items-center justify-center border border-[#ff0066]/50">
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
                    <div className="space-y-2 mt-3 px-1">
                      {/* Action Button */}
                      {(() => {
                        const amounts = calculateOptimalAmounts();
                        const hasInsufficientBalance = parseFloat(amounts.kiltAmount) <= 0 || parseFloat(amounts.ethAmount) <= 0 || parseFloat(amounts.totalValue) < 10;
                        const isDisabled = isMinting || !address || hasInsufficientBalance;
                        
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
                            {isMinting ? (
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

      {/* KILT/WETH Chart Modal */}
      {showChartModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black/90 backdrop-blur-xl border border-[#ff0066]/30 rounded-2xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/10 border border-[#ff0066]/30 flex items-center justify-center">
                  <img src={kiltLogo} alt="KILT" className="w-5 h-5" />
                </div>
                <h2 className="text-white text-lg font-bold">KILT/WETH Price Chart</h2>
                <Badge className="bg-[#ff0066]/10 text-[#ff0066] border-[#ff0066]/30">
                  Live Data
                </Badge>
              </div>
              <button
                onClick={() => setShowChartModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 group"
              >
                <svg className="w-4 h-4 text-white/70 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Chart Content */}
            <div className="flex-1 p-4">
              <div className="w-full h-full rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <iframe
                  src="https://www.geckoterminal.com/base/pools/0x82da478b1382b951cbad01beb9ed459cdb16458e?embed=1&info=0&swaps=0"
                  className="w-full h-full border-0"
                  title="KILT/WETH Price Chart"
                  allowFullScreen
                />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-white/50 text-sm">
                  Data provided by GeckoTerminal
                </div>
                <button
                  onClick={() => window.open('https://www.geckoterminal.com/base/pools/0x82da478b1382b951cbad01beb9ed459cdb16458e?utm_source=coingecko&utm_medium=referral&utm_campaign=livechart', '_blank')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#ff0066]/10 hover:bg-[#ff0066]/20 border border-[#ff0066]/30 rounded-lg text-[#ff0066] text-sm transition-all duration-200"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Full Chart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}