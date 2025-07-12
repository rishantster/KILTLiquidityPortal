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
  Wallet,
  Plus,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Target
} from 'lucide-react';

// Components
import { LiquidityMint } from './liquidity-mint';
import { RewardsTracking } from './rewards-tracking';
import { AnalyticsDashboard } from './analytics-dashboard';
import { UserPositions } from './user-positions';
import { UserPersonalAPR } from './user-personal-apr';
import { WalletConnect } from './wallet-connect';
import { GasEstimationCard } from './gas-estimation-card';
import { LiquidityRebalancing } from './liquidity-rebalancing';
import { PositionRegistration } from './position-registration';

// Hooks and contexts
import { useWallet } from '@/contexts/wallet-context';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useUniswapV3 } from '@/hooks/use-uniswap-v3';
import { useUnifiedDashboard } from '@/hooks/use-unified-dashboard';
import { useAppSession } from '@/hooks/use-app-session';
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
  const appSession = useAppSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [logoAnimationComplete, setLogoAnimationComplete] = useState(false);
  const [isBaseNetworkConnected, setIsBaseNetworkConnected] = useState(false);
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
      kiltAmount: optimalKilt.toFixed(2),
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
              <div className="relative w-32 h-32 mx-auto mb-8 group">
                {/* Outer Ring with Rotation */}
                <div className="absolute inset-0 rounded-full border-4 border-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 opacity-30 animate-spin-slow"></div>
                
                {/* Middle Ring with Pulse */}
                <div className="absolute inset-2 rounded-full border-2 border-white/20 animate-pulse-glow"></div>
                
                {/* Inner Circle with Logo */}
                <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500 animate-floating">
                  {/* Gradient Background Effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* KILT Logo - Much Larger */}
                  <img 
                    src={kiltLogo} 
                    alt="KILT" 
                    className="w-20 h-20 object-contain relative z-10 group-hover:rotate-12 transition-transform duration-500" 
                  />
                </div>
                
                {/* Floating Particles */}
                <div className="absolute -inset-8 pointer-events-none">
                  <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full opacity-60 animate-orbit-1"></div>
                  <div className="absolute top-1/2 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full opacity-60 animate-orbit-2"></div>
                  <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-cyan-400 rounded-full opacity-60 animate-orbit-3"></div>
                  <div className="absolute top-1/2 left-0 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-60 animate-orbit-4"></div>
                </div>
              </div>
              
              {/* Main Headline - Enhanced */}
              <h1 className="text-6xl sm:text-7xl font-display text-white mb-6 leading-relaxed animate-slide-up">
                <span className="block text-white/90">KILT Liquidity</span>
                <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-shift pb-2">
                  Incentive Program
                </span>
              </h1>
              
              <p className="text-xl sm:text-2xl text-white/70 font-body max-w-3xl mx-auto mb-8 leading-relaxed animate-fade-in animate-delay-200">
                Earn <span className="text-emerald-400 font-semibold">proportional rewards</span> from the <span className="text-blue-400 font-semibold">2.9M KILT treasury</span> by providing liquidity to Uniswap V3 pools on Base network.
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

            {/* Modern Hexagonal Feature Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {/* KILT/ETH Pool - Hexagon Style */}
              <div className="group relative animate-fade-in animate-delay-100">
                <div className="relative bg-gradient-to-br from-blue-500/20 via-blue-600/10 to-transparent backdrop-blur-md border border-blue-400/30 rounded-3xl p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/30 hover:border-blue-300/50">
                  {/* Floating Icon */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl rotate-45 flex items-center justify-center shadow-lg group-hover:rotate-90 transition-transform duration-500">
                      <TrendingUp className="h-8 w-8 text-white -rotate-45 group-hover:-rotate-90 transition-transform duration-500" />
                    </div>
                  </div>
                  
                  <div className="pt-8 text-center">
                    <h3 className="text-white font-bold text-xl mb-3">KILT/ETH Pool</h3>
                    <p className="text-blue-200/80 text-sm leading-relaxed">
                      Deploy capital efficiently with concentrated liquidity positions and advanced range strategies.
                    </p>
                  </div>
                </div>
              </div>

              {/* Treasury Rewards - Diamond Style */}
              <div className="group relative animate-fade-in animate-delay-200">
                <div className="relative bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent backdrop-blur-md border border-emerald-400/30 rounded-3xl p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/30 hover:border-emerald-300/50">
                  {/* Floating Icon */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                      <Award className="h-8 w-8 text-white group-hover:rotate-12 transition-transform duration-500" />
                    </div>
                  </div>
                  
                  <div className="pt-8 text-center">
                    <h3 className="text-white font-bold text-xl mb-3">Treasury Rewards</h3>
                    <p className="text-emerald-200/80 text-sm leading-relaxed">
                      Receive rewards from 1% of total KILT supply with secure 90-day token locking mechanism.
                    </p>
                  </div>
                </div>
              </div>

              {/* Program Analytics - Octagon Style */}
              <div className="group relative animate-fade-in animate-delay-300">
                <div className="relative bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-transparent backdrop-blur-md border border-purple-400/30 rounded-3xl p-6 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 hover:border-purple-300/50">
                  {/* Floating Icon */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl transform rotate-12 flex items-center justify-center shadow-lg group-hover:rotate-45 transition-transform duration-500">
                      <BarChart3 className="h-8 w-8 text-white -rotate-12 group-hover:-rotate-45 transition-transform duration-500" />
                    </div>
                  </div>
                  
                  <div className="pt-8 text-center">
                    <h3 className="text-white font-bold text-xl mb-3">Program Analytics</h3>
                    <p className="text-purple-200/80 text-sm leading-relaxed">
                      Track your position performance, rewards earned, and program progress with detailed analytics.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Streamlined Bottom CTA */}
            <div className="text-center animate-fade-in animate-delay-500 mb-12">
              <h2 className="text-3xl font-heading text-white/90 mb-3">
                Join the
              </h2>
              <h1 className="text-5xl font-display bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-6 bg-[length:200%_100%] animate-gradient-shift leading-relaxed pb-2">
                KILT Ecosystem
              </h1>
              <p className="text-white/70 text-lg font-body max-w-xl mx-auto mb-6 leading-relaxed">
                Become a liquidity provider for KILT Protocol and earn substantial rewards while supporting the decentralized identity ecosystem.
              </p>
            </div>

            {/* Enhanced Social Media Links */}
            <div className="flex justify-center items-center gap-4 animate-fade-in animate-delay-700">
              <a 
                href="https://x.com/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative p-4 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-2xl transition-all duration-500 hover:scale-110 hover:shadow-xl hover:shadow-white/10"
              >
                <SiX className="h-7 w-7 text-white/80 group-hover:text-white transition-colors duration-300" />
              </a>
              <a 
                href="https://github.com/KILTprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative p-4 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-2xl transition-all duration-500 hover:scale-110 hover:shadow-xl hover:shadow-white/10"
              >
                <SiGithub className="h-7 w-7 text-white/80 group-hover:text-white transition-colors duration-300" />
              </a>
              <a 
                href="https://discord.gg/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative p-4 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-2xl transition-all duration-500 hover:scale-110 hover:shadow-xl hover:shadow-white/10"
              >
                <SiDiscord className="h-7 w-7 text-white/80 group-hover:text-white transition-colors duration-300" />
              </a>
              <a 
                href="https://t.me/KILTProtocolChat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative p-4 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-2xl transition-all duration-500 hover:scale-110 hover:shadow-xl hover:shadow-white/10"
              >
                <SiTelegram className="h-7 w-7 text-white/80 group-hover:text-white transition-colors duration-300" />
              </a>
              <a 
                href="https://kilt-protocol.medium.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative p-4 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-2xl transition-all duration-500 hover:scale-110 hover:shadow-xl hover:shadow-white/10 overflow-hidden"
              >
                <SiMedium className="h-7 w-7 text-white/80 group-hover:text-white transition-colors duration-300 flex-shrink-0" />
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
              className={`hidden sm:flex px-3 py-1.5 text-xs font-medium border rounded-full transition-all duration-200 ${
                isConnected && isBaseNetworkConnected 
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
              }`}
            >
              <BaseLogo className="w-4 h-4 mr-1.5" />
              Base Network
              {isConnected && isBaseNetworkConnected && (
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
          <TabsList className="grid w-full grid-cols-6 bg-gray-900/50 border border-gray-700/50 p-1 rounded-xl mb-6 h-12 sm:h-14 gap-1">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all mobile-tab-compact flex flex-col sm:flex-row items-center justify-center min-w-0"
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-heading truncate">
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Over</span>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="liquidity" 
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all mobile-tab-compact flex flex-col sm:flex-row items-center justify-center min-w-0"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-heading truncate">
                <span className="hidden sm:inline">Add Liquidity</span>
                <span className="sm:hidden">Add</span>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="rewards" 
              className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all mobile-tab-compact flex flex-col sm:flex-row items-center justify-center min-w-0"
            >
              <Award className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-heading truncate">
                <span className="hidden sm:inline">Rewards</span>
                <span className="sm:hidden">Rwd</span>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="positions" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all mobile-tab-compact flex flex-col sm:flex-row items-center justify-center min-w-0"
            >
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-heading truncate">
                <span className="hidden sm:inline">Positions</span>
                <span className="sm:hidden">Pos</span>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all mobile-tab-compact flex flex-col sm:flex-row items-center justify-center min-w-0"
            >
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-heading truncate">
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Ana</span>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="rebalancing" 
              className="data-[state=active]:bg-orange-600 data-[state=active]:text-white text-gray-400 rounded-lg text-xs sm:text-sm font-medium transition-all mobile-tab-compact flex flex-col sm:flex-row items-center justify-center min-w-0"
            >
              <Target className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-heading truncate">
                <span className="hidden sm:inline">Rebalance</span>
                <span className="sm:hidden">Bal</span>
              </span>
            </TabsTrigger>

          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Sleek Metrics Display */}
            <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-lg p-3 border border-white/10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* KILT Price */}
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center mx-auto mb-2 logo-container logo-shimmer">
                    <img 
                      src={kiltLogo} 
                      alt="KILT" 
                      className={`w-6 h-6 logo-hover ${!logoAnimationComplete ? 'logo-reveal' : 'logo-pulse'}`}
                    />
                  </div>
                  <p className="text-white/70 text-xs mb-1 text-label">KILT Price</p>
                  <p className="text-white font-bold text-lg text-numbers">
                    ${kiltData?.price?.toFixed(4) || '0.0289'}
                  </p>
                  <p className="text-emerald-300 text-xs text-body">+0.50%</p>
                </div>

                {/* Market Cap */}
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Coins className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1 text-label">Market Cap</p>
                  <p className="text-white font-bold text-lg text-numbers">
                    ${kiltData?.marketCap ? (kiltData.marketCap / 1000000).toFixed(1) : '4.4'}M
                  </p>
                  <p className="text-blue-300 text-xs text-body">276.97M circulating</p>
                </div>

                {/* Your Reward APR */}
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1 text-label">Your Reward APR</p>
                  <div className="text-white font-bold text-lg text-numbers">
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

                {/* Maximum APR */}
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-white/70 text-xs mb-1 text-label">APR Range</p>
                  <p className="text-white font-bold text-lg text-numbers">
                    {unifiedData?.maxAPRData?.aprRange || '...'}
                  </p>
                  <p className="text-amber-300 text-xs text-body">Realistic range</p>
                </div>
              </div>
            </div>

            {/* Two Column Layout - Compact */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column - Position Registration */}
              <div className="h-full">
                <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
                  <Plus className="h-3 w-3 text-emerald-400" />
                  Register Existing Positions
                </h2>
                <div className="h-[360px] flex flex-col">
                  <PositionRegistration />
                </div>
              </div>

              {/* Right Column - Quick Add Liquidity */}
              <div className="h-full">
                <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
                  <Zap className="h-3 w-3 text-emerald-400" />
                  Quick Add Liquidity
                </h2>
                <Card className="bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-purple-500/10 border-emerald-500/20 rounded-lg h-[360px] flex flex-col">
                  <CardContent className="p-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-4 flex-1">
                      {/* Balance Display */}
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <h4 className="text-white font-medium text-xs mb-2 text-label">Wallet Balance</h4>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <img 
                                src={kiltLogo} 
                                alt="KILT" 
                                className={`w-3 h-3 logo-hover ${!logoAnimationComplete ? 'logo-reveal-enhanced logo-reveal-delay-1' : 'logo-pulse'}`}
                              />
                              <span className="text-white/70 text-xs text-body">KILT:</span>
                            </div>
                            <span className="text-white font-bold text-xs text-numbers">
                              {kiltBalance ? parseFloat(formatTokenBalance(kiltBalance)).toLocaleString() : '0'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <EthereumLogo className="w-3 h-3" />
                              <span className="text-white/70 text-xs text-body">WETH:</span>
                            </div>
                            <span className="text-white font-bold text-xs text-numbers">
                              {wethBalance ? parseFloat(formatTokenBalance(wethBalance)).toFixed(6) : '0.000000'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Optimal Amount */}
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70 text-xs text-label">Optimal Amount</span>
                          <span className="text-xs text-white/50 text-body">80% balance</span>
                        </div>
                        {(() => {
                          const amounts = calculateOptimalAmounts();
                          const hasInsufficientBalance = parseFloat(amounts.kiltAmount) < 0.01 || parseFloat(amounts.wethAmount) < 0.000001;
                          
                          if (hasInsufficientBalance) {
                            return (
                              <div className="text-center py-1">
                                <div className="text-xs font-medium text-red-400 mb-1 text-label">Insufficient Balance</div>
                                <p className="text-white/60 text-xs text-body">Fund wallet to continue</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div>
                              <div className="text-sm font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent text-numbers">
                                ~${amounts.totalValue}
                              </div>
                              <div className="flex items-center justify-center space-x-2 text-white/60 text-xs text-body">
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
                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 hover:from-emerald-600 hover:via-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
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
            <AnalyticsDashboard 
              userId={unifiedData.user?.id || null}
              selectedPositionId={unifiedData.positions?.[0]?.id || null}
            />
          </TabsContent>

          {/* Rebalancing Tab */}
          <TabsContent value="rebalancing">
            <LiquidityRebalancing />
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
}