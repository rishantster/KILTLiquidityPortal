import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ThirdwebWalletConnect } from './thirdweb-wallet-connect';
import { useWallet } from '@/contexts/wallet-context';
import { useThirdwebWallet } from '@/contexts/thirdweb-wallet-context';
import { 
  TrendingUp, 
  Award,
  Zap,
  ExternalLink
} from 'lucide-react';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';
import { SiX, SiGithub, SiDiscord, SiTelegram, SiMedium } from 'react-icons/si';

export function LandingPage() {
  const [, setLocation] = useLocation();
  const { isConnected: legacyConnected } = useWallet();
  const { isThirdwebConnected } = useThirdwebWallet();
  
  // Navigate to dashboard when wallet is connected
  useEffect(() => {
    if (legacyConnected || isThirdwebConnected) {
      setLocation('/dashboard');
    }
  }, [legacyConnected, isThirdwebConnected, setLocation]);

  // Listen for Thirdweb wallet connection events
  useEffect(() => {
    const handleThirdwebConnection = (event: CustomEvent) => {
      console.log('Received Thirdweb connection event, navigating to dashboard');
      setLocation('/dashboard');
    };

    window.addEventListener('thirdweb-wallet-connected', handleThirdwebConnection as EventListener);
    
    return () => {
      window.removeEventListener('thirdweb-wallet-connected', handleThirdwebConnection as EventListener);
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative">
      {/* Background Video */}
      <video 
        autoPlay 
        muted 
        loop 
        playsInline
        preload="auto"
        className="fixed top-0 left-0 w-full h-full object-cover"
        style={{ zIndex: 1 }}
      >
        <source src="/attached_assets/Untitled design (22)_1752822331413.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" style={{ zIndex: 2 }}></div>
      
      <div className="max-w-7xl mx-auto p-4 sm:p-6 relative" style={{ zIndex: 10 }}>
        {/* Main Landing Content */}
        <div className="text-center pt-16 pb-8">
          {/* Hero Section */}
          <div className="mb-12">
            <div className="relative w-32 h-32 mx-auto mb-8">
              {/* Matrix Green Glow Container */}
              <div className="absolute inset-0 bg-pink-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute inset-2 bg-black rounded-full flex items-center justify-center shadow-2xl border-2 border-pink-500/40">
                {/* KILT Logo */}
                <img 
                  src={kiltLogo} 
                  alt="KILT" 
                  className="w-20 h-20 object-contain drop-shadow-lg" 
                />
              </div>
            </div>
            
            {/* Main Headline */}
            <h1 className="text-6xl sm:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
              <span className="block text-white">KILT Liquidity</span>
              <span className="block text-white/90 text-5xl sm:text-6xl font-normal">
                Incentive Program
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-white/90 font-medium max-w-4xl mx-auto mb-8 leading-relaxed">
              Earn <span className="text-pink-400 font-bold">up to 48% APR</span> from the <span className="text-pink-400 font-bold">1.5M KILT treasury</span> by providing liquidity to Uniswap V3 pools on Base network.
            </p>
          </div>

          {/* Connection Section */}
          <div className="mb-16 flex flex-col items-center">
            <div className="mb-4">
              <ThirdwebWalletConnect />
            </div>
            <p className="text-white/80 text-lg font-medium text-center">
              No signup required. Connect and start earning in seconds.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {/* KILT/ETH Pool */}
            <div className="group relative animate-fade-in animate-delay-100">
              <div className="relative bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-4 transition-all duration-300 hover:border-pink-500/40 h-[160px] flex flex-col">
                <div className="flex items-center mb-3">
                  <TrendingUp className="h-5 w-5 text-pink-400 mr-2" />
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
                    Receive attractive rewards from <span className="text-pink-400">1.5M KILT</span> treasury allocation with secure smart contract distribution.
                  </p>
                </div>
              </div>
            </div>

            {/* Base Network */}
            <div className="group relative animate-fade-in animate-delay-300">
              <div className="relative bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-4 transition-all duration-300 hover:border-blue-500/40 h-[160px] flex flex-col">
                <div className="flex items-center mb-3">
                  <Zap className="h-5 w-5 text-blue-400 mr-2" />
                  <h3 className="text-white font-semibold text-base">Base Network</h3>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Enjoy low transaction costs and fast confirmations on Ethereum's secure Layer 2 solution.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Program Statistics */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-pink-400 mb-1">1.5M</div>
              <div className="text-white/70 text-sm">KILT Treasury</div>
            </div>
            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400 mb-1">$102K</div>
              <div className="text-white/70 text-sm">Pool TVL</div>
            </div>
            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400 mb-1">48%</div>
              <div className="text-white/70 text-sm">Max APR</div>
            </div>
            <div className="bg-black/40 backdrop-blur-sm border border-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400 mb-1">180</div>
              <div className="text-white/70 text-sm">Days Remaining</div>
            </div>
          </div>

          {/* Social Links */}
          <div className="mt-16">
            <div className="flex justify-center space-x-6">
              <a 
                href="https://twitter.com/KILTprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
              >
                <SiX className="h-5 w-5 text-white group-hover:text-pink-400 transition-colors duration-300" />
              </a>
              
              <a 
                href="https://github.com/KILTprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
              >
                <SiGithub className="h-5 w-5 text-white group-hover:text-pink-400 transition-colors duration-300" />
              </a>
              
              <a 
                href="https://discord.gg/6V2KjKfp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
              >
                <SiDiscord className="h-5 w-5 text-white group-hover:text-pink-400 transition-colors duration-300" />
              </a>
              
              <a 
                href="https://t.me/KILTprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
              >
                <SiTelegram className="h-5 w-5 text-white group-hover:text-pink-400 transition-colors duration-300" />
              </a>
              
              <a 
                href="https://medium.com/@kiltprotocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
              >
                <SiMedium className="h-5 w-5 text-white group-hover:text-pink-400 transition-colors duration-300" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}