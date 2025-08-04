import React, { useState, useEffect } from 'react';
import { useConnect, useDisconnect, useAccount, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, Smartphone, QrCode, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function EnhancedMobileWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [showModal, setShowModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [wcUri, setWcUri] = useState<string>('');

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Get WalletConnect connector
  const walletConnectConnector = connectors.find(c => 
    c.name === 'WalletConnect' || c.id?.includes('walletConnect')
  );

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Enhanced connection handler with better mobile support
  const handleConnect = async (connector: any) => {
    setSelectedConnector(connector.id);
    
    try {
      // Special handling for WalletConnect on mobile
      if ((connector.name === 'WalletConnect' || connector.id?.includes('walletConnect')) && isMobile) {
        setShowModal(true);
        setWcUri('');
        
        // Setup WalletConnect URI listener
        if (connector.getProvider) {
          const provider = await connector.getProvider() as any;
          
          if (provider && typeof provider.on === 'function') {
            // Clear existing listeners
            provider.removeAllListeners?.('display_uri');
            provider.removeAllListeners?.('connect');
            provider.removeAllListeners?.('disconnect');
            
            provider.on('display_uri', (uri: string) => {
              console.log('🚀 WalletConnect URI received:', uri);
              setWcUri(uri);
              setShowModal(true);
            });
            
            provider.on('connect', () => {
              console.log('✅ WalletConnect connected');
              setShowModal(false);
              setWcUri('');
              setSelectedConnector(null);
            });
            
            provider.on('disconnect', () => {
              console.log('❌ WalletConnect disconnected');
              setWcUri('');
              setShowModal(false);
            });
          }
        }
      }
      
      await connect({ connector });
    } catch (err) {
      console.error('Connection failed:', err);
      setShowModal(false);
      setWcUri('');
    } finally {
      if (connector.id !== 'walletConnect') {
        setSelectedConnector(null);
      }
    }
  };

  // Close modal when connected
  useEffect(() => {
    if (isConnected) {
      setShowModal(false);
      setWcUri('');
      setSelectedConnector(null);
    }
  }, [isConnected]);

  // Force modal to show when URI is available
  useEffect(() => {
    if (wcUri && !showModal && !isConnected) {
      console.log('🔧 Forcing modal display with URI');
      setShowModal(true);
    }
  }, [wcUri, showModal, isConnected]);

  // Deep link handler for mobile wallets
  const openWalletApp = (walletName: string) => {
    const uri = wcUri;
    if (!uri) return;
    
    const deepLinks: Record<string, string> = {
      'MetaMask': `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`,
      'Trust Wallet': `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`,
      'Coinbase Wallet': `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`,
      'Rainbow': `https://rnbwapp.com/wc?uri=${encodeURIComponent(uri)}`,
      'Phantom': `https://phantom.app/ul/browse/${encodeURIComponent(uri)}`,
      'SafePal': `https://link.safepal.io/wc?uri=${encodeURIComponent(uri)}`,
      'TokenPocket': `https://www.tokenpocket.pro/en/wc?uri=${encodeURIComponent(uri)}`,
      'imToken': `https://token.im/wc?uri=${encodeURIComponent(uri)}`,
      'Bitget Wallet': `https://bkcode.vip/wc?uri=${encodeURIComponent(uri)}`,
      'OKX Wallet': `https://www.okx.com/web3/wc?uri=${encodeURIComponent(uri)}`
    };
    
    const url = deepLinks[walletName] || uri;
    window.open(url, '_blank');
  };

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
            const isWalletConnect = connector.name === 'WalletConnect' || connector.id?.includes('walletConnect');
            
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

      {/* Enhanced Mobile QR Modal with KILT styling */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-gradient-to-br from-black via-gray-900 to-black border border-gray-700 max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl font-bold flex items-center gap-3 mb-6">
              <Smartphone className="h-6 w-6 text-[#ff0066]" />
              Connect Your Mobile Wallet
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Enhanced QR Code Section */}
            {wcUri ? (
              <div className="bg-white p-6 rounded-xl flex justify-center shadow-2xl border-2 border-[#ff0066]/20">
                <QRCodeSVG 
                  value={wcUri} 
                  size={220} 
                  bgColor="white"
                  fgColor="#000000"
                  level="M"
                  includeMargin={true}
                />
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black p-8 rounded-xl flex justify-center items-center h-[268px] border border-gray-600">
                <div className="text-center">
                  <QrCode className="h-12 w-12 text-[#ff0066] animate-pulse mx-auto mb-4" />
                  <div className="text-white text-lg font-medium mb-2">Generating QR Code...</div>
                  <div className="text-gray-400 text-sm mb-4">Setting up secure connection</div>
                  <div className="text-xs text-gray-500 px-4 py-2 bg-black/30 rounded-lg border border-gray-700">
                    Status: {wcUri ? '✅ Ready to scan' : '⏳ Connecting...'}
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-center text-gray-300 text-sm">
              {wcUri ? 'Scan with your mobile wallet or choose from the options below' : 'Please wait while we set up your connection...'}
            </div>
            
            {/* Enhanced Mobile Wallet Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'MetaMask', icon: '🦊' },
                { name: 'Trust Wallet', icon: '🛡️' },
                { name: 'Coinbase Wallet', icon: '🔵' },
                { name: 'Rainbow', icon: '🌈' },
                { name: 'Phantom', icon: '👻' },
                { name: 'SafePal', icon: '🔒' },
                { name: 'TokenPocket', icon: '💰' },
                { name: 'imToken', icon: '💎' },
                { name: 'Bitget Wallet', icon: '📱' },
                { name: 'OKX Wallet', icon: '🏦' }
              ].map((wallet) => (
                <Button
                  key={wallet.name}
                  onClick={() => openWalletApp(wallet.name)}
                  disabled={!wcUri}
                  className="bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] disabled:from-gray-700 disabled:to-gray-800 text-white border-0 h-14 text-sm font-medium justify-start px-4 rounded-xl transition-all duration-200 transform hover:scale-105"
                >
                  <span className="mr-3 text-lg">{wallet.icon}</span>
                  <div className="flex flex-col items-start">
                    <span className="text-xs leading-none font-semibold">{wallet.name}</span>
                    <span className="text-xs opacity-80">Tap to open</span>
                  </div>
                  <ExternalLink className="ml-auto h-3 w-3" />
                </Button>
              ))}
            </div>
            
            <div className="text-xs text-gray-500 text-center bg-black/20 p-3 rounded-lg border border-gray-700">
              🔒 By connecting, you agree to the Terms of Service and Privacy Policy. 
              Your wallet connection is secured by WalletConnect v2.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}