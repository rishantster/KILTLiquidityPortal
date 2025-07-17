import { useState, useEffect, lazy, Suspense } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useKiltTokenData } from '@/hooks/use-kilt-data';
import { useUnifiedDashboard } from '@/hooks/use-unified-dashboard';
import { useToast } from '@/hooks/use-toast';
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
  Users,
  Clock,
  Target,
  DollarSign,
  Activity,
  Star,
  Gauge,
  Sparkles,
  Rocket,
  Globe,
  Shield,
  Settings
} from 'lucide-react';

// Lazy load components for better performance
const LiquidityMint = lazy(() => import('./liquidity-mint').then(m => ({ default: m.LiquidityMint })));
const RewardsTracking = lazy(() => import('./rewards-tracking').then(m => ({ default: m.RewardsTracking })));
const UserPositions = lazy(() => import('./retro-user-positions').then(m => ({ default: m.default })));

// Import components
import { WalletConnect } from './wallet-connect';
import { PositionRegistration } from './position-registration';
import { LoadingScreen } from './loading-screen';
import { UserPersonalAPR } from './user-personal-apr';
import { GasEstimationCard } from './gas-estimation-card';
import { TokenLogo, KiltLogo, EthLogo } from '@/components/ui/token-logo';

// Assets
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';
import { SiX, SiGithub, SiDiscord, SiTelegram, SiMedium } from 'react-icons/si';

// Services
import { LiquidityService } from '@/services/liquidity-service';

// Base Network Logo
const BaseLogo = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 21.3467 0.309448 48.8335H72.8914V61.2005H0.309448C2.35281 88.6873 26.0432 110.034 54.921 110.034Z" fill="#0052FF"/>
  </svg>
);

// Retro Loading Component
const RetroLoadingSpinner = () => (
  <div className="retro-flex retro-items-center retro-justify-center retro-p-lg">
    <div className="retro-loading"></div>
    <span className="retro-text retro-ml-sm">Loading...</span>
  </div>
);

