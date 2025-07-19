import { memo } from 'react';

// Ultra-lightweight loading screen
export const FastLoadingScreen = memo(() => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-12 h-12 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <div className="text-white/70 text-sm">Loading KILT Portal...</div>
    </div>
  </div>
));

FastLoadingScreen.displayName = 'FastLoadingScreen';