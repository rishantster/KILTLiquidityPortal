import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet } from 'lucide-react';
import kiltLogo from '@assets/KILT_400x400_transparent_1751723574123.png';
import { performanceCache } from '@/utils/performance-cache';
import { preloadPositionsInstantly } from '@/utils/instant-cache';

/**
 * Lightning-fast shell with absolute minimum dependencies
 * Renders immediately, no API calls, no heavy hooks
 */
export function LightningFastShell() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Ultra-lightweight wallet check
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (ethereum?.selectedAddress) {
      setIsConnected(true);
      setAddress(ethereum.selectedAddress);
      // Preload critical data when connected
      performanceCache.preloadCriticalData().catch(console.error);
      // Preload positions for instant loading
      preloadPositionsInstantly(ethereum.selectedAddress);
      // Show dashboard immediately
      setShowDashboard(true);
    }

    // Listen for connection changes
    if (ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setIsConnected(true);
          setAddress(accounts[0]);
          setShowDashboard(true);
        } else {
          setIsConnected(false);
          setAddress(null);
          setShowDashboard(false);
        }
      };

      ethereum.on('accountsChanged', handleAccountsChanged);
      return () => ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }
  }, []);

  const connectWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      setIsConnecting(true);
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        setIsConnected(true);
        setAddress(accounts[0]);
        setShowDashboard(true);
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress(null);
    setShowDashboard(false);
  };

  // Render dashboard if connected
  if (showDashboard) {
    return <LazyDashboard />;
  }

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
              {isConnected ? (
                <div className="flex items-center space-x-2">
                  <div className="bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                    <span className="text-emerald-400 text-sm font-mono">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectWallet}
                    className="text-white/70 hover:text-white"
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200"
                >
                  {isConnecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Wallet
                    </>
                  )}
                </Button>
              )}
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
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="h-5 w-5 mr-3" />
                  Connect Wallet
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Lazy dashboard component
function LazyDashboard() {
  const [Dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load dashboard with minimal delay
    const loadDashboard = async () => {
      try {
        const { MainDashboard } = await import('./main-dashboard');
        setDashboard(() => MainDashboard);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <img src={kiltLogo} alt="KILT" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-emerald-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!Dashboard) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Failed to load dashboard</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}