// Retro Landing Page for Non-Connected Users
const RetroLandingPage = () => {
  return (
    <div className="retro-container">
      <div className="retro-header">
        <div className="retro-flex retro-items-center retro-justify-center retro-gap-lg">
          <div className="retro-logo">
            <KiltLogo className="retro-token-logo" />
          </div>
          <div>
            <h1 className="retro-title retro-text-glow">KILT Protocol</h1>
            <p className="retro-subtitle">Liquidity Incentive Program</p>
          </div>
        </div>
      </div>

      <div className="retro-p-lg">
        <div className="retro-text-center retro-mb-lg">
          <h2 className="retro-title retro-mb-sm" style={{ fontSize: '2rem' }}>
            Welcome to the Future of DeFi
          </h2>
          <p className="retro-text retro-mb-md" style={{ fontSize: '0.9rem' }}>
            Join the KILT liquidity program and earn rewards for providing liquidity to the KILT/ETH pool on Base network.
          </p>
        </div>

        <div className="retro-grid retro-grid-cols-1 md:retro-grid-cols-3 retro-gap-md retro-mb-lg">
          <div className="retro-card retro-text-center">
            <div className="retro-card-icon">
              <Zap className="retro-w-8 retro-h-8" />
            </div>
            <h3 className="retro-card-title retro-mb-md">High Yields</h3>
            <p className="retro-text">
              Earn up to 66% APR through our advanced ranking system and treasury rewards.
            </p>
          </div>

          <div className="retro-card retro-text-center">
            <div className="retro-card-icon">
              <Shield className="retro-w-8 retro-h-8" />
            </div>
            <h3 className="retro-card-title retro-mb-md">Secure Protocol</h3>
            <p className="retro-text">
              Built on Base network with smart contract security and automated reward distribution.
            </p>
          </div>

          <div className="retro-card retro-text-center">
            <div className="retro-card-icon">
              <Activity className="retro-w-8 retro-h-8" />
            </div>
            <h3 className="retro-card-title retro-mb-md">Real-time Analytics</h3>
            <p className="retro-text">
              Track your positions, rewards, and performance with comprehensive dashboard analytics.
            </p>
          </div>
        </div>

        <div className="retro-text-center retro-mb-md">
          <WalletConnect />
        </div>

        <div className="retro-card retro-text-center retro-mb-md">
          <h3 className="retro-subtitle retro-mb-sm" style={{ fontSize: '1.2rem' }}>Program Features</h3>
          <div className="retro-grid retro-grid-cols-1 md:retro-grid-cols-2 retro-gap-sm">
            <div className="retro-flex retro-items-center retro-gap-md">
              <Star className="retro-w-6 retro-h-6 retro-text-accent" />
              <span className="retro-text">Treasury-backed rewards</span>
            </div>
            <div className="retro-flex retro-items-center retro-gap-md">
              <Target className="retro-w-6 retro-h-6 retro-text-accent" />
              <span className="retro-text">Uniswap V3 integration</span>
            </div>
            <div className="retro-flex retro-items-center retro-gap-md">
              <Gauge className="retro-w-6 retro-h-6 retro-text-accent" />
              <span className="retro-text">Real-time position management</span>
            </div>
            <div className="retro-flex retro-items-center retro-gap-md">
              <Sparkles className="retro-w-6 retro-h-6 retro-text-accent" />
              <span className="retro-text">Automated fee collection</span>
            </div>
          </div>
        </div>

        <div className="retro-card retro-text-center">
          <h3 className="retro-subtitle retro-mb-lg">Connect with KILT Protocol</h3>
          <div className="retro-flex retro-items-center retro-justify-center retro-gap-lg">
            <a
              href="https://twitter.com/kiltprotocol"
              target="_blank"
              rel="noopener noreferrer"
              className="retro-button retro-button-secondary"
            >
              <SiX className="retro-w-5 retro-h-5" />
              <span className="retro-ml-sm">Twitter</span>
            </a>
            <a
              href="https://github.com/KILTprotocol"
              target="_blank"
              rel="noopener noreferrer"
              className="retro-button retro-button-secondary"
            >
              <SiGithub className="retro-w-5 retro-h-5" />
              <span className="retro-ml-sm">GitHub</span>
            </a>
            <a
              href="https://discord.gg/kilt"
              target="_blank"
              rel="noopener noreferrer"
              className="retro-button retro-button-secondary"
            >
              <SiDiscord className="retro-w-5 retro-h-5" />
              <span className="retro-ml-sm">Discord</span>
            </a>
            <a
              href="https://t.me/KILTProtocol"
              target="_blank"
              rel="noopener noreferrer"
              className="retro-button retro-button-secondary"
            >
              <SiTelegram className="retro-w-5 retro-h-5" />
              <span className="retro-ml-sm">Telegram</span>
            </a>
            <a
              href="https://medium.com/@kiltprotocol"
              target="_blank"
              rel="noopener noreferrer"
              className="retro-button retro-button-secondary"
            >
              <SiMedium className="retro-w-5 retro-h-5" />
              <span className="retro-ml-sm">Medium</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
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
    mintingStatus,
    approvalStatus,
    positionData,
    poolData
  } = useUnifiedDashboard();

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [liquidityAmount, setLiquidityAmount] = useState([80]); // Default to 80% of balance

  // Show loading screen while wallet is initializing
  if (!initialized) {
    return <LoadingScreen />;
  }

  // Show landing page if wallet is not connected
  if (!isConnected) {
    return <RetroLandingPage />;
  }

  // Handle tab navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Handle one-click liquidity addition
  const handleQuickAddLiquidity = async () => {
    if (!kiltBalance || !wethBalance) return;

    try {
      setIsAddingLiquidity(true);
      
      const percentage = liquidityAmount[0] / 100;
      const kiltAmount = parseFloat(kiltBalance) * percentage;
      const wethAmount = parseFloat(wethBalance) * percentage;

      await LiquidityService.quickAddLiquidity({
        kiltAmount,
        wethAmount,
        slippage: 0.5,
        range: 'balanced' // ±50% range
      });

      toast({
        title: "Liquidity Added Successfully",
        description: "Your position has been created and is now earning rewards.",
        variant: "default"
      });

      // Navigate to positions tab
      setActiveTab('positions');
    } catch (error) {
      toast({
        title: "Failed to Add Liquidity",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAddingLiquidity(false);
    }
  };

  return (
    <div className="retro-container">
      {/* Header */}
      <div className="retro-header">
        <div className="retro-flex retro-items-center retro-justify-between">
          <div className="retro-flex retro-items-center retro-gap-lg">
            <div className="retro-logo">
              <KiltLogo className="retro-token-logo" />
            </div>
            <div>
              <h1 className="retro-title">KILT Protocol</h1>
              <p className="retro-subtitle">Liquidity Incentive Program</p>
            </div>
          </div>

          <div className="retro-flex retro-items-center retro-gap-md">
            {/* Network Status */}
            <div className="retro-flex retro-items-center retro-gap-sm">
              <BaseLogo className="retro-w-6 retro-h-6 retro-float" />
              <span className="retro-text retro-text-accent">Base Network</span>
            </div>

            {/* User Info */}
            <div className="retro-card retro-p-sm">
              <div className="retro-flex retro-items-center retro-gap-sm">
                <Wallet className="retro-w-4 retro-h-4 retro-text-accent" />
                <span className="retro-text retro-text-accent">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not Connected'}
                </span>
              </div>
            </div>

            <WalletConnect />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="retro-nav retro-mb-lg">
        <div className="retro-nav-item retro-glow-hover" onClick={() => handleTabChange('overview')}>
          <BarChart3 className="retro-w-4 retro-h-4" />
          <span>Overview</span>
        </div>
        <div className="retro-nav-item retro-glow-hover" onClick={() => handleTabChange('add-liquidity')}>
          <Plus className="retro-w-4 retro-h-4" />
          <span>Add Liquidity</span>
        </div>
        <div className="retro-nav-item retro-glow-hover" onClick={() => handleTabChange('rewards')}>
          <Award className="retro-w-4 retro-h-4" />
          <span>Rewards</span>
        </div>
        <div className="retro-nav-item retro-glow-hover" onClick={() => handleTabChange('positions')}>
          <Coins className="retro-w-4 retro-h-4" />
          <span>Positions</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="retro-p-lg">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="retro-space-y-lg">
            {/* Key Metrics */}
            <div className="retro-grid retro-grid-cols-1 md:retro-grid-cols-3 retro-gap-lg retro-mb-2xl">
              <div className="retro-card retro-text-center">
                <div className="retro-card-header">
                  <div className="retro-card-icon">
                    <KiltLogo className="retro-w-8 retro-h-8" />
                  </div>
                  <h3 className="retro-card-title">KILT Price</h3>
                </div>
                <div className="retro-position-value retro-text-glow">
                  ${kiltData?.price?.toFixed(5) || '0.00000'}
                </div>
                <p className="retro-text">
                  Market Cap: ${kiltData?.marketCap?.toLocaleString() || '0'}
                </p>
              </div>

              <div className="retro-card retro-text-center">
                <div className="retro-card-header">
                  <div className="retro-card-icon">
                    <TrendingUp className="retro-w-8 retro-h-8" />
                  </div>
                  <h3 className="retro-card-title">Treasury APR</h3>
                </div>
                <div className="retro-position-value retro-text-glow">
                  <UserPersonalAPR />
                </div>
                <p className="retro-text">
                  Based on your ranking position
                </p>
              </div>

              <div className="retro-card retro-text-center">
                <div className="retro-card-header">
                  <div className="retro-card-icon">
                    <Users className="retro-w-8 retro-h-8" />
                  </div>
                  <h3 className="retro-card-title">Program Status</h3>
                </div>
                <div className="retro-position-value retro-text-glow">
                  Active
                </div>
                <p className="retro-text">
                  Unlimited participants
                </p>
              </div>
            </div>

            {/* Two-Column Layout */}
            <div className="retro-grid retro-grid-cols-1 lg:retro-grid-cols-2 retro-gap-lg">
              {/* Position Registration */}
              <div className="retro-card" style={{ height: '440px' }}>
                <div className="retro-card-header">
                  <div className="retro-card-icon">
                    <Target className="retro-w-8 retro-h-8" />
                  </div>
                  <h3 className="retro-card-title">Register Existing Positions</h3>
                </div>
                <div className="retro-p-md">
                  <PositionRegistration />
                </div>
              </div>

              {/* Quick Add Liquidity */}
              <div className="retro-card" style={{ height: '440px' }}>
                <div className="retro-card-header">
                  <div className="retro-card-icon">
                    <Zap className="retro-w-8 retro-h-8" />
                  </div>
                  <h3 className="retro-card-title">Quick Add Liquidity</h3>
                </div>
                <div className="retro-p-md retro-space-y-md">
                  <div className="retro-space-y-sm">
                    <label className="retro-text retro-text-accent">Balance Usage: {liquidityAmount[0]}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={liquidityAmount[0]}
                      onChange={(e) => setLiquidityAmount([parseInt(e.target.value)])}
                      className="retro-w-full retro-input"
                    />
                    <div className="retro-flex retro-justify-between retro-gap-sm">
                      {[20, 40, 60, 80, 100].map((percentage) => (
                        <button
                          key={percentage}
                          onClick={() => setLiquidityAmount([percentage])}
                          className="retro-button retro-button-secondary"
                        >
                          {percentage}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="retro-space-y-sm">
                    <h4 className="retro-subtitle">Wallet Balances</h4>
                    <div className="retro-position-tokens">
                      <div className="retro-token-display">
                        <KiltLogo className="retro-token-logo" />
                        <span className="retro-token-amount">
                          {kiltBalance ? parseFloat(kiltBalance).toLocaleString() : '0'} KILT
                        </span>
                      </div>
                      <div className="retro-token-display">
                        <EthLogo className="retro-token-logo" />
                        <span className="retro-token-amount">
                          {ethBalance ? parseFloat(ethBalance).toFixed(4) : '0'} ETH
                        </span>
                      </div>
                      <div className="retro-token-display">
                        <EthLogo className="retro-token-logo" />
                        <span className="retro-token-amount">
                          {wethBalance ? parseFloat(wethBalance).toFixed(4) : '0'} WETH
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="retro-progress">
                    <div 
                      className="retro-progress-bar" 
                      style={{ width: `${liquidityAmount[0]}%` }}
                    />
                  </div>

                  <button
                    onClick={handleQuickAddLiquidity}
                    disabled={isAddingLiquidity || !kiltBalance || !wethBalance}
                    className="retro-button retro-button-primary retro-w-full"
                  >
                    {isAddingLiquidity ? (
                      <div className="retro-flex retro-items-center retro-gap-sm">
                        <Loader2 className="retro-w-4 retro-h-4 retro-spin" />
                        <span>Adding Liquidity...</span>
                      </div>
                    ) : (
                      <div className="retro-flex retro-items-center retro-gap-sm">
                        <Plus className="retro-w-4 retro-h-4" />
                        <span>Add Liquidity</span>
                      </div>
                    )}
                  </button>

                  <div className="retro-text-center">
                    <GasEstimationCard operation="mint" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Liquidity Tab */}
        {activeTab === 'add-liquidity' && (
          <div className="retro-card">
            <div className="retro-card-header">
              <div className="retro-card-icon">
                <Plus className="retro-w-8 retro-h-8" />
              </div>
              <h3 className="retro-card-title">Add Liquidity to KILT/ETH Pool</h3>
            </div>
            <Suspense fallback={<RetroLoadingSpinner />}>
              <LiquidityMint />
            </Suspense>
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="retro-card">
            <div className="retro-card-header">
              <div className="retro-card-icon">
                <Award className="retro-w-8 retro-h-8" />
              </div>
              <h3 className="retro-card-title">Treasury Rewards</h3>
            </div>
            <Suspense fallback={<RetroLoadingSpinner />}>
              <RewardsTracking />
            </Suspense>
          </div>
        )}

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="retro-card">
            <div className="retro-card-header">
              <div className="retro-card-icon">
                <Coins className="retro-w-8 retro-h-8" />
              </div>
              <h3 className="retro-card-title">Your LP Positions</h3>
            </div>
            <Suspense fallback={<RetroLoadingSpinner />}>
              <UserPositions />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}