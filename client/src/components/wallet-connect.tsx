import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useIsMobile } from '@/hooks/use-mobile';

const mobileWallets = [
  { name: 'MetaMask', deepLink: 'https://metamask.app.link/dapp/', needsEncoding: false },
  { name: 'Trust Wallet', deepLink: 'https://link.trustwallet.com/open_url?coin_id=60&url=', needsEncoding: true },
  { name: 'Coinbase Wallet', deepLink: 'https://go.cb-w.com/dapp?cb_url=', needsEncoding: true },
  { name: 'Rainbow', deepLink: 'https://rainbow.me/dapp/', needsEncoding: false },
];

export function WalletConnect() {
  const { address, isConnected, isConnecting, connect, disconnect, switchToBase, validateBaseNetwork } = useWallet();
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [isOnBaseNetwork, setIsOnBaseNetwork] = useState(true);
  const userIsMobile = useIsMobile();

  // Check Base network status
  useEffect(() => {
    const checkNetwork = async () => {
      if (isConnected) {
        const isOnBase = await validateBaseNetwork();
        setIsOnBaseNetwork(isOnBase);
      }
    };
    
    checkNetwork();
    
    // Listen for network changes
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const handleChainChanged = () => {
        checkNetwork();
      };
      
      (window as any).ethereum.on('chainChanged', handleChainChanged);
      return () => {
        (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [isConnected, validateBaseNetwork]);

  const handleConnect = () => {
    if (userIsMobile && !(window as any).ethereum) {
      setShowMobileModal(true);
    } else {
      connect();
    }
  };

  const openInWallet = (wallet: typeof mobileWallets[0]) => {
    const currentUrl = window.location.href;
    // Handle encoding based on wallet requirements
    const targetUrl = wallet.needsEncoding ? encodeURIComponent(currentUrl) : currentUrl;
    const walletUrl = wallet.deepLink + targetUrl;
    
    // Open wallet deeplink
    window.open(walletUrl, '_blank');
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-400">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        {!isOnBaseNetwork && (
          <Button 
            onClick={switchToBase}
            variant="outline"
            size="sm"
            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
          >
            Switch to Base
          </Button>
        )}
        <Button 
          onClick={disconnect}
          variant="outline"
          size="sm"
          className="border-white/20 hover:bg-white/10"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button 
        onClick={handleConnect} 
        disabled={isConnecting}
        className="cluely-primary rounded-lg px-4 py-2 font-medium"
      >
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>

      {/* Mobile Wallet Selection Modal */}
      <Dialog open={showMobileModal} onOpenChange={setShowMobileModal}>
        <DialogContent className="cluely-card border-white/10 w-[90vw] max-w-md mx-auto p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-white font-semibold text-lg text-center">Connect Mobile Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-400 text-center mb-4">
              Choose your preferred wallet to connect:
            </p>
            <div className="space-y-3">
              {mobileWallets.map((wallet, index) => (
                <Button
                  key={wallet.name}
                  onClick={() => {
                    openInWallet(wallet);
                    setTimeout(() => setShowMobileModal(false), 200);
                  }}
                  variant="outline"
                  className="w-full justify-start text-white border-white/10 hover:bg-white/10 hover:border-white/20 mobile-wallet-button py-4 text-base font-medium rounded-xl bg-white/5 backdrop-blur-sm"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animation: showMobileModal ? 'slideInUp 0.4s ease-out forwards' : 'none'
                  }}
                >
                  <Wallet className="mr-3 h-5 w-5 text-white/70" />
                  <span className="font-medium">{wallet.name}</span>
                </Button>
              ))}
            </div>
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-gray-500 text-center">
                Don't have a wallet? Download one from the App Store or Google Play.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}