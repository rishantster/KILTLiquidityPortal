import { useState, useEffect } from 'react';
import { Smartphone, Wifi, Download, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface MobileWallet {
  name: string;
  id: string;
  icon: string;
  downloadUrl: {
    ios: string;
    android: string;
  };
  deepLink: {
    universal: string;
    ios: string;
    android: string;
  };
  isInstalled: boolean;
  supportsWalletConnect: boolean;
  popularity: number;
}

interface EnhancedMobileWalletProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (wallet: MobileWallet) => void;
}

export function EnhancedMobileWallet({ isOpen, onClose, onWalletSelect }: EnhancedMobileWalletProps) {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isIOS: false,
    isAndroid: false,
    userAgent: ''
  });
  const [connectionStep, setConnectionStep] = useState<'select' | 'connect' | 'instructions'>('select');
  const [selectedWallet, setSelectedWallet] = useState<MobileWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const mobileWallets: MobileWallet[] = [
    {
      name: 'MetaMask',
      id: 'metamask',
      icon: '🦊',
      downloadUrl: {
        ios: 'https://apps.apple.com/us/app/metamask/id1438144202',
        android: 'https://play.google.com/store/apps/details?id=io.metamask'
      },
      deepLink: {
        universal: 'https://metamask.app.link',
        ios: 'metamask://',
        android: 'metamask://'
      },
      isInstalled: false,
      supportsWalletConnect: true,
      popularity: 95
    },
    {
      name: 'Trust Wallet',
      id: 'trust',
      icon: '🛡️',
      downloadUrl: {
        ios: 'https://apps.apple.com/us/app/trust-crypto-bitcoin-wallet/id1288339409',
        android: 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp'
      },
      deepLink: {
        universal: 'https://link.trustwallet.com',
        ios: 'trust://',
        android: 'trust://'
      },
      isInstalled: false,
      supportsWalletConnect: true,
      popularity: 85
    },
    {
      name: 'Coinbase Wallet',
      id: 'coinbase',
      icon: '🔵',
      downloadUrl: {
        ios: 'https://apps.apple.com/us/app/coinbase-wallet/id1278383455',
        android: 'https://play.google.com/store/apps/details?id=org.toshi'
      },
      deepLink: {
        universal: 'https://go.cb-w.com',
        ios: 'cbwallet://',
        android: 'cbwallet://'
      },
      isInstalled: false,
      supportsWalletConnect: true,
      popularity: 80
    },
    {
      name: 'Rainbow',
      id: 'rainbow',
      icon: '🌈',
      downloadUrl: {
        ios: 'https://apps.apple.com/us/app/rainbow-ethereum-wallet/id1457119021',
        android: 'https://play.google.com/store/apps/details?id=me.rainbow'
      },
      deepLink: {
        universal: 'https://rnbwapp.com',
        ios: 'rainbow://',
        android: 'rainbow://'
      },
      isInstalled: false,
      supportsWalletConnect: true,
      popularity: 70
    },
    {
      name: 'SafePal',
      id: 'safepal',
      icon: '🔒',
      downloadUrl: {
        ios: 'https://apps.apple.com/us/app/safepal-crypto-wallet/id1548297139',
        android: 'https://play.google.com/store/apps/details?id=io.safepal.wallet'
      },
      deepLink: {
        universal: 'https://link.safepal.io',
        ios: 'safepal://',
        android: 'safepal://'
      },
      isInstalled: false,
      supportsWalletConnect: true,
      popularity: 60
    }
  ];

  // Detect device and installed wallets
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/i.test(userAgent);

    setDeviceInfo({
      isMobile,
      isIOS,
      isAndroid,
      userAgent
    });

    // Check for installed wallets
    detectInstalledWallets();
  }, []);

  const detectInstalledWallets = () => {
    // Check for MetaMask
    const hasMetaMask = typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask;
    
    // Check for Trust Wallet
    const hasTrust = typeof window !== 'undefined' && (window as any).ethereum?.isTrust;
    
    // Check for Coinbase Wallet
    const hasCoinbase = typeof window !== 'undefined' && (window as any).ethereum?.isCoinbaseWallet;

    // Update wallet installation status
    mobileWallets.forEach(wallet => {
      switch (wallet.id) {
        case 'metamask':
          wallet.isInstalled = hasMetaMask;
          break;
        case 'trust':
          wallet.isInstalled = hasTrust;
          break;
        case 'coinbase':
          wallet.isInstalled = hasCoinbase;
          break;
        default:
          wallet.isInstalled = false;
      }
    });
  };

  const handleWalletSelect = async (wallet: MobileWallet) => {
    setSelectedWallet(wallet);

    if (!wallet.isInstalled && deviceInfo.isMobile) {
      // Show installation instructions
      setConnectionStep('instructions');
      return;
    }

    // Attempt connection
    setConnectionStep('connect');
    setIsConnecting(true);

    try {
      if (deviceInfo.isMobile && wallet.isInstalled) {
        // Try deep link connection
        await connectViaDeepLink(wallet);
      } else {
        // Use WalletConnect for mobile browsers
        await connectViaWalletConnect(wallet);
      }
      
      onWalletSelect(wallet);
      onClose();
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setConnectionStep('instructions');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectViaDeepLink = async (wallet: MobileWallet) => {
    const baseUrl = window.location.origin;
    const connectUrl = `${wallet.deepLink.universal}/wc?uri=${encodeURIComponent(baseUrl)}`;
    
    // Try to open deep link
    window.location.href = connectUrl;
    
    // Fallback to universal link after delay
    setTimeout(() => {
      if (document.hidden || document.visibilityState === 'hidden') {
        // App opened successfully
        return;
      }
      
      // Try alternative deep link
      const platform = deviceInfo.isIOS ? 'ios' : deviceInfo.isAndroid ? 'android' : 'universal';
      window.open(wallet.deepLink[platform as keyof typeof wallet.deepLink], '_blank');
    }, 1000);
  };

  const connectViaWalletConnect = async (wallet: MobileWallet) => {
    // WalletConnect implementation would go here
    // For now, simulate connection
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const downloadWallet = (wallet: MobileWallet) => {
    const downloadUrl = deviceInfo.isIOS 
      ? wallet.downloadUrl.ios 
      : deviceInfo.isAndroid 
      ? wallet.downloadUrl.android 
      : wallet.downloadUrl.ios; // Default to iOS

    window.open(downloadUrl, '_blank');
  };

  const getConnectionInstructions = () => {
    if (!selectedWallet) return [];

    if (!selectedWallet.isInstalled) {
      return [
        {
          step: 1,
          title: 'Download Wallet',
          description: `Install ${selectedWallet.name} from your app store`,
          action: 'download'
        },
        {
          step: 2,
          title: 'Create Account',
          description: 'Set up your wallet and secure your seed phrase',
          action: 'setup'
        },
        {
          step: 3,
          title: 'Add Base Network',
          description: 'Configure Base network in your wallet settings',
          action: 'network'
        },
        {
          step: 4,
          title: 'Return & Connect',
          description: 'Come back to this page and connect your wallet',
          action: 'connect'
        }
      ];
    }

    return [
      {
        step: 1,
        title: 'Open Wallet App',
        description: `Open ${selectedWallet.name} on your device`,
        action: 'open'
      },
      {
        step: 2,
        title: 'Scan or Connect',
        description: 'Use WalletConnect or tap the connection link',
        action: 'scan'
      },
      {
        step: 3,
        title: 'Approve Connection',
        description: 'Approve the connection in your wallet',
        action: 'approve'
      }
    ];
  };

  const sortedWallets = [...mobileWallets].sort((a, b) => {
    // Installed wallets first, then by popularity
    if (a.isInstalled && !b.isInstalled) return -1;
    if (!a.isInstalled && b.isInstalled) return 1;
    return b.popularity - a.popularity;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-black/95 backdrop-blur-sm border-gray-800/30">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-pink-400" />
            <DialogTitle className="text-white font-mono">
              Mobile Wallet Connection
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            {deviceInfo.isMobile 
              ? 'Connect your mobile wallet to access KILT liquidity features'
              : 'Use your phone to connect a mobile wallet'
            }
          </DialogDescription>
        </DialogHeader>

        {connectionStep === 'select' && (
          <div className="space-y-4">
            {/* Device Info */}
            <div className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">
                  {deviceInfo.isMobile 
                    ? deviceInfo.isIOS ? 'iOS Device' : deviceInfo.isAndroid ? 'Android Device' : 'Mobile Device'
                    : 'Desktop Browser'
                  }
                </span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {deviceInfo.isMobile ? 'Mobile' : 'Desktop'}
              </Badge>
            </div>

            {/* Wallet List */}
            <div className="space-y-2">
              {sortedWallets.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet)}
                  className="w-full p-4 bg-gray-800/20 hover:bg-gray-700/30 rounded-lg border border-gray-700/30 hover:border-pink-500/30 transition-all duration-200 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{wallet.icon}</span>
                      <div>
                        <h3 className="text-sm font-medium text-white">
                          {wallet.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {wallet.isInstalled ? 'Installed' : 'Not installed'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {wallet.isInstalled && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      <Badge variant={wallet.isInstalled ? "default" : "secondary"} className="text-xs">
                        {wallet.isInstalled ? 'Ready' : 'Install'}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {connectionStep === 'connect' && selectedWallet && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-3xl">{selectedWallet.icon}</span>
              <div>
                <h3 className="text-lg font-medium text-white">
                  Connecting to {selectedWallet.name}
                </h3>
                <p className="text-sm text-gray-400">
                  Check your wallet app for connection request
                </p>
              </div>
            </div>

            {isConnecting && (
              <div className="flex items-center justify-center space-x-2">
                <Wifi className="w-4 h-4 text-pink-400 animate-pulse" />
                <span className="text-sm text-gray-300">Establishing connection...</span>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setConnectionStep('select')}
              className="w-full"
            >
              Back to Wallet Selection
            </Button>
          </div>
        )}

        {connectionStep === 'instructions' && selectedWallet && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">
                {selectedWallet.isInstalled 
                  ? 'Follow these steps to connect'
                  : 'Wallet installation required'
                }
              </span>
            </div>

            <div className="space-y-3">
              {getConnectionInstructions().map((instruction) => (
                <div key={instruction.step} className="flex items-start space-x-3 p-3 bg-gray-800/20 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {instruction.step}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-white">
                      {instruction.title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {instruction.description}
                    </p>
                    {instruction.action === 'download' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadWallet(selectedWallet)}
                        className="mt-2 text-xs"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download {selectedWallet.name}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setConnectionStep('select')}
                className="flex-1"
              >
                Back
              </Button>
              {selectedWallet.isInstalled && (
                <Button
                  onClick={() => handleWalletSelect(selectedWallet)}
                  className="flex-1"
                >
                  Try Again
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center pt-4 border-t border-gray-800/30">
          <p className="text-xs text-gray-500">
            Having trouble? Try using{' '}
            <button className="text-pink-400 hover:text-pink-300 underline">
              WalletConnect
            </button>{' '}
            or connect on desktop
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}