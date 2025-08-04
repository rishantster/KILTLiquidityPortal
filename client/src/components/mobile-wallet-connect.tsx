import React, { useState, useEffect } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Wallet, QrCode, ExternalLink, X } from 'lucide-react';

interface MobileWalletConnectProps {
  className?: string;
}

export function MobileWalletConnect({ className = "" }: MobileWalletConnectProps) {
  const { connect, connectors, isPending, error } = useConnect();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [walletConnectUri, setWalletConnectUri] = useState<string>('');
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Get WalletConnect connector
  const walletConnectConnector = connectors.find(c => 
    c.name === 'WalletConnect' || c.id?.includes('walletConnect') || c.name?.includes('WalletConnect')
  );

  // Handle WalletConnect URI generation
  useEffect(() => {
    if (showMobileModal && walletConnectConnector && !walletConnectUri) {
      initializeWalletConnect();
    }
  }, [showMobileModal, walletConnectConnector]);

  // Close modal when connected
  useEffect(() => {
    if (isConnected && showMobileModal) {
      setShowMobileModal(false);
      setWalletConnectUri('');
      setSelectedConnector(null);
    }
  }, [isConnected, showMobileModal]);

  const initializeWalletConnect = async () => {
    if (!walletConnectConnector) return;

    try {
      setSelectedConnector(walletConnectConnector.id);
      
      // Get provider and setup listeners
      if (walletConnectConnector.getProvider) {
        const provider = await walletConnectConnector.getProvider() as any;
        
        if (provider && typeof provider.on === 'function') {
          // Clean up existing listeners
          provider.removeAllListeners?.('display_uri');
          provider.removeAllListeners?.('connect');
          
          provider.on('display_uri', (uri: string) => {
            console.log('🚀 WalletConnect URI:', uri);
            setWalletConnectUri(uri);
          });
          
          provider.on('connect', () => {
            console.log('✅ WalletConnect connected');
            setShowMobileModal(false);
            setWalletConnectUri('');
            setSelectedConnector(null);
          });
        }
      }
      
      // Initiate connection
      await connect({ connector: walletConnectConnector });
      
    } catch (error) {
      console.error('WalletConnect initialization error:', error);
      setSelectedConnector(null);
    }
  };

  const handleConnect = async (connector: any) => {
    // For WalletConnect on mobile, show custom modal
    if ((connector.name === 'WalletConnect' || connector.id?.includes('walletConnect')) && isMobile) {
      setShowMobileModal(true);
      return;
    }
    
    // For other connectors, connect directly
    try {
      setSelectedConnector(connector.id);
      await connect({ connector });
    } catch (err) {
      console.error('Connection failed:', err);
    } finally {
      setSelectedConnector(null);
    }
  };

  const openWalletApp = (walletName: string) => {
    if (!walletConnectUri) return;
    
    const deepLinks: Record<string, string> = {
      'MetaMask': `https://metamask.app.link/wc?uri=${encodeURIComponent(walletConnectUri)}`,
      'Trust Wallet': `https://link.trustwallet.com/wc?uri=${encodeURIComponent(walletConnectUri)}`,
      'Coinbase Wallet': `https://go.cb-w.com/wc?uri=${encodeURIComponent(walletConnectUri)}`,
      'Rainbow': `https://rnbwapp.com/wc?uri=${encodeURIComponent(walletConnectUri)}`,
      'SafePal': `https://link.safepal.io/wc?uri=${encodeURIComponent(walletConnectUri)}`,
      'TokenPocket': `https://www.tokenpocket.pro/en/wc?uri=${encodeURIComponent(walletConnectUri)}`,
    };
    
    const url = deepLinks[walletName] || walletConnectUri;
    window.open(url, '_blank');
  };

  const closeModal = () => {
    setShowMobileModal(false);
    setWalletConnectUri('');
    setSelectedConnector(null);
  };

  if (isConnected) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-[#ff0066]/20">
          <Wallet className="h-6 w-6 text-[#ff0066]" />
          <div className="flex-1">
            <div className="text-white font-medium">Connected</div>
            <div className="text-gray-400 text-sm">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          </div>
          <Button
            onClick={() => disconnect()}
            className="bg-gray-700 hover:bg-gray-600 text-white border-0"
            size="sm"
          >
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`${className}`}>
        <div className="space-y-3">
          <div className="text-center mb-6">
            <h3 className="text-white text-xl font-bold mb-2">Connect Your Wallet</h3>
            <p className="text-gray-400 text-sm">Choose your preferred wallet to get started</p>
          </div>
          
          {connectors.map((connector) => {
            const isLoading = isPending && selectedConnector === connector.id;
            const isWalletConnect = connector.name === 'WalletConnect' || connector.id?.includes('walletConnect');
            
            return (
              <Button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={!connector.ready || isLoading}
                className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-[#ff0066] hover:to-[#cc0052] text-white border border-gray-600 hover:border-[#ff0066] h-14 text-lg font-medium justify-start px-6 transition-all duration-300"
              >
                <div className="mr-4">
                  {connector.name === 'MetaMask' && '🦊'}
                  {connector.name === 'Coinbase Wallet' && '🔵'}
                  {isWalletConnect && <Smartphone className="h-5 w-5" />}
                  {!['MetaMask', 'Coinbase Wallet'].includes(connector.name) && !isWalletConnect && <Wallet className="h-5 w-5" />}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">{connector.name}</div>
                  {isWalletConnect && isMobile && (
                    <div className="text-xs text-[#ff0066]">Recommended for mobile</div>
                  )}
                  {!connector.ready && <div className="text-xs text-gray-500">Not installed</div>}
                </div>
                {isLoading && <div className="ml-2 animate-spin">⏳</div>}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            );
          })}
          
          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-500/20">
              {error.message}
            </div>
          )}
          
          {isMobile && (
            <div className="bg-gradient-to-r from-[#ff0066]/10 to-[#cc0052]/10 p-4 rounded-lg border border-[#ff0066]/20">
              <h4 className="text-[#ff0066] font-medium mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile Tips:
              </h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Use WalletConnect for the best mobile experience</li>
                <li>• Make sure your wallet app is installed first</li>
                <li>• Keep your wallet app updated for security</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Mobile WalletConnect Modal */}
      {showMobileModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={closeModal}
          />
          
          <div className="relative bg-gradient-to-br from-black via-gray-900 to-black border-2 border-[#ff0066]/30 max-w-md w-full rounded-2xl shadow-2xl shadow-[#ff0066]/10">
            <div className="relative p-6">
              <Button
                onClick={closeModal}
                className="absolute -top-3 -right-3 h-10 w-10 p-0 bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] border-0 rounded-full shadow-lg"
              >
                <X className="h-5 w-5 text-white" />
              </Button>
              
              <div className="text-white text-2xl font-bold flex items-center gap-3 mb-6 pr-8">
                <Smartphone className="h-7 w-7 text-[#ff0066]" />
                Connect Mobile Wallet
              </div>
              
              <div className="space-y-6">
                {/* QR Code Section */}
                {walletConnectUri ? (
                  <div className="bg-white p-6 rounded-xl flex justify-center shadow-2xl border-2 border-[#ff0066]/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#ff0066]/5 via-transparent to-[#ff0066]/5 animate-pulse"></div>
                    <QRCodeSVG 
                      value={walletConnectUri} 
                      size={200} 
                      bgColor="white"
                      fgColor="#000000"
                      level="M"
                      includeMargin={true}
                      className="relative z-10"
                    />
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black p-8 rounded-xl flex justify-center items-center h-[300px] border-2 border-gray-600/50">
                    <div className="text-center">
                      <QrCode className="h-12 w-12 text-[#ff0066] animate-pulse mx-auto mb-4" />
                      <div className="text-white text-lg font-medium mb-2">Generating QR Code...</div>
                      <div className="text-gray-400 text-sm">Setting up secure connection</div>
                    </div>
                  </div>
                )}
                
                {/* Mobile Wallet Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'MetaMask', icon: '🦊' },
                    { name: 'Trust Wallet', icon: '🛡️' },
                    { name: 'Coinbase Wallet', icon: '🔵' },
                    { name: 'Rainbow', icon: '🌈' },
                    { name: 'SafePal', icon: '🔒' },
                    { name: 'TokenPocket', icon: '💰' }
                  ].map((wallet) => (
                    <Button
                      key={wallet.name}
                      onClick={() => openWalletApp(wallet.name)}
                      disabled={!walletConnectUri}
                      className="bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] disabled:from-gray-700 disabled:to-gray-800 text-white border-0 h-14 text-sm font-medium justify-start px-4 rounded-xl"
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
                  🔒 Secured by WalletConnect v2 - Your connection is end-to-end encrypted
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}