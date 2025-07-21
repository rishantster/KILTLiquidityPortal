import { useState } from 'react';
import { useWallet } from '../contexts/wallet-context';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Loader2, Wallet, Smartphone, Globe, CheckCircle } from 'lucide-react';

interface WalletOption {
  id: string;
  name: string;
  description: string;
  icon: JSX.Element;
  action: () => Promise<void>;
  type: 'injected' | 'mobile' | 'universal';
  detected?: boolean;
  recommended?: boolean;
}

export function OptimalWalletConnect() {
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

  // Detect available wallet providers
  const detectWalletProviders = () => {
    const detected = {
      metamask: !!(window as any).ethereum?.isMetaMask,
      coinbase: !!(window as any).ethereum?.isCoinbaseWallet || !!(window as any).ethereum?.selectedProvider?.isCoinbaseWallet,
      injected: !!(window as any).ethereum && !(window as any).ethereum?.isMetaMask && !(window as any).ethereum?.isCoinbaseWallet,
    };
    return detected;
  };

  const walletProviders = detectWalletProviders();

  const handleWalletAction = async (action: () => Promise<void>) => {
    setShowModal(false);
    clearError();
    try {
      await action();
    } catch (error) {
      console.error('Wallet action failed:', error);
    }
  };

  const walletOptions: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      description: 'Connect with MetaMask browser extension',
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
          <svg width="24" height="24" viewBox="0 0 212 189" fill="none">
            <path d="M40.8 1.7L26 46.1L54.5 26.8Z" fill="#E2761B"/>
            <path d="M171.1 1.7L185.7 46.1L157.4 26.8Z" fill="#E4761B"/>
            <path d="M68.4 106.9L76.2 90.8L136.3 90.8Z" fill="#F6851B"/>
            <path d="M143.6 106.9L135.8 90.8L75.7 90.8Z" fill="#F6851B"/>
          </svg>
        </div>
      ),
      action: () => handleWalletAction(connect),
      type: 'injected',
      detected: walletProviders.metamask,
      recommended: !isMobile && walletProviders.metamask
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      description: 'Connect with Coinbase Wallet extension',
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="14" fill="#0052FF"/>
            <circle cx="14" cy="14" r="6" fill="white"/>
            <circle cx="14" cy="14" r="3" fill="#0052FF"/>
          </svg>
        </div>
      ),
      action: () => handleWalletAction(connect),
      type: 'injected',
      detected: walletProviders.coinbase,
      recommended: !isMobile && walletProviders.coinbase
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      description: 'Connect with any mobile wallet via QR code',
      icon: (
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center shadow-lg">
          <svg width="24" height="24" viewBox="0 0 480 332" fill="none">
            <path d="M126.613 93.9842C162.109 58.4882 220.436 58.4882 255.932 93.9842L269.432 107.484C271.949 110.001 271.949 114.256 269.432 116.773L244.35 141.855C243.092 143.113 240.956 143.113 239.698 141.855L229.64 131.797C207.486 109.643 169.856 109.643 147.702 131.797L136.817 142.683C135.559 143.941 133.423 143.941 132.165 142.683L107.083 117.6C104.566 115.083 104.566 110.828 107.083 108.311L126.613 93.9842ZM321.637 166.69L344.626 189.679C347.143 192.196 347.143 196.451 344.626 198.968L244.35 299.244C241.833 301.761 237.578 301.761 235.061 299.244L168.519 232.702C167.89 232.073 166.822 232.073 166.193 232.702L99.6518 299.244C97.1348 301.761 92.8802 301.761 90.3632 299.244L-9.91321 198.968C-12.4302 196.451 -12.4302 192.196 -9.91321 189.679L12.0762 166.69C14.5932 164.173 18.8478 164.173 21.3648 166.69L87.9068 233.232C88.5358 233.861 89.6038 233.861 90.2328 233.232L156.775 166.69C159.292 164.173 163.546 164.173 166.063 166.69L232.605 233.232C233.234 233.861 234.302 233.861 234.931 233.232L301.473 166.69C303.99 164.173 308.245 164.173 310.762 166.69H321.637Z" fill="white"/>
          </svg>
        </div>
      ),
      action: () => handleWalletAction(connectWithWalletConnect),
      type: 'universal',
      detected: true,
      recommended: isMobile
    }
  ];

  if (isConnected) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-100">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
        <Button
          onClick={disconnect}
          variant="outline"
          size="sm"
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        disabled={isConnecting}
        className="bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-medium px-6 py-2 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[400px] bg-gray-900/95 backdrop-blur-sm border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-center">
              Connect Your Wallet
            </DialogTitle>
          </DialogHeader>
          
          {lastError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
              {lastError}
            </div>
          )}

          <div className="space-y-3 mt-4">
            {/* Browser Extensions */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Wallet className="w-4 h-4" />
                <span>Browser Extensions</span>
              </div>
              
              {walletOptions
                .filter(option => option.type === 'injected')
                .map((option) => (
                  <Button
                    key={option.id}
                    onClick={option.action}
                    disabled={isConnecting || connectionStatus === 'connecting'}
                    className="w-full flex items-center justify-between p-4 h-auto bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50 text-left disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200"
                    variant="ghost"
                  >
                    <div className="flex items-center space-x-3">
                      {option.icon}
                      <div>
                        <div className="font-medium">{option.name}</div>
                        <div className="text-sm text-gray-400">{option.description}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {option.detected && (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                          Detected
                        </Badge>
                      )}
                      {option.recommended && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-400">
                          Recommended
                        </Badge>
                      )}
                      {!option.detected && (
                        <Badge variant="outline" className="text-xs bg-gray-500/10 border-gray-500/30 text-gray-400">
                          Install
                        </Badge>
                      )}
                    </div>
                  </Button>
                ))}
            </div>

            {/* Universal/Mobile Options */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Globe className="w-4 h-4" />
                <span>Universal Connection</span>
              </div>
              
              {walletOptions
                .filter(option => option.type === 'universal')
                .map((option) => (
                  <Button
                    key={option.id}
                    onClick={option.action}
                    disabled={isConnecting || connectionStatus === 'connecting'}
                    className="w-full flex items-center justify-between p-4 h-auto bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600/30 hover:border-gray-500/50 text-left disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200"
                    variant="ghost"
                  >
                    <div className="flex items-center space-x-3">
                      {option.icon}
                      <div>
                        <div className="font-medium">{option.name}</div>
                        <div className="text-sm text-gray-400">{option.description}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {option.recommended && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30 text-blue-400">
                          Recommended
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                        Available
                      </Badge>
                    </div>
                  </Button>
                ))}
            </div>
          </div>

          {/* Connection Status */}
          {connectionStatus === 'connecting' && (
            <div className="flex items-center justify-center space-x-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-blue-300 text-sm">Establishing connection...</span>
            </div>
          )}

          <div className="text-xs text-gray-400 text-center mt-4">
            By connecting, you agree to our terms of service and privacy policy.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}