import { useState } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Wifi, WifiOff, AlertTriangle, CheckCircle, Smartphone, Monitor, Wallet, Chrome, Globe } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WalletOption {
  id: string;
  name: string;
  icon: React.ReactNode;
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
      icon: (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
          <svg width="20" height="20" viewBox="0 0 318.6 318.6" fill="white">
            <path d="m274.1 35.76-99.5 73.27L193.4 65.8z"/>
            <path d="m44.4 35.76 98.7 74.13-17.9-43.23z"/>
            <path d="m238.3 206.8-34.84 53.44 74.6 20.58 21.46-72.9z"/>
            <path d="m19.11 207.9 21.4 72.9 74.6-20.58-34.84-53.44z"/>
            <path d="m111.3 138.8-16.2 24.3 74.1 1.97-.69-79.87z"/>
            <path d="m207.2 138.8-57.15-53.63-.69 79.87 74.1-1.97z"/>
            <path d="m115.1 260.2 44.19-21.53-38.12-29.71z"/>
            <path d="m159.4 238.7 44.19 21.53-6.07-51.24z"/>
          </svg>
        </div>
      ),
      description: 'Connect with MetaMask browser extension',
      action: () => handleWalletSelect(connect),
      recommended: !isMobile,
      category: 'browser'
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="white">
            <path d="M14 0C6.27 0 0 6.27 0 14s6.27 14 14 14 14-6.27 14-14S21.73 0 14 0zm-3.5 21c-2.46 0-4.45-1.99-4.45-4.45s1.99-4.45 4.45-4.45c1.04 0 2.01.36 2.77.96l-1.13 1.08c-.51-.4-1.16-.64-1.84-.64-1.66 0-3.01 1.35-3.01 3.01s1.35 3.01 3.01 3.01c1.22 0 2.27-.74 2.73-1.8h-2.73v-1.44h4.32c.05.24.08.48.08.74 0 2.46-1.99 4.45-4.45 4.45zm7.5-3.5h-3v-3h3v3z"/>
          </svg>
        </div>
      ),
      description: 'Connect with Coinbase Wallet extension',
      action: () => handleWalletSelect(connect),
      category: 'browser'
    },
    
    // Mobile Wallets via WalletConnect
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M7.5 6.5C7.5 8.981 5.481 11 3 11s-4.5-2.019-4.5-4.5S0.519 2 3 2s4.5 2.019 4.5 4.5zM3 13c-2.481 0-4.5 2.019-4.5 4.5S0.519 22 3 22s4.5-2.019 4.5-4.5S5.481 13 3 13zm18 0c-2.481 0-4.5 2.019-4.5 4.5S18.519 22 21 22s4.5-2.019 4.5-4.5S23.481 13 21 13zm0-11C18.519 2 16.5 4.019 16.5 6.5S18.519 11 21 11s4.5-2.019 4.5-4.5S23.481 2 21 2zM12 8c-2.209 0-4 1.791-4 4s1.791 4 4 4 4-1.791 4-4-1.791-4-4-4z"/>
          </svg>
        </div>
      ),
      description: 'Scan QR code with any mobile wallet',
      action: () => handleWalletSelect(connectWithWalletConnect),
      recommended: isMobile,
      category: 'mobile'
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      icon: (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zM12 7c1.4 0 2.8 1.1 2.8 2.5V11c.6 0 1.2.4 1.2 1v4c0 .6-.6 1-1.2 1H9.2c-.6 0-1.2-.4-1.2-1v-4c0-.6.6-1 1.2-1V9.5C9.2 8.1 10.6 7 12 7zm0 1.2c-.8 0-1.5.7-1.5 1.5V11h3V9.7c0-.8-.7-1.5-1.5-1.5z"/>
          </svg>
        </div>
      ),
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
      icon: (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
          <svg width="20" height="20" viewBox="0 0 120 120" fill="white">
            <defs>
              <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6b6b"/>
                <stop offset="25%" stopColor="#4ecdc4"/>
                <stop offset="50%" stopColor="#45b7d1"/>
                <stop offset="75%" stopColor="#f9ca24"/>
                <stop offset="100%" stopColor="#f0932b"/>
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="50" fill="url(#rainbow)" opacity="0.8"/>
            <circle cx="60" cy="40" r="15" fill="white"/>
            <circle cx="40" cy="70" r="12" fill="white"/>
            <circle cx="80" cy="70" r="12" fill="white"/>
          </svg>
        </div>
      ),
      description: 'Connect with Rainbow mobile wallet',
      action: () => handleWalletSelect(connectWithWalletConnect),
      category: 'mobile'
    },
    {
      id: 'phantom',
      name: 'Phantom',
      icon: (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center shadow-lg">
          <svg width="20" height="20" viewBox="0 0 128 128" fill="white">
            <path d="M64 8C35.8 8 13.4 25.6 8.2 49.6c-.3 1.4-.5 2.9-.6 4.4-.1 1.5-.1 3-.1 4.5 0 1.5 0 3 .1 4.5.1 1.5.3 3 .6 4.4C13.4 91.4 35.8 109 64 109s50.6-17.6 55.8-41.6c.3-1.4.5-2.9.6-4.4.1-1.5.1-3 .1-4.5 0-1.5 0-3-.1-4.5-.1-1.5-.3-3-.6-4.4C114.6 25.6 92.2 8 64 8zm0 16c19.9 0 37.1 11.6 45.2 28.4-.8.3-1.6.6-2.4.9-4.8 1.8-9.8 2.7-14.8 2.7s-10-.9-14.8-2.7c-.8-.3-1.6-.6-2.4-.9C82.9 35.6 74.1 24 64 24s-18.9 11.6-10.8 28.4c-.8.3-1.6.6-2.4.9-4.8 1.8-9.8 2.7-14.8 2.7s-10-.9-14.8-2.7c-.8-.3-1.6-.6-2.4-.9C26.9 35.6 44.1 24 64 24z"/>
          </svg>
        </div>
      ),
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
                      <div className="flex-shrink-0">{wallet.icon}</div>
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
                      <div className="flex-shrink-0">{wallet.icon}</div>
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