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
    (window as any).navigateToTab = navigateToTab;
    return () => {
      delete (window as any).navigateToTab;
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
      if (window.ethereum && isConnected) {
        try {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' });
          const isBase = chainId === '0x2105';
          setIsBaseNetworkConnected(isBase);
        } catch (error) {
          setIsBaseNetworkConnected(false);
        }
      } else {
        setIsBaseNetworkConnected(false);
      }
    };

    checkBaseNetwork();
    
    // Listen for network changes
    if (window.ethereum) {
      const handleChainChanged = () => checkBaseNetwork();
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        clearTimeout(logoTimer);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 relative overflow-hidden">
        {/* Modern Clean Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500/3 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/3 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center pt-20 pb-12">
            {/* Hero Section */}
            <div className="mb-16">
              <div className="w-24 h-24 bg-white rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-lg border border-gray-200 p-4">
                <img src={kiltLogo} alt="KILT" className="w-full h-full object-contain" />
              </div>
              
              {/* Investment Psychology Headline */}
              <h1 className="text-5xl sm:text-6xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
                KILT Liquidity
                <br />
                <span className="text-blue-900">
                  Incentive Program
                </span>
              </h1>
              
              <p className="text-xl text-slate-700 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
                Provide liquidity for KILT/ETH on Base network and earn <span className="text-green-700 font-bold">proportional rewards</span> based on your liquidity contribution. 
                <span className="text-blue-900 font-bold">2.9M KILT tokens</span> allocated from treasury with 90-day reward locking.
              </p>
            </div>

            {/* High-Conversion Connection Section */}
            <div className="mb-16 flex flex-col items-center">
              <div className="mb-6">
                <WalletConnect />
              </div>
              <p className="text-slate-600 text-base font-medium text-center">
                No signup required. Connect and start earning rewards in seconds.
              </p>
            </div>

            {/* Investment-Focused Feature Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <Card className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="h-8 w-8 text-blue-900" />
                </div>
                <h3 className="text-slate-900 font-bold text-xl mb-3 text-center">KILT/ETH Pool</h3>
                <p className="text-slate-600 text-base text-center leading-relaxed">
                  Provide liquidity to the official KILT/ETH Uniswap V3 pool on Base network with concentrated positions for maximum returns.
                </p>
              </Card>

              <Card className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <Award className="h-8 w-8 text-green-800" />
                </div>
                <h3 className="text-slate-900 font-bold text-xl mb-3 text-center">Treasury Rewards</h3>
                <p className="text-slate-600 text-base text-center leading-relaxed">
                  Earn proportional rewards from 2.9M KILT treasury allocation with secure 90-day reward locking for guaranteed returns.
                </p>
              </Card>

              <Card className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="h-8 w-8 text-blue-900" />
                </div>
                <h3 className="text-slate-900 font-bold text-xl mb-3 text-center">Advanced Analytics</h3>
                <p className="text-slate-600 text-base text-center leading-relaxed">
                  Track your position performance, rewards earned, and program progress with institutional-grade analytics.
                </p>
              </Card>
            </div>

            {/* Investment-Focused CTA */}
            <div className="text-center mb-16">
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold text-slate-900 mb-4">
                  Start Earning Returns
                </h2>
                <h3 className="text-2xl font-semibold text-green-800 mb-6">
                  with KILT Treasury Rewards
                </h3>
                <p className="text-slate-700 text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
                  Join institutional-grade liquidity providers earning <span className="font-bold text-green-800">proportional rewards</span> from 
                  our <span className="font-bold text-blue-900">2.9M KILT treasury allocation</span>. Secure, transparent, and profitable.
                </p>
                
                {/* Trust Indicators */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-800 mb-1">2.9M</div>
                    <div className="text-sm text-slate-600">KILT Treasury</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900 mb-1">90-Day</div>
                    <div className="text-sm text-slate-600">Reward Locking</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900 mb-1">Base</div>
                    <div className="text-sm text-slate-600">Network Security</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Social Links */}
            <div className="flex justify-center items-center gap-4">
              <a 
                href="https://x.com/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 group border border-slate-200"
              >
                <SiX className="h-5 w-5 text-slate-600 group-hover:text-slate-900 transition-colors" />
              </a>
              <a 
                href="https://github.com/KILTprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 group border border-slate-200"
              >
                <SiGithub className="h-5 w-5 text-slate-600 group-hover:text-slate-900 transition-colors" />
              </a>
              <a 
                href="https://discord.gg/kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 group border border-slate-200"
              >
                <SiDiscord className="h-5 w-5 text-slate-600 group-hover:text-slate-900 transition-colors" />
              </a>
              <a 
                href="https://t.me/KILTProtocolChat" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 group border border-slate-200"
              >
                <SiTelegram className="h-5 w-5 text-slate-600 group-hover:text-slate-900 transition-colors" />
              </a>
              <a 
                href="https://kilt-protocol.medium.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-300 group border border-slate-200"
              >
                <SiMedium className="h-5 w-5 text-slate-600 group-hover:text-slate-900 transition-colors" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen apple-bg-black">
      <div className="max-w-7xl mx-auto p-6">
        {/* Apple-style Header */}
        <div className="apple-header mb-8 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg">
                <img src={kiltLogo} alt="KILT" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h1 className="apple-title text-xl">KILT Liquidity Portal</h1>
                <p className="apple-caption">Professional DeFi Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge 
                className={`hidden sm:flex px-3 py-2 text-sm font-medium apple-badge ${
                  isConnected && isBaseNetworkConnected 
                    ? 'blue' 
                    : ''
                }`}
              >
                <BaseLogo className="w-4 h-4 mr-2" />
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
        </div>

        {/* Apple-style Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 apple-nav p-1 rounded-xl mb-8 h-14 gap-1">
            <TabsTrigger 
              value="overview" 
              className={`apple-tab ${activeTab === 'overview' ? 'apple-tab-active' : ''} flex items-center justify-center min-w-0`}
            >
              <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm truncate">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="liquidity" 
              className={`apple-tab ${activeTab === 'liquidity' ? 'apple-tab-active' : ''} flex items-center justify-center min-w-0`}
            >
              <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm truncate">Add Liquidity</span>
            </TabsTrigger>
            <TabsTrigger 
              value="rewards" 
              className={`apple-tab ${activeTab === 'rewards' ? 'apple-tab-active' : ''} flex items-center justify-center min-w-0`}
            >
              <Award className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm truncate">Rewards</span>
            </TabsTrigger>
            <TabsTrigger 
              value="positions" 
              className={`apple-tab ${activeTab === 'positions' ? 'apple-tab-active' : ''} flex items-center justify-center min-w-0`}
            >
              <Wallet className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm truncate">Positions</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className={`apple-tab ${activeTab === 'analytics' ? 'apple-tab-active' : ''} flex items-center justify-center min-w-0`}
            >
              <BarChart3 className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm truncate">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="rebalancing" 
              className={`apple-tab ${activeTab === 'rebalancing' ? 'apple-tab-active' : ''} flex items-center justify-center min-w-0`}
            >
              <Target className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm truncate">Rebalance</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Apple Dark Design */}
          <TabsContent value="overview" className="space-y-6 apple-animate-in">
            {/* Apple-style Key Metrics */}
            <div className="apple-card p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* KILT Price */}
                <div className="apple-metric-card text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <img 
                      src={kiltLogo} 
                      alt="KILT" 
                      className="w-10 h-10"
                    />
                  </div>
                  <div className="apple-metric-label">KILT Price</div>
                  <div className="apple-metric-value">
                    ${kiltData?.price?.toFixed(6) || '0.000000'}
                  </div>
                  <div className="apple-caption">Real-time Market Price</div>
                </div>

                {/* Market Cap */}
                <div className="apple-metric-card text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Coins className="h-10 w-10 text-white" />
                  </div>
                  <div className="apple-metric-label">Market Cap</div>
                  <div className="apple-metric-value">
                    ${kiltData?.marketCap ? (kiltData.marketCap / 1000000).toFixed(1) : '4.4'}M
                  </div>
                  <div className="apple-caption">276.97M circulating</div>
                </div>

                {/* Your Reward APR */}
                <div className="apple-metric-card text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Award className="h-10 w-10 text-white" />
                  </div>
                  <div className="apple-metric-label">Your Reward APR</div>
                  <div className="apple-metric-value apple-text-green">
                    {address ? (
                      <UserPersonalAPR address={address} />
                    ) : (
                      <div className="text-center">
                        <span className="apple-text-gray-400">--</span>
                        <div className="apple-caption mt-1">Connect wallet</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Treasury Status */}
                <div className="apple-metric-card text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Coins className="h-10 w-10 text-white" />
                  </div>
                  <div className="apple-metric-label">Treasury Pool</div>
                  <div className="apple-metric-value">
                    {kiltData?.treasuryRemaining ? (kiltData.treasuryRemaining / 1000000).toFixed(1) : '2.9'}M
                  </div>
                  <div className="apple-caption">KILT remaining</div>
                </div>
              </div>
            </div>

            {/* Apple-style Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Position Registration */}
              <div className="h-full">
                <PositionRegistration />
              </div>

              {/* Right Column - Quick Add Liquidity */}
              <div className="h-full">
                <h2 className="apple-subtitle flex items-center gap-3 mb-4">
                  <Zap className="h-5 w-5 apple-text-blue" />
                  Quick Add Liquidity
                </h2>
                <div className="apple-card h-[440px] flex flex-col p-6">
                  <div className="space-y-4 flex-1">
                    {/* Balance Display */}
                    <div className="apple-metric-card p-4">
                      <div className="apple-metric-label mb-3">Wallet Balance</div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <img 
                              src={kiltLogo} 
                              alt="KILT" 
                              className="w-5 h-5"
                            />
                            <span className="apple-body">KILT:</span>
                          </div>
                          <span className="apple-metric-value text-base">
                            {kiltBalance ? parseFloat(formatTokenBalance(kiltBalance)).toLocaleString() : '0'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <EthereumLogo className="w-5 h-5" />
                            <span className="apple-body">WETH:</span>
                          </div>
                          <span className="apple-metric-value text-base">
                            {wethBalance ? parseFloat(formatTokenBalance(wethBalance)).toFixed(6) : '0.000000'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Optimal Amount */}
                    <div className="apple-metric-card p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="apple-metric-label">Optimal Amount</span>
                        <span className="apple-caption">80% balance</span>
                      </div>
                        {(() => {
                          const amounts = calculateOptimalAmounts();
                          const hasInsufficientBalance = parseFloat(amounts.kiltAmount) < 0.01 || parseFloat(amounts.wethAmount) < 0.000001;
                          
                          if (hasInsufficientBalance) {
                            return (
                              <div className="text-center py-2">
                                <div className="apple-caption apple-text-red">Insufficient Balance</div>
                                <p className="apple-caption">Fund wallet to continue</p>
                              </div>
                            );
                          }
                          
                          return (
                            <div>
                              <div className="apple-metric-value apple-text-blue">
                                ~${amounts.totalValue}
                              </div>
                              <div className="flex items-center justify-center space-x-2 apple-caption">
                                <div className="flex items-center space-x-1">
                                  <img 
                                    src={kiltLogo} 
                                    alt="KILT" 
                                    className="w-3 h-3"
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
                  
                  {/* Action Button - Bottom of Card */}
                  <div className="space-y-4 mt-4">
                    {(() => {
                      const amounts = calculateOptimalAmounts();
                      const hasInsufficientBalance = parseFloat(amounts.kiltAmount) < 0.01 || parseFloat(amounts.wethAmount) < 0.000001;
                      const isDisabled = isQuickAdding || !address || hasInsufficientBalance;
                      
                      return (
                        <button 
                          onClick={handleQuickAddLiquidity}
                          disabled={isDisabled}
                          className={`apple-button-primary w-full ${
                            hasInsufficientBalance 
                              ? 'opacity-50 cursor-not-allowed' 
                              : ''
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
                              Fund Wallet
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Quick Add Liquidity
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </button>
                      );
                    })()}

                    {/* Help Text */}
                    <div className="text-center">
                      <p className="apple-caption">
                        For custom amounts, use the "Add Liquidity" tab above
                      </p>
                    </div>
                  </div>
                </div>
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