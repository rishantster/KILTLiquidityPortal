import { useState, useEffect } from 'react';
import { useConnect, useAccount, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, Smartphone, QrCode, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function MobileWalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showModal, setShowModal] = useState(false);
  const [wcUri, setWcUri] = useState<string>('');

  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Get WalletConnect connector
  const walletConnectConnector = connectors.find(c => 
    c.name === 'WalletConnect' || c.id?.includes('walletConnect')
  );

  const handleMobileConnect = async () => {
    if (!walletConnectConnector) return;
    
    try {
      setShowModal(true);
      setWcUri(''); // Reset URI
      
      // Listen for WalletConnect URI before connecting
      if (walletConnectConnector.getProvider) {
        const provider = await walletConnectConnector.getProvider() as any;
        
        if (provider && typeof provider.on === 'function') {
          provider.on('display_uri', (uri: string) => {
            console.log('WalletConnect URI:', uri);
            setWcUri(uri);
            // Ensure modal is showing when URI is received
            setShowModal(true);
          });
          
          // Also listen for connection events
          provider.on('connect', () => {
            console.log('WalletConnect connected');
            setShowModal(false);
            setWcUri('');
          });
          
          provider.on('disconnect', () => {
            console.log('WalletConnect disconnected');
            setWcUri('');
          });
        }
      }
      
      // Connect
      connect({ connector: walletConnectConnector });
      
    } catch (error) {
      console.error('Mobile wallet connection error:', error);
      setShowModal(false);
    }
  };

  // Close modal when connected and reset state
  useEffect(() => {
    if (isConnected) {
      setShowModal(false);
      setWcUri('');
    }
  }, [isConnected]);

  const openWalletApp = (walletName: string, deepLink: string) => {
    const uri = wcUri;
    if (!uri) return;
    
    // Create deep link URLs for popular mobile wallets
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

  if (isConnected) {
    return (
      <Button
        onClick={() => disconnect()}
        className="bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6"
      >
        <Wallet className="mr-2 h-4 w-4" />
        Disconnect
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={handleMobileConnect}
        disabled={isPending}
        className="bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6"
      >
        {isPending ? (
          <>
            <QrCode className="mr-2 h-4 w-4 animate-pulse" />
            Connecting...
          </>
        ) : (
          <>
            <Smartphone className="mr-2 h-4 w-4" />
            Connect Mobile Wallet
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-black border border-gray-800 max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl font-bold flex items-center gap-3 mb-6">
              <Smartphone className="h-6 w-6" />
              Connect Your Mobile Wallet
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* QR Code Section */}
            {wcUri ? (
              <div className="bg-white p-4 rounded-lg flex justify-center">
                <QRCodeSVG value={wcUri} size={200} />
              </div>
            ) : (
              <div className="bg-gray-800 p-4 rounded-lg flex justify-center items-center h-[232px]">
                <div className="text-center">
                  <QrCode className="h-8 w-8 text-white animate-pulse mx-auto mb-2" />
                  <div className="text-white text-sm">Generating QR Code...</div>
                </div>
              </div>
            )}
            
            <div className="text-center text-gray-400 text-sm">
              {wcUri ? 'Scan with your mobile wallet or choose from the options below' : 'Setting up connection...'}
            </div>
            
            {/* Mobile Wallet Options */}
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
                  onClick={() => openWalletApp(wallet.name, '')}
                  disabled={!wcUri}
                  className="bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-12 text-sm font-medium justify-start px-4 rounded-lg transition-all duration-200"
                >
                  <span className="mr-2 text-lg">{wallet.icon}</span>
                  <div className="flex flex-col items-start">
                    <span className="text-xs leading-none">{wallet.name}</span>
                  </div>
                  <ExternalLink className="ml-auto h-3 w-3" />
                </Button>
              ))}
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              By connecting, you agree to the Terms of Service and Privacy Policy
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}