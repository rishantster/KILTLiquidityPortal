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
        <div className="text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded-lg font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        {!isOnBaseNetwork && (
          <Button 
            onClick={switchToBase}
            variant="outline"
            size="sm"
            className="border-red-500 text-red-700 hover:bg-red-50 font-medium"
          >
            Switch to Base
          </Button>
        )}
        <Button 
          onClick={disconnect}
          variant="outline"
          size="sm"
          className="border-slate-300 text-slate-600 hover:bg-slate-50 font-medium"
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
        className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border-0 text-lg"
      >
        <Wallet className="mr-3 h-6 w-6" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet & Start Earning'}
      </Button>

      {/* Investment Psychology Mobile Wallet Modal */}
      <Dialog open={showMobileModal} onOpenChange={setShowMobileModal}>
        <DialogContent className="bg-white border border-slate-200 w-[90vw] max-w-md mx-auto p-8 rounded-2xl shadow-2xl">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-slate-900 font-bold text-xl text-center">Connect Mobile Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-base text-slate-600 text-center mb-6 font-medium">
              Choose your preferred wallet to start earning:
            </p>
            <div className="space-y-4">
              {mobileWallets.map((wallet, index) => (
                <Button
                  key={wallet.name}
                  onClick={() => {
                    openInWallet(wallet);
                    setTimeout(() => setShowMobileModal(false), 200);
                  }}
                  variant="outline"
                  className="w-full justify-start text-slate-900 border-slate-200 hover:bg-blue-50 hover:border-blue-300 py-4 text-base font-semibold rounded-xl bg-slate-50 transition-all"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animation: showMobileModal ? 'slideInUp 0.4s ease-out forwards' : 'none'
                  }}
                >
                  <Wallet className="mr-4 h-6 w-6 text-blue-600" />
                  <span className="font-semibold">{wallet.name}</span>
                </Button>
              ))}
            </div>
            <div className="pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500 text-center font-medium">
                Don't have a wallet? Download one from the App Store or Google Play.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}