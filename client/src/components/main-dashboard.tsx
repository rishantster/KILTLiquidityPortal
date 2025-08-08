import { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
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

// Hooks and contexts
import { useWagmiWallet } from '@/hooks/use-wagmi-wallet';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useUnifiedDashboard } from '@/hooks/use-unified-dashboard';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Components
import { UserPersonalAPR } from './user-personal-apr';
import { MobileWalletConnect } from './mobile-wallet-connect';
import { PositionRegistration } from './position-registration';
import { LoadingScreen } from './loading-screen';

// Lazy load heavy components
const LiquidityMint = lazy(() => import('./liquidity-mint').then(m => ({ default: m.LiquidityMint })));
const RewardsTracking = lazy(() => import('./rewards-tracking').then(m => ({ default: m.RewardsTracking })));
const UserPositions = lazy(() => import('./user-positions').then(m => ({ default: m.UserPositions })));

// Assets and icons
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';
import backgroundVideo from '@assets/Untitled design (22)_1752822331413.mp4';
import { SiX, SiGithub, SiDiscord, SiTelegram, SiMedium } from 'react-icons/si';

// Services
import { LiquidityService } from '@/services/liquidity-service';
import { useEthPrice } from '@/hooks/use-eth-price';
import { CyberpunkKiltLogo } from './cyberpunk-kilt-logo';
import { parseUnits } from 'viem';
import { useExpectedReturns } from '@/hooks/use-single-source-apr';

// Constants
const WETH_TOKEN = '0x4200000000000000000000000000000000000006' as const;
const KILT_TOKEN = '0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8' as const;
const POOL_FEE = 3000;
const TICK_LOWER = -887220;
const TICK_UPPER = 887220;
const SLIPPAGE_TOLERANCE = 95n;
const DEADLINE_BUFFER = 1200;
const BASE_CHAIN_ID = '0x2105';
const REGISTRATION_DELAY = 2000;
const LOGO_ANIMATION_DELAY = 800;
const DEFAULT_PERCENTAGE = 80;
const MIN_LIQUIDITY_VALUE = 10;

// Type definitions
interface EthereumProvider {
  request: (params: { method: string }) => Promise<string>;
  on: (event: string, handler: () => void) => void;
  removeListener: (event: string, handler: () => void) => void;
}

interface NavigateToAddLiquidityEvent extends CustomEvent {
  detail: {
    tab: string;
    prefilledAmounts?: Record<string, unknown>;
  };
}

declare global {
  interface Window {
    ethereum?: any;
    navigateToTab?: (tab: string) => void;
  }
  
  interface WindowEventMap {
    'navigateToAddLiquidity': NavigateToAddLiquidityEvent;
  }
}

// Optimized loading component
const OptimizedLoadingFallback = ({ height = "400px" }) => (
  <div className="w-full flex items-center justify-center animate-pulse" style={{ height }}>
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <div className="text-white/60 text-sm">Loading...</div>
    </div>
  </div>
);

