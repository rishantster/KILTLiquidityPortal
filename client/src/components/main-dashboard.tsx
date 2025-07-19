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
import { CookieConsent } from './cookie-consent';
import { KiltCookieManager } from '../utils/cookie-manager';

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
import backgroundVideo from '@assets/Untitled design (22)_1752822331413.mp4';
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
  const [showSocialButtons, setShowSocialButtons] = useState(false);
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

  // Scroll detection for social buttons
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Show social buttons when user is within 200px of the bottom
      const isNearBottom = scrollTop + windowHeight >= documentHeight - 200;
      setShowSocialButtons(isNearBottom);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
              
              {/* Main Headline - Clean Typography */}
              <h1 className="text-6xl sm:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                <span className="block text-white">KILT Liquidity</span>
                <span className="block text-white/90 text-5xl sm:text-6xl font-normal">
                  Incentive Program
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-white/90 font-medium max-w-4xl mx-auto mb-8 leading-relaxed">
                Earn <span className="text-matrix-green font-bold">up to {unifiedData.maxAPRData?.aprRange || '112%'} APR</span> from the <span className="text-pink-400 font-bold">{unifiedData.programAnalytics?.totalBudget ? `${(Number(unifiedData.programAnalytics.totalBudget) / 1000000).toFixed(1)}M KILT treasury` : '1.0M KILT treasury'}</span> by providing liquidity to Uniswap V3 pools on Base network.
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
                      Receive attractive rewards from <span className="text-pink-400">{unifiedData.programAnalytics?.totalBudget ? `${(Number(unifiedData.programAnalytics.totalBudget) / 1000000).toFixed(1)}M KILT` : '1.0M KILT'}</span> treasury allocation with secure smart contract distribution.
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

            {/* Social Media Navigation - Card-based design matching site theme */}
            <div className={`
              hidden md:fixed md:right-6 md:top-1/2 md:transform md:-translate-y-1/2 md:flex md:flex-col md:space-y-3 md:z-50
              ${showSocialButtons ? 'md:opacity-100' : 'md:opacity-100'}
            `}>
              {/* Desktop Social Navigation */}
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-2xl shadow-black/50">
                <div className="flex flex-col space-y-3">
                  <a 
                    href="https://x.com/kiltprotocol" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/30 rounded-lg border border-[#ff0066]/40 hover:scale-105 transition-transform duration-200"
                    title="Follow us on X"
                  >
                    <SiX className="h-4 w-4 text-white group-hover:text-[#ff0066] transition-colors duration-300" />
                  </a>
                  <a 
                    href="https://github.com/KILTprotocol" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/30 rounded-lg border border-[#ff0066]/40 hover:scale-105 transition-transform duration-200"
                    title="View our GitHub"
                  >
                    <SiGithub className="h-4 w-4 text-white group-hover:text-[#ff0066] transition-colors duration-300" />
                  </a>
                  <a 
                    href="https://discord.gg/kiltprotocol" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/30 rounded-lg border border-[#ff0066]/40 hover:scale-105 transition-transform duration-200"
                    title="Join our Discord"
                  >
                    <SiDiscord className="h-4 w-4 text-white group-hover:text-[#ff0066] transition-colors duration-300" />
                  </a>
                  <a 
                    href="https://t.me/KILTProtocolChat" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/30 rounded-lg border border-[#ff0066]/40 hover:scale-105 transition-transform duration-200"
                    title="Join our Telegram"
                  >
                    <SiTelegram className="h-4 w-4 text-white group-hover:text-[#ff0066] transition-colors duration-300" />
                  </a>
                  <a 
                    href="https://kilt-protocol.medium.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/30 rounded-lg border border-[#ff0066]/40 hover:scale-105 transition-transform duration-200"
                    title="Read our Medium"
                  >
                    <SiMedium className="h-4 w-4 text-white group-hover:text-[#ff0066] transition-colors duration-300" />
                  </a>
                </div>
              </div>
            </div>

            {/* Mobile Social Navigation - Bottom card when scrolled to bottom */}
            <div className={`
              md:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300
              ${showSocialButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
            `}>
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-2xl shadow-black/50">
                <div className="flex space-x-3">
                  <a 
                    href="https://x.com/kiltprotocol" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/30 rounded-lg border border-[#ff0066]/40 hover:scale-105 transition-transform duration-200"
                  >
                    <SiX className="h-4 w-4 text-white group-hover:text-[#ff0066] transition-colors duration-300" />
                  </a>
                  <a 
                    href="https://github.com/KILTprotocol" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/30 rounded-lg border border-[#ff0066]/40 hover:scale-105 transition-transform duration-200"
                  >
                    <SiGithub className="h-4 w-4 text-white group-hover:text-[#ff0066] transition-colors duration-300" />
                  </a>
                  <a 
                    href="https://discord.gg/kiltprotocol" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/30 rounded-lg border border-[#ff0066]/40 hover:scale-105 transition-transform duration-200"
                  >
                    <SiDiscord className="h-4 w-4 text-white group-hover:text-[#ff0066] transition-colors duration-300" />
                  </a>
                  <a 
                    href="https://t.me/KILTProtocolChat" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/30 rounded-lg border border-[#ff0066]/40 hover:scale-105 transition-transform duration-200"
                  >
                    <SiTelegram className="h-4 w-4 text-white group-hover:text-[#ff0066] transition-colors duration-300" />
                  </a>
                  <a 
                    href="https://kilt-protocol.medium.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#ff0066]/20 to-[#ff0066]/30 rounded-lg border border-[#ff0066]/40 hover:scale-105 transition-transform duration-200"
                  >
                    <SiMedium className="h-4 w-4 text-white group-hover:text-[#ff0066] transition-colors duration-300" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tab definitions
  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'liquidity', label: 'Add Liquidity', icon: Plus },
    { id: 'rewards', label: 'Rewards', icon: Award },
    { id: 'positions', label: 'Positions', icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-black text-green-400 terminal-font overflow-x-hidden relative terminal-scan">
      {/* Terminal Background Pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            #00ff41 2px,
            #00ff41 4px
          )`
        }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto p-4 relative z-10">
        {/* TERMINAL HEADER */}
        <div className="terminal-window mb-6 terminal-boot">
          <div className="terminal-header">
            <span className="terminal-text-bright">KILT_LIQUIDITY_PORTAL.exe</span>
            <span className="ml-auto text-xs terminal-text-dim">[RUNNING]</span>
          </div>
          <div className="terminal-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 border border-green-400 flex items-center justify-center terminal-flicker">
                  <img src={kiltLogo} alt="KILT" className="w-8 h-8 brightness-0 invert" style={{filter: 'hue-rotate(90deg) brightness(2)'}} />
                </div>
                <div>
                  <h1 className="text-xl terminal-text-bright terminal-glow">
                    KILT LIQUIDITY PORTAL
                  </h1>
                  <p className="text-xs terminal-text-dim terminal-cursor">
                    &gt; DEFI_PROTOCOL_v2.1.337_AUTHENTICATED
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 text-xs">
                  <span className="terminal-text-dim">NET:</span>
                  <span className={isConnected && isBaseNetworkConnected ? 'status-online' : 'status-error'}>
                    BASE_{isConnected && isBaseNetworkConnected ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  <WalletConnect />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TERMINAL NAVIGATION */}
        <div className="terminal-window mb-6 terminal-boot">
          <div className="terminal-header">
            <span className="terminal-text-bright">NAVIGATION_MENU.exe</span>
            <span className="ml-auto text-xs terminal-text-dim">[SELECT_MODULE]</span>
          </div>
          <div className="terminal-content">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`terminal-button ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <tab.icon className="inline w-4 h-4 mr-2" />
                  {tab.label.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hidden Navigation Tabs (replaced by right-side vertical navigation) */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // Invalidate positions cache when switching to positions tab
          if (value === 'positions') {
            queryClient.invalidateQueries({ queryKey: ['wallet-positions'] });
          }
        }} className="w-full">
          {/* Navigation now handled by right-side vertical buttons */}

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* TERMINAL SYSTEM STATUS */}
            <div className="terminal-window terminal-boot">
              <div className="terminal-header">
                <span className="terminal-text-bright">SYSTEM_STATUS.exe</span>
                <span className="ml-auto text-xs terminal-text-dim">[REAL_TIME_DATA]</span>
              </div>
              <div className="terminal-content">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* KILT Price */}
                  <div className="terminal-card">
                    <div className="text-center">
                      <div className="w-8 h-8 border border-green-400 mx-auto mb-2 flex items-center justify-center">
                        <span className="text-green-400 text-xs">K</span>
                      </div>
                      <div className="text-xs terminal-text-dim mb-1">KILT_PRICE</div>
                      <div className="terminal-text-bright terminal-flicker text-sm">
                        ${kiltData?.price?.toFixed(4) || '0.0289'}
                      </div>
                      <div className="text-xs status-online">+0.50%</div>
                    </div>
                  </div>

                  {/* Market Cap */}
                  <div className="terminal-card">
                    <div className="text-center">
                      <div className="w-8 h-8 border border-green-400 mx-auto mb-2 flex items-center justify-center">
                        <Coins className="h-4 w-4 text-green-400" />
                      </div>
                      <div className="text-xs terminal-text-dim mb-1">MARKET_CAP</div>
                      <div className="terminal-text-bright terminal-flicker text-sm">
                        ${kiltData?.marketCap ? (kiltData.marketCap / 1000000).toFixed(1) : '4.4'}M
                      </div>
                      <div className="text-xs terminal-text-dim">276.97M_SUPPLY</div>
                    </div>
                  </div>

                  {/* Your Reward APR */}
                  <div className="terminal-card">
                    <div className="text-center">
                      <div className="w-8 h-8 border border-green-400 mx-auto mb-2 flex items-center justify-center">
                        <Award className="h-4 w-4 text-green-400" />
                      </div>
                      <div className="text-xs terminal-text-dim mb-1">REWARD_APR</div>
                      <div className="terminal-text-bright terminal-flicker text-sm">
                        {address ? (
                          <UserPersonalAPR address={address} />
                        ) : (
                          <div>
                            <span className="status-error">--</span>
                            <div className="text-xs terminal-text-dim mt-1">CONNECT_WALLET</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Maximum APR */}
                  <div className="terminal-card">
                    <div className="text-center">
                      <div className="w-8 h-8 border border-green-400 mx-auto mb-2 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                      </div>
                      <div className="text-xs terminal-text-dim mb-1">CURRENT_APR</div>
                      <div className="terminal-text-bright terminal-flicker text-sm">
                        {unifiedData?.maxAPRData?.aprRange || '112%'}
                      </div>
                      <div className="text-xs status-online">HIGH_YIELDS</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TERMINAL ACTION MODULES */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Left Column - Position Registration */}
              <div className="terminal-window terminal-boot">
                <div className="terminal-header">
                  <span className="terminal-text-bright">POSITION_REGISTRY.exe</span>
                  <span className="ml-auto text-xs terminal-text-dim">[REGISTER_EXISTING]</span>
                </div>
                <div className="terminal-content">
                  <PositionRegistration />
                </div>
              </div>

              {/* Right Column - Quick Add Liquidity */}
              <div className="terminal-window terminal-boot">
                <div className="terminal-header">
                  <span className="terminal-text-bright">LIQUIDITY_PROVISION.exe</span>
                  <span className="ml-auto text-xs terminal-text-dim">[QUICK_ADD]</span>
                </div>
                <div className="terminal-content">
                  <div className="space-y-4">
                    {/* Wallet Balance Terminal Display */}
                    <div className="terminal-prompt terminal-text-dim mb-2">WALLET_BALANCE:</div>
                    <div className="terminal-table text-xs">
                      <div className="flex justify-between py-1">
                        <span>KILT:</span>
                        <span className="terminal-text-bright">{kiltBalance ? parseFloat(kiltBalance).toLocaleString() : '0'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>ETH:</span>
                        <span className="terminal-text-bright">{ethBalance ? parseFloat(ethBalance).toFixed(6) : '0.000000'}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>WETH:</span>
                        <span className="terminal-text-bright">{wethBalance ? parseFloat(wethBalance).toFixed(6) : '0.000000'}</span>
                      </div>
                    </div>

                    {/* Terminal Balance Usage */}
                    <div className="mt-4">
                      <div className="terminal-prompt terminal-text-dim mb-2">USAGE: {selectedPercentage}%</div>
                      <div className="flex gap-1">
                        {LiquidityService.getPercentageOptions().map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setSelectedPercentage(value)}
                            className={`terminal-button text-xs px-2 py-1 ${selectedPercentage === value ? 'active' : ''}`}
                          >
                            {label}
                          </button>
                        ))}
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
      
      {/* Cookie Consent Modal */}
      <CookieConsent 
        onAccept={() => {
          // Initialize performance cookies on acceptance
          KiltCookieManager.setPreferences({
            theme: 'dark',
            currency: 'USD',
            notifications: true
          });
        }}
      />
    </div>
  );
}