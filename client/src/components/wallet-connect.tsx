import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet } from 'lucide-react';
import { useState } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useIsMobile } from '@/hooks/use-mobile';

const mobileWallets = [
  { name: 'MetaMask', deepLink: 'https://metamask.app.link/dapp/', needsEncoding: false },
  { name: 'Trust Wallet', deepLink: 'https://link.trustwallet.com/open_url?coin_id=60&url=', needsEncoding: true },
  { name: 'Coinbase Wallet', deepLink: 'https://go.cb-w.com/dapp?cb_url=', needsEncoding: true },
  { name: 'Rainbow', deepLink: 'https://rainbow.me/dapp/', needsEncoding: false },
];

export function WalletConnect() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [showMobileModal, setShowMobileModal] = useState(false);
  const userIsMobile = useIsMobile();

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
    
    console.log('Opening wallet deeplink:', walletUrl);
    window.open(walletUrl, '_blank');
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-400">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
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
        <DialogContent className="cluely-card border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Connect Mobile Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Choose your preferred wallet to connect:
            </p>
            {mobileWallets.map((wallet) => (
              <Button
                key={wallet.name}
                onClick={() => openInWallet(wallet)}
                variant="outline"
                className="w-full justify-start border-white/20 hover:bg-white/10"
              >
                {wallet.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}