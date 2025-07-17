import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

/**
 * Minimal wallet connection component without heavy hooks
 * Uses direct ethereum object for maximum performance
 */
export function MinimalWalletConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = () => {
      const ethereum = (window as any).ethereum;
      if (ethereum?.selectedAddress) {
        setIsConnected(true);
        setAddress(ethereum.selectedAddress);
      }
    };

    checkConnection();

    // Listen for account changes
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setIsConnected(true);
          setAddress(accounts[0]);
        } else {
          setIsConnected(false);
          setAddress(null);
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
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress(null);
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-2">
        <div className="bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
          <span className="text-emerald-400 text-sm font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
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
    );
  }

  return (
    <Button
      onClick={connectWallet}
      disabled={isConnecting}
      className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
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
  );
}