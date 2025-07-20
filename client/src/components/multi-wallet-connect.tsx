import { useState } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Wifi, WifiOff, AlertTriangle, CheckCircle, Smartphone, Monitor, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  action: () => void;
  recommended?: boolean;
  category: 'browser' | 'mobile' | 'hardware';
}

export function MultiWalletConnect() {
  const { 
    isConnected, 
    isConnecting, 
    connectionStatus, 
    lastError, 
    address, 
    connect, 
    connectWithWalletConnect,
    disconnect, 
    clearError 
  } = useWallet();
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isMobile] = useState(() => /Mobi|Android/i.test(navigator.userAgent));

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'error':
      case 'network_error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleWalletSelect = (action: () => void) => {
    setShowWalletModal(false);
    action();
  };

  const walletOptions: WalletOption[] = [
    // Browser Extensions
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect with MetaMask browser extension',
      action: () => handleWalletSelect(connect),
      recommended: !isMobile,
      category: 'browser'
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Connect with Coinbase Wallet extension',
      action: () => handleWalletSelect(connect),
      category: 'browser'
    },
    
    // Mobile Wallets via WalletConnect
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Scan QR code with any mobile wallet',
      action: () => handleWalletSelect(connectWithWalletConnect),
      recommended: isMobile,
      category: 'mobile'
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      icon: '🛡️',
      description: 'Connect with Trust Wallet mobile app',
      action: () => {
        if (isMobile) {
          window.location.href = 'https://link.trustwallet.com/wc?uri=' + encodeURIComponent(window.location.href);
        } else {
          handleWalletSelect(connectWithWalletConnect);
        }
      },
      category: 'mobile'
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      icon: '🌈',
      description: 'Connect with Rainbow mobile wallet',
      action: () => handleWalletSelect(connectWithWalletConnect),
      category: 'mobile'
    },
    {
      id: 'phantom',
      name: 'Phantom',
      icon: '👻',
      description: 'Multi-chain wallet (Ethereum & Solana)',
      action: () => handleWalletSelect(connectWithWalletConnect),
      category: 'mobile'
    }
  ];

  const groupedWallets = {
    browser: walletOptions.filter(w => w.category === 'browser'),
    mobile: walletOptions.filter(w => w.category === 'mobile')
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
          {getStatusIcon()}
          <span className="text-sm text-white font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 text-red-400"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowWalletModal(true)}
        disabled={isConnecting}
        className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 text-white border-0 px-6 py-2 font-medium transition-all duration-200 hover:scale-105"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </>
        )}
      </Button>

      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="sm:max-w-md bg-black/90 backdrop-blur-xl border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-center text-xl font-semibold">
              Choose Your Wallet
            </DialogTitle>
          </DialogHeader>

          {lastError && (
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                {lastError}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            {/* Browser Wallets */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Monitor className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-medium text-white">Browser Extensions</h3>
              </div>
              <div className="grid gap-2">
                {groupedWallets.browser.map((wallet) => (
                  <Button
                    key={wallet.id}
                    variant="ghost"
                    onClick={wallet.action}
                    className="w-full justify-start p-4 h-auto bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="text-2xl">{wallet.icon}</div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{wallet.name}</span>
                          {wallet.recommended && (
                            <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{wallet.description}</p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Mobile Wallets */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-4 w-4 text-pink-400" />
                <h3 className="text-sm font-medium text-white">Mobile & Multi-Chain</h3>
              </div>
              <div className="grid gap-2">
                {groupedWallets.mobile.map((wallet) => (
                  <Button
                    key={wallet.id}
                    variant="ghost"
                    onClick={wallet.action}
                    className="w-full justify-start p-4 h-auto bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="text-2xl">{wallet.icon}</div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{wallet.name}</span>
                          {wallet.recommended && (
                            <span className="text-xs px-2 py-1 bg-pink-500/20 text-pink-400 rounded-full">
                              Mobile Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1">{wallet.description}</p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-400 mt-4">
            {isMobile ? (
              <>Mobile wallets connect via WalletConnect protocol</>
            ) : (
              <>New to crypto? <span className="text-pink-400">MetaMask</span> is a great place to start</>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}