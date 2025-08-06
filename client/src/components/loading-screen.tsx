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
          
          {/* Clean Beta Badge - Loading Screen */}
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-[#ff0066] shadow-sm">
            Beta
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