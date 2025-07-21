import { useState } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  Smartphone, 
  Monitor, 
  Wallet,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  description: string;
  action: () => void;
  recommended?: boolean;
  type: 'browser' | 'mobile' | 'universal';
}

export function ModernWalletConnect() {
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
  
  const [showModal, setShowModal] = useState(false);
  const [isMobile] = useState(() => /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

  const handleWalletAction = (action: () => void) => {
    setShowModal(false);
    action();
  };

  const walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      description: 'Most popular Ethereum wallet with browser extension',
      action: () => handleWalletAction(connect),
      recommended: !isMobile,
      type: 'browser'
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Connect with any mobile wallet via QR code scanning',
      action: () => handleWalletAction(connectWithWalletConnect),
      recommended: true,
      type: 'universal'
    }
  ];

  // Mobile wallet deep links following Reown best practices
  const mobileWallets = [
    {
      name: 'MetaMask',
      icon: '🦊',
      color: 'from-orange-500/20 to-orange-600/20',
      action: () => {
        const dappUrl = window.location.href.replace(/^https?:\/\//, '');
        window.open(`https://metamask.app.link/dapp/${dappUrl}`, '_blank');
      }
    },
    {
      name: 'Trust Wallet',
      icon: '🛡️',
      color: 'from-blue-500/20 to-blue-600/20',
      action: () => {
        const encodedUrl = encodeURIComponent(window.location.href);
        window.open(`https://link.trustwallet.com/open_url?coin_id=60&url=${encodedUrl}`, '_blank');
      }
    },
    {
      name: 'Coinbase',
      icon: '🔵',
      color: 'from-blue-600/20 to-blue-700/20',
      action: () => {
        const encodedUrl = encodeURIComponent(window.location.href);
        window.open(`https://go.cb-w.com/dapp?cb_url=${encodedUrl}`, '_blank');
      }
    },
    {
      name: 'Web3Modal v3',
      icon: '🔗',
      color: 'from-purple-500/20 to-pink-500/20',
      action: () => {
        window.open(`https://walletconnect.com/`, '_blank');
      }
    }
  ];

  // Connected state - compact display
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 backdrop-blur-sm rounded-xl border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <Wallet className="h-4 w-4 text-emerald-400" />
          <span className="text-sm numeric-display text-white">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        
        <Button
          onClick={disconnect}
          variant="ghost"
          size="sm"
          className="h-auto px-3 py-1 text-xs hover:bg-red-500/20 hover:text-red-300 text-gray-400 rounded-full transition-all"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Error Alert */}
      {lastError && (
        <Alert className="border-red-500/30 bg-red-500/10 backdrop-blur-sm mb-3">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300 text-sm">
            {lastError}
            <Button
              onClick={clearError}
              variant="ghost" 
              size="sm"
              className="ml-2 h-auto p-1 text-red-400 hover:text-red-300"
            >
              ✕
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Connect Button - Modern Reown Style */}
      <Button
        onClick={() => setShowModal(true)}
        disabled={isConnecting}
        className="w-full bg-gradient-to-r from-[#ff0066] to-purple-600 hover:from-[#ff0066]/90 hover:to-purple-600/90 text-white border-0 transition-all duration-300 backdrop-blur-sm shadow-xl shadow-[#ff0066]/30 hover:shadow-[#ff0066]/50 transform hover:scale-[1.02] active:scale-[0.98] font-semibold text-lg py-3"
      >
        {isConnecting ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span>Connect Wallet</span>
          </div>
        )}
      </Button>

      {/* Modern Wallet Selection Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md bg-black/95 backdrop-blur-xl border border-[#ff0066]/40 shadow-2xl shadow-[#ff0066]/25 rounded-2xl">
          <DialogHeader className="pb-6 border-b border-gray-800/50">
            <DialogTitle className="text-white text-2xl font-bold text-center bg-gradient-to-r from-white via-[#ff0066]/80 to-white bg-clip-text text-transparent">
              Connect Wallet
            </DialogTitle>
            <p className="text-gray-400 text-sm text-center mt-2 font-medium">
              Choose your preferred wallet to connect to KILT Liquidity Portal
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Primary Wallet Options */}
            {walletOptions.map((wallet) => (
              <button
                key={wallet.id}
                onClick={wallet.action}
                disabled={isConnecting}
                className="w-full group relative overflow-hidden"
              >
                <div className="p-4 border border-gray-700/40 bg-gradient-to-r from-gray-900/90 to-gray-800/70 hover:from-[#ff0066]/10 hover:to-purple-600/10 hover:border-[#ff0066]/50 transition-all duration-300 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{wallet.icon}</div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-white font-semibold text-lg">{wallet.name}</span>
                        {wallet.recommended && (
                          <Badge className="bg-[#ff0066]/20 text-[#ff0066] border border-[#ff0066]/40 text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {wallet.description}
                      </p>
                    </div>

                    <div className="bg-gray-800/50 p-2 rounded-lg group-hover:bg-[#ff0066]/20 transition-all">
                      {wallet.type === 'browser' ? 
                        <Monitor className="h-4 w-4 text-gray-400 group-hover:text-white" /> :
                        wallet.type === 'mobile' ?
                        <Smartphone className="h-4 w-4 text-gray-400 group-hover:text-white" /> :
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
                      }
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Mobile Wallets Section */}
            {isMobile && (
              <div className="pt-4 border-t border-gray-700/30">
                <p className="text-gray-400 text-sm text-center mb-4 font-medium">
                  Open directly in wallet app:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {mobileWallets.map((wallet) => (
                    <button
                      key={wallet.name}
                      onClick={wallet.action}
                      className="group p-4 border border-gray-700/30 bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-[#ff0066]/10 hover:to-purple-600/10 hover:border-[#ff0066]/40 transition-all duration-300 rounded-xl backdrop-blur-sm"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl">{wallet.icon}</span>
                        <span className="text-sm text-gray-300 group-hover:text-white font-medium">
                          {wallet.name}
                        </span>
                        <ExternalLink className="h-3 w-3 text-gray-500 group-hover:text-[#ff0066] transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Connection Status Indicator */}
            {connectionStatus && connectionStatus !== 'disconnected' && (
              <div className="flex items-center justify-center gap-2 p-3 bg-gray-800/30 rounded-lg">
                {connectionStatus === 'connecting' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                    <span className="text-sm text-gray-300">Connecting to wallet...</span>
                  </>
                )}
                {connectionStatus === 'connected' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm text-gray-300">Successfully connected!</span>
                  </>
                )}
                {connectionStatus === 'error' && (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-gray-300">Connection failed</span>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}