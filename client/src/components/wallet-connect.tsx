import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWallet } from '@/hooks/use-wallet';
import { formatAddress } from '@/lib/web3';
import { Wallet, ChevronDown, Smartphone, Monitor, ExternalLink, QrCode } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mobile wallet detection
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Mobile wallet apps with deep links
const mobileWallets = [
  {
    name: 'MetaMask',
    icon: '🦊',
    deepLink: 'https://metamask.app.link/dapp/',
    downloadUrl: 'https://metamask.io/download/',
    description: 'Most popular Ethereum wallet'
  },
  {
    name: 'Trust Wallet',
    icon: '🛡️',
    deepLink: 'https://link.trustwallet.com/open_url?coin_id=60&url=',
    downloadUrl: 'https://trustwallet.com/',
    description: 'Secure & decentralized'
  },
  {
    name: 'Coinbase Wallet',
    icon: '💎',
    deepLink: 'https://go.cb-w.com/dapp?cb_url=',
    downloadUrl: 'https://www.coinbase.com/wallet',
    description: 'Easy to use DeFi wallet'
  },
  {
    name: 'Rainbow',
    icon: '🌈',
    deepLink: 'https://rainbow.me/wc?uri=',
    downloadUrl: 'https://rainbow.me/',
    description: 'Beautiful Ethereum wallet'
  }
];

export function WalletConnect() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [userIsMobile, setUserIsMobile] = useState(false);

  useEffect(() => {
    setUserIsMobile(isMobile());
  }, []);

  const handleConnect = () => {
    if (userIsMobile && !window.ethereum) {
      setShowMobileModal(true);
    } else {
      connect();
    }
  };

  const openInWallet = (wallet: typeof mobileWallets[0]) => {
    const currentUrl = window.location.href;
    const walletUrl = wallet.deepLink + encodeURIComponent(currentUrl);
    window.open(walletUrl, '_blank');
  };

  if (!isConnected) {
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
              <DialogTitle className="text-white font-heading flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-purple-400" />
                <span>Connect Mobile Wallet</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-white/60 text-sm">
                Choose your preferred wallet to connect to KILT Liquidity Portal
              </div>

              {/* Installed Wallet Check */}
              {userIsMobile && window.ethereum && (
                <Card className="cluely-card bg-emerald-500/10 border-emerald-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Monitor className="h-5 w-5 text-emerald-400" />
                        <div>
                          <div className="text-white font-medium">Wallet Detected</div>
                          <div className="text-emerald-400 text-sm">Connect with browser wallet</div>
                        </div>
                      </div>
                      <Button 
                        onClick={connect}
                        size="sm"
                        className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                      >
                        Connect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mobile Wallet Options */}
              <div className="space-y-3">
                <div className="text-white/80 font-medium text-sm">Mobile Wallet Apps</div>
                {mobileWallets.map((wallet) => (
                  <Card key={wallet.name} className="cluely-card bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{wallet.icon}</span>
                          <div>
                            <div className="text-white font-medium">{wallet.name}</div>
                            <div className="text-white/60 text-sm">{wallet.description}</div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => openInWallet(wallet)}
                            size="sm"
                            variant="outline"
                            className="border-white/20 text-white/80"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </Button>
                          <Button 
                            onClick={() => window.open(wallet.downloadUrl, '_blank')}
                            size="sm"
                            className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                          >
                            Install
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* QR Code Option */}
              <Card className="cluely-card bg-blue-500/10 border-blue-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <QrCode className="h-5 w-5 text-blue-400" />
                    <div>
                      <div className="text-white font-medium">WalletConnect QR</div>
                      <div className="text-blue-400 text-sm">Scan with any compatible wallet</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <div className="text-amber-300 font-medium text-sm mb-2">How to connect:</div>
                <ol className="text-amber-200/80 text-sm space-y-1 list-decimal list-inside">
                  <li>Install a wallet app from above</li>
                  <li>Create or import your wallet</li>
                  <li>Add Base network (Chain ID: 8453)</li>
                  <li>Return and click "Open" to connect</li>
                </ol>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="cluely-button border-white/10 hover:border-white/20 font-medium rounded-lg">
          <Wallet className="mr-2 h-4 w-4" />
          {formatAddress(address!)}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="cluely-card border-white/10">
        <DropdownMenuItem onClick={disconnect} className="text-red-400 hover:text-red-300 font-body">
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
