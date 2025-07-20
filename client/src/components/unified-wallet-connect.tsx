import { useState } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Wifi, WifiOff, AlertTriangle, CheckCircle, Smartphone, Monitor } from 'lucide-react';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  action: () => void;
  recommended?: boolean;
}

export function UnifiedWalletConnect() {
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

  const handleWalletSelect = (action: () => void) => {
    setShowWalletModal(false);
    action();
  };

  const walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect using MetaMask browser extension',
      action: () => handleWalletSelect(connect),
      recommended: !isMobile
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Scan with mobile wallet or connect any WalletConnect wallet',
      action: () => handleWalletSelect(connectWithWalletConnect),
      recommended: isMobile
    }
  ];

  // Mobile wallet deep links for direct connection
  const mobileWalletLinks = [
    {
      name: 'MetaMask Mobile',
      icon: '🦊',
      action: () => {
        const currentUrl = window.location.href;
        window.location.href = `https://metamask.app.link/dapp/${currentUrl}`;
      }
    },
    {
      name: 'Trust Wallet',
      icon: '🛡️',
      action: () => {
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${currentUrl}`;
      }
    },
    {
      name: 'Coinbase Wallet',
      icon: '🔵',
      action: () => {
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = `https://go.cb-w.com/dapp?cb_url=${currentUrl}`;
      }
    }
  ];

  if (isConnected) {
    return (
      <div className="p-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-sm text-white font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            {getStatusBadge()}
          </div>
          <button
            onClick={disconnect}
            className="px-3 py-1 text-xs hover:bg-pink-500/30 hover:text-white rounded-full transition-all duration-200 bg-[#ff0066] text-[#ffffff]"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Error Display */}
      {lastError && (
        <Alert className="border-red-500/20 bg-red-500/5 mb-3">
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

      {/* Main Connect Button */}
      <Button
        onClick={() => setShowWalletModal(true)}
        disabled={isConnecting}
        className="w-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-white border-0 transition-all duration-200 backdrop-blur-sm"
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          "Connect Wallet"
        )}
      </Button>

      {/* Wallet Selection Modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="sm:max-w-lg bg-black/95 backdrop-blur-xl border border-[#ff0066]/30 shadow-2xl shadow-[#ff0066]/20 rounded-2xl">
          <DialogHeader className="pb-6 border-b border-gray-800/50">
            <DialogTitle className="text-white text-2xl font-bold text-center bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
              Connect your wallet
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Primary Wallet Options */}
            <div className="space-y-4">
              {walletOptions.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={wallet.action}
                  className="w-full p-5 border border-gray-700/30 bg-gradient-to-r from-gray-900/80 to-gray-800/60 hover:from-[#ff0066]/20 hover:to-purple-600/20 hover:border-[#ff0066]/50 transition-all duration-300 group rounded-xl backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-4 w-full">
                    <div className="text-4xl">{wallet.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-white font-bold text-lg group-hover:text-white transition-colors">{wallet.name}</span>
                        {wallet.recommended && (
                          <div className="bg-[#ff0066]/30 text-[#ff0066] border border-[#ff0066]/40 text-xs px-3 py-1 rounded-full font-semibold">
                            Recommended
                          </div>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors leading-relaxed">{wallet.description}</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-xl group-hover:bg-[#ff0066]/30 transition-all duration-300">
                      {isMobile ? <Smartphone className="h-5 w-5 text-gray-400 group-hover:text-white" /> : <Monitor className="h-5 w-5 text-gray-400 group-hover:text-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Mobile Direct Links */}
            {isMobile && (
              <div className="pt-6 border-t border-gray-700/30">
                <p className="text-gray-400 text-base text-center mb-6 font-medium">
                  Or open directly in your wallet app:
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {mobileWalletLinks.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={wallet.action}
                      className="flex flex-col items-center p-5 h-auto bg-gradient-to-b from-gray-800/60 to-gray-900/60 hover:from-[#ff0066]/20 hover:to-purple-600/20 border border-gray-700/30 hover:border-[#ff0066]/40 transition-all duration-300 group rounded-xl backdrop-blur-sm"
                    >
                      <span className="text-3xl mb-3">{wallet.icon}</span>
                      <span className="text-sm text-gray-300 group-hover:text-white font-semibold">{wallet.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}