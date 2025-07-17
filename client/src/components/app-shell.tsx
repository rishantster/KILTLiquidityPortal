import { useState, useEffect, Suspense, lazy } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { WalletConnect } from './wallet-connect';
import { LoadingScreen } from './loading-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

// Lazy load the full dashboard only when needed
const MainDashboard = lazy(() => import('./main-dashboard').then(m => ({ default: m.MainDashboard })));

// Preload function to start loading heavy components early
function preloadComponents() {
  // Preload main dashboard when user connects
  import('./main-dashboard');
  // Preload critical hooks
  import('../hooks/use-unified-dashboard');
  import('../hooks/use-uniswap-v3');
}

export function AppShell() {
  const { address, isConnected, initialized } = useWallet();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Preload components when user connects
    if (isConnected) {
      preloadComponents();
    }
  }, [isConnected]);

  useEffect(() => {
    // Give the app shell time to render before loading heavy components
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50); // Reduced delay for faster loading

    return () => clearTimeout(timer);
  }, []);

  // Show loading screen while wallet is initializing
  if (!initialized) {
    return <LoadingScreen />;
  }

  // Show connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <img src={kiltLogo} alt="KILT" className="w-8 h-8" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  KILT Liquidity Incentive Program
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                  Base Network
                </Badge>
                <WalletConnect />
              </div>
            </div>

            {/* Landing content */}
            <div className="text-center py-16">
              <h2 className="text-4xl font-bold mb-4">Welcome to KILT Liquidity Program</h2>
              <p className="text-xl text-gray-400 mb-8">
                Provide liquidity to KILT/ETH pools and earn rewards from our 500,000 KILT treasury
              </p>
              <p className="text-lg text-emerald-400 mb-8">
                Connect your wallet to get started
              </p>
              <WalletConnect />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while preparing dashboard
  if (!isReady) {
    return <LoadingScreen />;
  }

  // Load full dashboard
  return (
    <Suspense fallback={<LoadingScreen />}>
      <MainDashboard />
    </Suspense>
  );
}