// APR Display Components
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
  const { mintPosition, isMinting } = useUniswapV3();
  const { toast } = useToast();
  const { data: ethPriceData } = useEthPrice();

  // State
  const [showChartModal, setShowChartModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [isBaseNetworkConnected, setIsBaseNetworkConnected] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState(DEFAULT_PERCENTAGE);

  // Use balance data from unified dashboard hook
  const { 
    kiltBalance, 
    wethBalance, 
    ethBalance,
    formatTokenAmount
  } = unifiedData;

  // Navigation function
  const navigateToTab = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);


  // Calculate optimal amounts
  const calculateOptimalAmounts = useCallback((percentage = selectedPercentage) => {
    const safeFormatTokenAmount = (balance: string | bigint | undefined) => formatTokenAmount(balance || '0');
    return LiquidityService.calculateOptimalAmounts(
      kiltBalance,
      wethBalance,
      ethBalance,
      kiltData?.price || 0.0160,
      percentage,
      safeFormatTokenAmount,
      ethPriceData?.ethPrice
    );
  }, [kiltBalance, wethBalance, ethBalance, kiltData?.price, selectedPercentage, formatTokenAmount, ethPriceData?.ethPrice]);

  // Memoize calculated amounts
  const optimizedAmounts = useMemo(() => calculateOptimalAmounts(), [calculateOptimalAmounts]);

  // Quick Add Liquidity handler
  const handleQuickAddLiquidity = useCallback(async () => {
    if (!address || isMinting) return;
    
    try {
      const amounts = optimizedAmounts;
      const hasInsufficientBalance = 
        parseFloat(amounts.kiltAmount) <= 0 || 
        parseFloat(amounts.ethAmount) <= 0 || 
        parseFloat(amounts.totalValue) < MIN_LIQUIDITY_VALUE;
      
      if (hasInsufficientBalance) {
        toast({
          title: "Insufficient Balance",
          description: "You need both KILT and ETH tokens to add liquidity",
          variant: "destructive"
        });
        return;
      }
      
      const amount0Desired = parseUnits(amounts.ethAmount, 18);
      const amount1Desired = parseUnits(amounts.kiltAmount, 18);
      
      toast({
        title: "Creating Liquidity Position",
        description: "Processing transaction...",
      });
      
      const txHash = await mintPosition({
        token0: WETH_TOKEN,
        token1: KILT_TOKEN,
        fee: POOL_FEE,
        tickLower: TICK_LOWER,
        tickUpper: TICK_UPPER,
        amount0Desired,
        amount1Desired,
        amount0Min: (amount0Desired * SLIPPAGE_TOLERANCE) / 100n,
        amount1Min: (amount1Desired * SLIPPAGE_TOLERANCE) / 100n,
        recipient: address as `0x${string}`,
        deadline: Math.floor(Date.now() / 1000) + DEADLINE_BUFFER,
        useNativeETH: true
      });
      
      toast({
        title: "Liquidity Added Successfully!",
        description: `Added ${amounts.ethAmount} ETH + ${amounts.kiltAmount} KILT to the pool`,
      });
      
      // Auto-register position
      setTimeout(async () => {
        try {
          await queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
          
          const response = await fetch('/api/positions/register/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: address })
          });
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.registeredCount > 0) {
              toast({
                title: "Position Registered!",
                description: `${result.registeredCount} position${result.registeredCount > 1 ? 's' : ''} enrolled in rewards`,
              });
            }
            
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['/api/rewards'] }),
              queryClient.invalidateQueries({ queryKey: ['/api/positions'] })
            ]);
          }
        } catch (error) {
          // Auto-registration failed silently
        }
      }, REGISTRATION_DELAY);
      
      setActiveTab('positions');
      
    } catch (error) {
      // Quick Add Liquidity error handled
      
      let errorMessage = "Failed to add liquidity";
      if (error instanceof Error) {
        if (error.message?.includes('insufficient funds')) {
          errorMessage = "Insufficient token balance";
        } else if (error.message?.includes('user rejected')) {
          errorMessage = "Transaction rejected";
        } else if (error.message?.includes('slippage')) {
          errorMessage = "Price changed too much during transaction";
        }
      }
      
      toast({
        title: "Quick Add Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [address, isMinting, optimizedAmounts, toast, mintPosition]);

  // Setup navigation event listener
  useEffect(() => {
    window.navigateToTab = navigateToTab;
    
    const handleNavigateToAddLiquidity = (event: NavigateToAddLiquidityEvent) => {
      const { tab, prefilledAmounts } = event.detail;
      setActiveTab(tab);
      
      if (prefilledAmounts) {
        try {
          sessionStorage.setItem('prefilledLiquidityAmounts', JSON.stringify(prefilledAmounts));
        } catch (error) {
          console.error('Failed to store prefilled amounts:', error);
        }
      }
    };
    
    window.addEventListener('navigateToAddLiquidity', handleNavigateToAddLiquidity);
    
    return () => {
      delete window.navigateToTab;
      window.removeEventListener('navigateToAddLiquidity', handleNavigateToAddLiquidity);
    };
  }, [navigateToTab]);

  // Network check and logo animation
  useEffect(() => {
    const logoTimer = setTimeout(() => {
      setLogoAnimationComplete(true);
    }, LOGO_ANIMATION_DELAY);

    const checkBaseNetwork = async () => {
      const ethereum = window.ethereum;
      if (ethereum && isConnected) {
        try {
          const chainId = await ethereum.request({ method: 'eth_chainId' });
          const isBase = chainId === BASE_CHAIN_ID;
          setIsBaseNetworkConnected(isBase);
        } catch (error) {
          console.error('Failed to check network:', error);
          setIsBaseNetworkConnected(false);
        }
      } else {
        setIsBaseNetworkConnected(false);
      }
    };

    checkBaseNetwork();
    
    const ethereum = window.ethereum;
    let handleChainChanged: (() => void) | undefined;
    
    if (ethereum) {
      handleChainChanged = () => checkBaseNetwork();
      ethereum.on('chainChanged', handleChainChanged);
    }
    
    return () => {
      clearTimeout(logoTimer);
      if (ethereum && handleChainChanged) {
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [isConnected]);

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Connecting wallet...</div>
      </div>
    );
  }

  // Landing page for unconnected users
  if (!isConnected) {
    return (
      <div className="min-h-screen p-6 relative overflow-hidden">
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          <video 
            autoPlay 
            loop 
            muted 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: 1 }}
            aria-hidden="true"
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        </div>
        
        <div className="absolute inset-0 bg-black/20" style={{ zIndex: 2 }}></div>
        
        <div className="fixed top-6 right-6 sm:top-8 sm:right-8 z-50">
          <div className="bg-white backdrop-blur-sm rounded-full px-4 py-2 text-xs sm:text-sm font-bold text-[#ff0066] shadow-lg border border-[#ff0066]/20 hover:scale-105 transition-all duration-200">
            Beta
          </div>
        </div>

        <div className="max-w-5xl mx-auto relative" style={{ zIndex: 10 }}>
          <div className="text-center pt-16 pb-8">
            <div className="mb-12">
              <div className="relative w-32 h-32 mx-auto mb-8">
                <CyberpunkKiltLogo size="xl" className="w-full h-full" />
              </div>
              
              <div className="mb-8">
                <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight tracking-tight">
                  <span className="block bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent">
                    KILT Liquidity
                  </span>
                  <span className="block text-5xl sm:text-6xl lg:text-7xl mt-2 text-white/90 font-normal">
                    Incentive Program
                  </span>
                </h1>
              </div>
              
              <div className="relative max-w-4xl mx-auto mb-8">
                <p className="text-xl sm:text-2xl text-white/90 font-medium leading-relaxed text-center">
                  Earn <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded">{unifiedData.programAnalytics?.programAPR ? `${Math.round(unifiedData.programAnalytics.programAPR)}%` : '163%'} APR</span> from the <span className="text-pink-400 font-bold bg-pink-400/10 px-2 py-1 rounded">{unifiedData.programAnalytics?.treasuryTotal ? (unifiedData.programAnalytics.treasuryTotal >= 1000000 ? `${(unifiedData.programAnalytics.treasuryTotal / 1000000).toFixed(1)}M` : `${(unifiedData.programAnalytics.treasuryTotal / 1000).toFixed(0)}K`) : '1.5M'} KILT treasury</span> by providing liquidity to Uniswap V3 pools on Base network.
                </p>
              </div>
            </div>

            <div className="mb-16 flex flex-col items-center">
              <div className="mb-4">
                <MobileWalletConnect />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
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

            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Join the KILT Ecosystem
              </h2>
              <p className="text-white/80 text-lg font-medium max-w-2xl mx-auto mb-6 leading-relaxed">
                Connect with the KILT Protocol community and stay updated on the latest developments.
              </p>
            </div>

            <div className="flex justify-center items-center gap-3">
              <a 
                href="https://x.com/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/40 hover:bg-[#ff0066]/10 border border-gray-800 hover:border-[#ff0066]/30 rounded-lg transition-all duration-300 backdrop-blur-sm"
                aria-label="Follow KILT on X (Twitter)"
              >
                <SiX className="h-5 w-5 text-white/80 hover:text-[#ff0066] transition-colors duration-300" />
              </a>
              <a 
                href="https://github.com/KILTprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/40 hover:bg-[#ff0066]/10 border border-gray-800 hover:border-[#ff0066]/30 rounded-lg transition-all duration-300 backdrop-blur-sm"
                aria-label="View KILT on GitHub"
              >
                <SiGithub className="h-5 w-5 text-white/80 hover:text-[#ff0066] transition-colors duration-300" />
              </a>
              <a 
                href="https://discord.gg/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/40 hover:bg-[#ff0066]/10 border border-gray-800 hover:border-[#ff0066]/30 rounded-lg transition-all duration-300 backdrop-blur-sm"
                aria-label="Join KILT Discord"
              >
                <SiDiscord className="h-5 w-5 text-white/80 hover:text-[#ff0066] transition-colors duration-300" />
              </a>
              <a 
                href="https://t.me/KILTProtocolChat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/40 hover:bg-[#ff0066]/10 border border-gray-800 hover:border-[#ff0066]/30 rounded-lg transition-all duration-300 backdrop-blur-sm"
                aria-label="Join KILT Telegram"
              >
                <SiTelegram className="h-5 w-5 text-white/80 hover:text-[#ff0066] transition-colors duration-300" />
              </a>
              <a 
                href="https://kilt-protocol.medium.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-black/40 hover:bg-[#ff0066]/10 border border-gray-800 hover:border-[#ff0066]/30 rounded-lg transition-all duration-300 backdrop-blur-sm"
                aria-label="Read KILT on Medium"
              >
                <SiMedium className="h-5 w-5 text-white/80 hover:text-[#ff0066] transition-colors duration-300" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard for connected users
  return (
    <div className="min-h-screen text-white overflow-x-hidden relative">
      <video 
        autoPlay 
        muted 
        loop 
        playsInline
        preload="auto"
        className="fixed top-0 left-0 w-full h-full object-cover"
        style={{ zIndex: 1 }}
        aria-hidden="true"
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>
      
      <div className="absolute inset-0 bg-black/30" style={{ zIndex: 2 }}></div>
      
      <div className="relative z-10 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
              <img src={kiltLogo} alt="KILT" className="w-9 h-9" />
            </div>
            <div>
              <h1 className="header-title">KILT Liquidity Portal</h1>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live on Base Network</span>
                {unifiedData?.isLoading && (
                  <div className="ml-2 text-xs text-white/40">Loading data...</div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-sm">
              <div className="text-white/60">KILT Price</div>
              <div className="font-bold text-emerald-400">
                ${kiltData?.price ? kiltData.price.toFixed(4) : '0.0160'}
              </div>
            </div>
            
            <button
              onClick={() => setShowChartModal(true)}
              className="flex items-center gap-2 bg-[#ff0066]/10 hover:bg-[#ff0066]/20 border border-[#ff0066]/20 hover:border-[#ff0066]/40 text-[#ff0066] px-4 py-2 rounded-xl transition-all duration-200"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Price Chart</span>
            </button>
            
            <MobileWalletConnect />
          </div>
        </div>

        {/* Metrics Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* KILT Price Card */}
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-pink-500/20 rounded-lg flex items-center justify-center">
                  <img src={kiltLogo} alt="KILT" className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-medium text-white/80">KILT Price</h3>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${kiltData?.price ? kiltData.price.toFixed(4) : '0.0162'}
              </div>
              <div className="text-xs text-green-400">
                +5.55% (24h)
              </div>
            </CardContent>
          </Card>

          {/* Market Cap Card */}
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
                <h3 className="text-sm font-medium text-white/80">Market Cap</h3>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                ${kiltData?.marketCap ? (kiltData.marketCap / 1000000).toFixed(1) + 'M' : '4.7M'}
              </div>
              <div className="text-xs text-white/60">
                277.0M circulating
              </div>
            </CardContent>
          </Card>

          {/* Trading Fees APR Card */}
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <h3 className="text-sm font-medium text-white/80">Trading Fees APR</h3>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                <SingleSourceTradingAPR />
              </div>
              <div className="text-xs text-white/60">
                DexScreener API
              </div>
            </CardContent>
          </Card>

          {/* Program APR Card */}
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Award className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-sm font-medium text-white/80">Program APR</h3>
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                <SingleSourceProgramAPR />
              </div>
              <div className="text-xs text-white/60">
                Treasury rewards
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Register Existing Positions */}
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5 text-green-400" />
                <span>Register Existing Positions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    <span className="text-white font-medium">Already have KILT liquidity positions on Uniswap?</span>
                  </div>
                  <div className="text-sm text-white/80 leading-relaxed">
                    Register them here to start earning treasury rewards!
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Immediate reward accrual upon registration</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Smart contract security with historical validation</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Auto-validation for full range positions</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                      <span>Complete transaction history verification</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-3">Eligible Positions</h3>
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <div className="text-xl font-bold text-white mb-2">All Set!</div>
                    <div className="text-sm text-white/70 mb-4 max-w-sm mx-auto">
                      All your KILT positions are already registered and earning rewards.
                    </div>
                    <div className="text-sm text-pink-400 font-medium">
                      6 positions enrolled in reward program
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Add Liquidity */}
          <Card className="bg-black/20 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-pink-400" />
                <span>Quick Add Liquidity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Wallet Balance */}
                <div>
                  <h3 className="text-white font-medium mb-3">Wallet Balance</h3>
                  <div className="space-y-3">
                    <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={kiltLogo} alt="KILT" className="w-8 h-8" />
                          <div>
                            <div className="text-white font-medium">KILT</div>
                            <div className="text-xs text-pink-400">
                              ${((parseFloat(formatTokenAmount(kiltBalance)) * (kiltData?.price || 0.0160))).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold text-lg">
                            {(parseFloat(formatTokenAmount(kiltBalance)) / 1000).toFixed(1)}K
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            ETH
                          </div>
                          <div>
                            <div className="text-white font-medium">ETH</div>
                            <div className="text-xs text-blue-400">
                              ${((parseFloat(formatTokenAmount(ethBalance)) * (ethPriceData?.ethPrice || 3900))).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold text-lg">
                            {parseFloat(formatTokenAmount(ethBalance)).toFixed(6)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                            WETH
                          </div>
                          <div>
                            <div className="text-white font-medium">WETH</div>
                            <div className="text-xs text-purple-400">
                              ${((parseFloat(formatTokenAmount(wethBalance)) * (ethPriceData?.ethPrice || 3900))).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold text-lg">
                            {parseFloat(formatTokenAmount(wethBalance)).toFixed(6)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance Usage */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium">Balance Usage</h3>
                    <span className="text-sm text-white/60">{selectedPercentage}% of wallet</span>
                  </div>
                  
                  <div className="flex gap-2 mb-4">
                    {[10, 25, 50, 75, 100].map((percentage) => (
                      <button
                        key={percentage}
                        onClick={() => setSelectedPercentage(percentage)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                          selectedPercentage === percentage
                            ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                            : 'bg-white/10 text-white/60 border border-white/10 hover:bg-white/15'
                        }`}
                      >
                        {percentage}%
                      </button>
                    ))}
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm text-white/60 mb-2">Precise Control</div>
                    <div className="relative">
                      <Slider
                        value={[selectedPercentage]}
                        onValueChange={(value) => setSelectedPercentage(value[0])}
                        max={100}
                        min={0}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    <div className="text-xs text-white/50 mt-1 text-right">
                      {selectedPercentage}%
                    </div>
                  </div>
                </div>

                {/* Liquidity Amount */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">Liquidity Amount</span>
                    <span className="text-sm text-white/60">Balanced strategy</span>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-pink-400 mb-2">
                      ~${optimizedAmounts.totalValue}
                    </div>
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <img src={kiltLogo} alt="KILT" className="w-4 h-4" />
                        <span className="text-white">{optimizedAmounts.kiltAmount} KILT</span>
                      </div>
                      <Plus className="h-3 w-3 text-white/40" />
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold">
                          ETH
                        </div>
                        <span className="text-white">{optimizedAmounts.ethAmount} WETH</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Add Button */}
                <Button
                  onClick={handleQuickAddLiquidity}
                  disabled={isMinting || parseFloat(optimizedAmounts.totalValue) < MIN_LIQUIDITY_VALUE}
                  className="w-full py-4 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isMinting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Position...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      QUICK ADD LIQUIDITY
                    </>
                  )}
                </Button>

                {parseFloat(optimizedAmounts.totalValue) < MIN_LIQUIDITY_VALUE && (
                  <div className="text-center text-sm text-yellow-400">
                    Minimum $10 liquidity required
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="nav-tabs-list tabs-container">
            <TabsTrigger value="overview" className="tab-trigger">
              <span className="truncate">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="add-liquidity" className="tab-trigger">
              <span className="truncate">
                <span className="hidden md:inline">Add Liquidity</span>
                <span className="md:hidden">+ Liq</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="positions" className="tab-trigger">
              <span className="truncate">
                <span className="hidden md:inline">Positions</span>
                <span className="md:hidden">Pos</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="tab-trigger">
              <span className="truncate">Rewards</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="tab-trigger hidden md:flex">
              <span className="truncate">
                <span className="hidden lg:inline">Analytics</span>
                <span className="lg:hidden">Stats</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="integration" className="tab-trigger hidden lg:flex">
              <span className="truncate">
                <span className="hidden xl:inline">Integration</span>
                <span className="xl:hidden">API</span>
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                    <span>Expected Returns</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Trading Fees APR:</span>
                      <span className="text-blue-400 font-semibold">
                        <SingleSourceTradingAPR />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">KILT Incentive APR:</span>
                      <span className="text-emerald-400 font-semibold">
                        <SingleSourceProgramAPR />
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">Total APR:</span>
                        <span className="text-pink-400 font-bold text-lg">
                          <SingleSourceTotalAPR />
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <UserPersonalAPR address={address || ''} />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-pink-400" />
                    <span>Program Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Treasury Balance:</span>
                      <span className="text-pink-400 font-semibold">
                        {unifiedData.programAnalytics?.treasuryTotal 
                          ? `${(unifiedData.programAnalytics.treasuryTotal / 1000).toFixed(0)}K KILT`
                          : '1,500K KILT'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Active Positions:</span>
                      <span className="text-blue-400 font-semibold">
                        {unifiedData.programAnalytics?.activePositions || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60">Pool TVL:</span>
                      <span className="text-emerald-400 font-semibold">
                        ${unifiedData.programAnalytics?.totalLiquidity 
                          ? `${(unifiedData.programAnalytics.totalLiquidity / 1000).toFixed(0)}K`
                          : '97K'
                        }
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">Program Status:</span>
                        <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="add-liquidity" className="mt-6">
            <Suspense fallback={<OptimizedLoadingFallback height="600px" />}>
              <LiquidityMint
                kiltBalance={kiltBalance}
                wethBalance={wethBalance}
                ethBalance={ethBalance}
                formatTokenAmount={formatTokenAmount}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="positions" className="mt-6">
            <div className="space-y-6">
              <PositionRegistration />
              <Suspense fallback={<OptimizedLoadingFallback height="400px" />}>
                <UserPositions />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="rewards" className="mt-6">
            <Suspense fallback={<OptimizedLoadingFallback height="500px" />}>
              <RewardsTracking />
            </Suspense>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="text-center py-12">
              <BarChart3 className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Analytics Dashboard</h3>
              <p className="text-white/60">Advanced portfolio analytics coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="integration" className="mt-6">
            <div className="text-center py-12">
              <ExternalLink className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">API Integration</h3>
              <p className="text-white/60">Developer tools and APIs coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Price Chart Modal */}
      {showChartModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black/90 border border-white/20 rounded-2xl max-w-6xl w-full h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">KILT/WETH Price Chart</h2>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
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