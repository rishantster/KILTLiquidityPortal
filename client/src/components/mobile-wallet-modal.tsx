import React, { useState, useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Smartphone, ExternalLink, X } from 'lucide-react';

interface MobileWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileWalletModal({ isOpen, onClose }: MobileWalletModalProps) {
  const { connectors, connect } = useConnect();
  const { isConnected } = useAccount();
  const [wcUri, setWcUri] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Get WalletConnect connector
  const walletConnectConnector = connectors.find(c => 
    c.name === 'WalletConnect' || c.id?.includes('walletConnect')
  );

  // Initialize WalletConnect connection
  useEffect(() => {
    if (isOpen && walletConnectConnector && !isConnecting) {
      handleWalletConnectInit();
    }
  }, [isOpen, walletConnectConnector]);

  // Close modal when connected
  useEffect(() => {
    if (isConnected && isOpen) {
      onClose();
      setWcUri('');
      setIsConnecting(false);
    }
  }, [isConnected, isOpen, onClose]);

  const handleWalletConnectInit = async () => {
    if (!walletConnectConnector) return;
    
    try {
      setIsConnecting(true);
      setWcUri('');
      
      // Setup provider listeners
      if (walletConnectConnector.getProvider) {
        const provider = await walletConnectConnector.getProvider() as any;
        
        if (provider && typeof provider.on === 'function') {
          // Clear existing listeners
          provider.removeAllListeners?.('display_uri');
          provider.removeAllListeners?.('connect');
          provider.removeAllListeners?.('disconnect');
          
          provider.on('display_uri', (uri: string) => {
            console.log('🚀 WalletConnect URI received:', uri);
            setWcUri(uri);
          });
          
          provider.on('connect', () => {
            console.log('✅ WalletConnect connected');
            setIsConnecting(false);
            onClose();
          });
          
          provider.on('disconnect', () => {
            console.log('❌ WalletConnect disconnected');
            setWcUri('');
            setIsConnecting(false);
          });
        }
      }
      
      // Start connection
      await connect({ connector: walletConnectConnector });
      
    } catch (error) {
      console.error('WalletConnect initialization error:', error);
      setIsConnecting(false);
    }
  };

  // Mobile wallet deep links
  const openWalletApp = (walletName: string) => {
    if (!wcUri) return;
    
    const deepLinks: Record<string, string> = {
      'MetaMask': `https://metamask.app.link/wc?uri=${encodeURIComponent(wcUri)}`,
      'Trust Wallet': `https://link.trustwallet.com/wc?uri=${encodeURIComponent(wcUri)}`,
      'Coinbase Wallet': `https://go.cb-w.com/wc?uri=${encodeURIComponent(wcUri)}`,
      'Rainbow': `https://rnbwapp.com/wc?uri=${encodeURIComponent(wcUri)}`,
      'Phantom': `https://phantom.app/ul/browse/${encodeURIComponent(wcUri)}`,
      'SafePal': `https://link.safepal.io/wc?uri=${encodeURIComponent(wcUri)}`,
      'TokenPocket': `https://www.tokenpocket.pro/en/wc?uri=${encodeURIComponent(wcUri)}`,
      'imToken': `https://token.im/wc?uri=${encodeURIComponent(wcUri)}`,
      'Bitget Wallet': `https://bkcode.vip/wc?uri=${encodeURIComponent(wcUri)}`,
      'OKX Wallet': `https://www.okx.com/web3/wc?uri=${encodeURIComponent(wcUri)}`
    };
    
    const url = deepLinks[walletName] || wcUri;
    window.open(url, '_blank');
  };

  const handleClose = () => {
    setWcUri('');
    setIsConnecting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-black via-gray-900 to-black border border-gray-700 max-w-md mx-4 rounded-2xl shadow-2xl">
        <div className="relative p-6">
          <Button
            onClick={handleClose}
            className="absolute -top-2 -right-2 h-8 w-8 p-0 bg-gray-800 hover:bg-gray-700 border-gray-600 rounded-full"
            variant="outline"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="text-white text-2xl font-bold flex items-center gap-3 mb-6">
            <Smartphone className="h-6 w-6 text-[#ff0066]" />
            Connect Mobile Wallet
          </div>
        
          <div className="space-y-6">
          {/* QR Code Section */}
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
                <div className="text-white text-lg font-medium mb-2">
                  {isConnecting ? 'Generating QR Code...' : 'Initializing Connection...'}
                </div>
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
          
          {/* Mobile Wallet Grid */}
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
            🔒 Secured by WalletConnect v2 - Your connection is end-to-end encrypted
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}