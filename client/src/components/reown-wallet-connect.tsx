import { useState } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wifi, WifiOff, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';

interface MobileWallet {
  name: string;
  deepLink: string;
  downloadLink: string;
  icon: string;
}

const MOBILE_WALLETS: MobileWallet[] = [
  {
    name: 'MetaMask',
    deepLink: 'https://metamask.app.link/dapp/',
    downloadLink: 'https://metamask.io/download/',
    icon: '🦊'
  },
  {
    name: 'Trust Wallet',
    deepLink: 'https://link.trustwallet.com/open_url?coin_id=60&url=',
    downloadLink: 'https://trustwallet.com/',
    icon: '🛡️'
  },
  {
    name: 'Coinbase Wallet',
    deepLink: 'https://go.cb-w.com/dapp?cb_url=',
    downloadLink: 'https://www.coinbase.com/wallet',
    icon: '🔵'
  },
  {
    name: 'Rainbow',
    deepLink: 'https://rnbwapp.com/dapp/',
    downloadLink: 'https://rainbow.me/',
    icon: '🌈'
  }
];

export function ReownWalletConnect() {
  const { 
    isConnected, 
    isConnecting, 
    connectionStatus, 
    lastError, 
    address, 
    connect, 
    disconnect, 
    clearError 
  } = useWallet();
  
  const [showMobileOptions, setShowMobileOptions] = useState(false);
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

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Connected</Badge>;
      case 'connecting':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Connecting...</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Error</Badge>;
      case 'network_error':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Network Error</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Disconnected</Badge>;
    }
  };

  const handleMobileConnect = (wallet: MobileWallet) => {
    const currentUrl = window.location.href;
    const encodedUrl = encodeURIComponent(currentUrl);
    
    // Different encoding for different wallets (Reown best practice)
    let mobileUrl: string;
    if (wallet.name === 'Trust Wallet' || wallet.name === 'Coinbase Wallet') {
      mobileUrl = wallet.deepLink + encodedUrl;
    } else {
      mobileUrl = wallet.deepLink + currentUrl;
    }
    
    // Try to open the wallet app
    window.location.href = mobileUrl;
    
    // Fallback to download page after delay
    setTimeout(() => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('android')) {
        window.open(`${wallet.downloadLink}#android`, '_blank');
      } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        window.open(`${wallet.downloadLink}#ios`, '_blank');
      }
    }, 2500);
  };

  if (isConnected) {
    return (
      <div className="p-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-sm text-gray-400 font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
          <button
            onClick={disconnect}
            className="px-3 py-1 text-xs hover:bg-pink-500/30 hover:text-white rounded-full transition-all duration-200 bg-[#ff0466] text-[#ffffff]"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      

      {/* Error Display */}
      {lastError && (
        <Alert className="border-red-500/20 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-400">
            {lastError}
            <Button
              onClick={clearError}
              variant="ghost"
              size="sm"
              className="ml-2 h-auto p-1 text-red-400 hover:text-red-300"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Desktop Connection */}
      {!isMobile && (
        <Button
          onClick={connect}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-white border-0 transition-all duration-200"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wifi className="mr-2 h-4 w-4" />
              Connect Wallet
            </>
          )}
        </Button>
      )}

      {/* Mobile Connection Options */}
      {isMobile && (
        <div className="space-y-3">
          {!showMobileOptions ? (
            <Button
              onClick={() => setShowMobileOptions(true)}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-white border-0 transition-all duration-200"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Connect Mobile Wallet
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-400 text-center mb-3">
                Choose your wallet app:
              </div>
              {MOBILE_WALLETS.map((wallet) => (
                <Button
                  key={wallet.name}
                  onClick={() => handleMobileConnect(wallet)}
                  variant="ghost"
                  className="w-full justify-start border-0 hover:bg-white/10 transition-all duration-200 text-white"
                >
                  <span className="mr-3 text-lg">{wallet.icon}</span>
                  <span>{wallet.name}</span>
                </Button>
              ))}
              <Button
                onClick={() => setShowMobileOptions(false)}
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
              >
                Back
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Network Status Indicator */}
      <div className="flex items-center justify-center gap-2 p-2">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
        <span className="text-xs text-gray-400">Base Mainnet</span>
      </div>
    </div>
  );
}