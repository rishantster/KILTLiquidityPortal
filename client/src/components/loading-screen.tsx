import { Loader2 } from 'lucide-react';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <img 
          src={kiltLogo} 
          alt="KILT" 
          className="w-16 h-16 mx-auto mb-4 animate-pulse"
        />
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-white">
            KILT Liquidity Program
          </h2>
          
          {/* Cyberpunk Beta Badge - Loading Screen */}
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
        <div className="flex items-center justify-center space-x-2" style={{ color: '#ff0066' }}>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your dashboard...</span>
        </div>
      </div>
    </div>
  );
}

export function TabLoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderBottomColor: '#ff0066' }}></div>
        <p className="text-white/60 text-sm">Loading...</p>
      </div>
    </div>
  );
}