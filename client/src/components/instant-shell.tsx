import { useState, useEffect } from 'react';
import { MinimalWalletConnect } from './minimal-wallet-connect';
import { Badge } from '@/components/ui/badge';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';

/**
 * Ultra-lightweight shell that renders immediately
 * No hooks, no API calls, no heavy dependencies
 */
export function InstantShell() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check wallet connection without heavy hooks
  useEffect(() => {
    const checkConnection = () => {
      const ethereum = (window as any).ethereum;
      if (ethereum?.selectedAddress) {
        setIsConnected(true);
        // Delay dashboard loading to ensure shell renders first
        setTimeout(() => setShowDashboard(true), 100);
      }
    };

    checkConnection();
    
    // Listen for connection changes
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      ethereum.on('accountsChanged', checkConnection);
      ethereum.on('connect', checkConnection);
      return () => {
        ethereum.removeListener('accountsChanged', checkConnection);
        ethereum.removeListener('connect', checkConnection);
      };
    }
  }, []);

  // Lazy load dashboard only when needed
  useEffect(() => {
    if (showDashboard) {
      import('./main-dashboard').then(({ MainDashboard }) => {
        // Dashboard loaded, now we can show it
      });
    }
  }, [showDashboard]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Ultra-fast header */}
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
              <MinimalWalletConnect />
            </div>
          </div>

          {/* Show connection prompt or loading dashboard */}
          {!isConnected ? (
            <div className="text-center py-16">
              <h2 className="text-4xl font-bold mb-4">Welcome to KILT Liquidity Program</h2>
              <p className="text-xl text-gray-400 mb-8">
                Provide liquidity to KILT/ETH pools and earn rewards from our 500,000 KILT treasury
              </p>
              <p className="text-lg text-emerald-400 mb-8">
                Connect your wallet to get started
              </p>
              <MinimalWalletConnect />
            </div>
          ) : showDashboard ? (
            <DashboardLoader />
          ) : (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-emerald-400">Loading your dashboard...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Minimal dashboard loader
function DashboardLoader() {
  const [Dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    import('./main-dashboard').then(({ MainDashboard }) => {
      setDashboard(() => MainDashboard);
    });
  }, []);

  if (!Dashboard) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-emerald-400">Loading dashboard components...</p>
      </div>
    );
  }

  return <Dashboard />;
}