import React, { useState, useEffect } from 'react';
import { useConnect, useDisconnect, useAccount, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, Smartphone, QrCode, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { MobileWalletModal } from './mobile-wallet-modal';

export function EnhancedMobileWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Enhanced connection handler with better mobile support
  const handleConnect = async (connector: any) => {
    setSelectedConnector(connector.id);
    
    try {
      // Special handling for WalletConnect - always show our custom modal
      const isWalletConnect = connector.name === 'WalletConnect' || 
                             connector.id?.includes('walletConnect') || 
                             connector.name?.includes('WalletConnect');
      
      if (isWalletConnect) {
        console.log('🚀 Opening custom WalletConnect modal');
        setShowMobileModal(true);
        return;
      }
      
      // For other connectors, connect directly
      await connect({ connector });
    } catch (err) {
      console.error('Connection failed:', err);
    } finally {
      if (!isWalletConnect) {
        setSelectedConnector(null);
      }
    }
  };

  // Close modal when connected
  useEffect(() => {
    if (isConnected) {
      setShowMobileModal(false);
      setSelectedConnector(null);
    }
  }, [isConnected]);

  if (isConnected && address) {
    return (
      <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-black p-4 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-white font-mono text-sm">{formatAddress(address)}</span>
            <span className="text-gray-400 text-xs">Base Network (Chain: {chainId})</span>
          </div>
          <Button
            onClick={() => disconnect()}
            className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-4 py-2"
          >
            <Wallet className="mr-2 h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-white text-xl font-bold mb-2">Connect Your Wallet</h3>
          <p className="text-gray-400 text-sm">Choose your preferred wallet to get started</p>
        </div>
        
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Connection failed: {error.message}</span>
          </div>
        )}

        <div className="grid gap-3">
          {connectors.map((connector) => {
            const isLoading = isPending && selectedConnector === connector.id;
            const isWalletConnect = connector.name === 'WalletConnect' || connector.id?.includes('walletConnect') || connector.name?.includes('WalletConnect');
            
            return (
              <Button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="bg-gradient-to-r from-gray-800 via-gray-900 to-black hover:from-gray-700 hover:via-gray-800 hover:to-gray-900 text-white border border-gray-600 hover:border-[#ff0066] shadow-lg hover:shadow-xl transition-all duration-300 p-4 h-auto justify-between"
              >
                <div className="flex items-center gap-3">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isWalletConnect ? (
                    <QrCode className="h-5 w-5" />
                  ) : (
                    <Wallet className="h-5 w-5" />
                  )}
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">
                      {isLoading ? 'Connecting...' : connector.name}
                    </span>
                    {isWalletConnect && isMobile && (
                      <span className="text-xs text-[#ff0066]">Recommended for mobile</span>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4" />
              </Button>
            );
          })}
        </div>

        {isMobile && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
            <p className="text-amber-400 font-semibold text-sm mb-2">📱 Mobile Tips:</p>
            <ul className="text-amber-300 text-xs space-y-1 list-disc list-inside">
              <li>Use WalletConnect for the best mobile experience</li>
              <li>Make sure your wallet app is installed first</li>
              <li>Some wallets work better in their built-in browser</li>
              <li>Keep your wallet app updated for security</li>
            </ul>
          </div>
        )}
      </div>

      {/* Mobile Wallet Modal */}
      <MobileWalletModal 
        isOpen={showMobileModal} 
        onClose={() => setShowMobileModal(false)} 
      />
    </>
  );
}