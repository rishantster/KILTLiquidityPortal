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
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
          <svg width="20" height="20" viewBox="0 0 212 189" fill="none">
            <g clipPath="url(#clip0)">
              <path d="M40.8 1.7 L26 46.1 L54.5 26.8 Z" fill="#E2761B" stroke="#E2761B"/>
              <path d="M171.1 1.7 L185.7 46.1 L157.4 26.8 Z" fill="#E4761B" stroke="#E4761B"/>
              <path d="M37.9 136.4 L16.3 168.1 L69.3 165.1 Z" fill="#E4761B" stroke="#E4761B"/>
              <path d="M174.1 136.4 L195.7 168.1 L142.7 165.1 Z" fill="#E4761B" stroke="#E4761B"/>
              <path d="M68.4 106.9 L76.2 90.8 L136.3 90.8 Z" fill="#F6851B" stroke="#F6851B"/>
              <path d="M143.6 106.9 L135.8 90.8 L75.7 90.8 Z" fill="#F6851B" stroke="#F6851B"/>
              <path d="M68.9 165.7 L94.6 153.1 L72.3 138.1 Z" fill="#F6851B" stroke="#F6851B"/>
              <path d="M143.1 165.7 L117.4 153.1 L139.7 138.1 Z" fill="#F6851B" stroke="#F6851B"/>
            </g>
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
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="14" fill="#0052FF"/>
            <path d="M14 22c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z" fill="white"/>
            <path d="M14 18c2.209 0 4-1.791 4-4s-1.791-4-4-4-4 1.791-4 4 1.791 4 4 4z" fill="#0052FF"/>
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
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
          <svg width="20" height="20" viewBox="0 0 480 332" fill="none">
            <path d="M126.613 93.9842C162.109 58.4877 219.441 58.4877 254.937 93.9842L260.718 99.7651C262.718 101.765 262.718 105.073 260.718 107.073L238.236 129.555C237.236 130.555 235.564 130.555 234.564 129.555L227.473 122.464C208.139 103.13 176.851 103.13 157.517 122.464L149.738 130.243C148.738 131.243 147.066 131.243 146.066 130.243L123.584 107.761C121.584 105.761 121.584 102.453 123.584 100.453L126.613 93.9842ZM321.978 146.487L341.616 166.125C343.616 168.125 343.616 171.433 341.616 173.433L265.654 249.395C263.654 251.395 260.346 251.395 258.346 249.395L190.775 181.824C190.275 181.324 189.401 181.324 188.901 181.824L121.33 249.395C119.33 251.395 116.022 251.395 114.022 249.395L38.0596 173.433C36.0596 171.433 36.0596 168.125 38.0596 166.125L57.6977 146.487C59.6977 144.487 63.0058 144.487 65.0058 146.487L132.577 214.058C133.077 214.558 133.951 214.558 134.451 214.058L202.022 146.487C204.022 144.487 207.33 144.487 209.33 146.487L276.901 214.058C277.401 214.558 278.275 214.558 278.775 214.058L346.346 146.487C348.346 144.487 351.654 144.487 353.654 146.487L321.978 146.487Z" fill="white"/>
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
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
          <svg width="20" height="20" viewBox="0 0 64 64" fill="white">
            <path d="M32 2C23.16 2 16 9.16 16 18v8h-2c-1.1 0-2 .9-2 2v32c0 1.1.9 2 2 2h36c1.1 0 2-.9 2-2V28c0-1.1-.9-2-2-2h-2v-8c0-8.84-7.16-16-16-16zm0 4c6.63 0 12 5.37 12 12v8H20v-8c0-6.63 5.37-12 12-12z"/>
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
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
            <circle cx="12" cy="12" r="2" fill="white"/>
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 2.74 1.58 5.11 3.88 6.26L7 19h10l-1.88-3.74C17.42 14.11 19 11.74 19 9c0-3.87-3.13-7-7-7z"/>
            <circle cx="9" cy="8" r="1.5" fill="#AB47BC"/>
            <circle cx="15" cy="8" r="1.5" fill="#AB47BC"/>
            <path d="M12 10c1.11 0 2 .89 2 2s-.89 2-2 2-2-.89-2-2 .89-2 2-2z" fill="#7B1FA2"/>
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