import React, { useState, useEffect } from 'react';
import { X, Wallet, Smartphone, ChevronRight, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWagmiWallet } from '@/hooks/use-wagmi-wallet';

interface MobileWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOBILE_WALLETS = [
  { id: 'metaMaskSDK', name: 'MetaMask', deepLink: 'https://metamask.app.link/dapp/' },
  { id: 'coinbaseWalletSDK', name: 'Coinbase Wallet', deepLink: 'https://go.cb-w.com/dapp?cb_url=' },
  { id: 'trust', name: 'Trust Wallet', deepLink: 'https://link.trustwallet.com/open_url?coin_id=60&url=' },
  { id: 'rainbow', name: 'Rainbow', deepLink: 'https://rnbwapp.com//' }
];

export function MobileWalletModal({ isOpen, onClose }: MobileWalletModalProps) {
  const { connectWallet, isConnecting } = useWagmiWallet();
  const [installedWallets, setInstalledWallets] = useState<string[]>([]);

  // Detect installed mobile wallets
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const installed: string[] = [];
    
    // Check for MetaMask
    if (window.ethereum?.isMetaMask) {
      installed.push('metaMaskSDK');
    }
    
    // Check for Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
      installed.push('coinbaseWalletSDK');
    }
    
    // Check for Trust Wallet
    if (window.ethereum?.isTrust) {
      installed.push('trust');
    }
    
    setInstalledWallets(installed);
  }, []);

  const handleWalletConnect = async (walletId: string) => {
    try {
      if (walletId === 'walletConnect') {
        await connectWallet('walletConnect');
      } else {
        // For mobile wallets, try direct connection first
        const wallet = MOBILE_WALLETS.find(w => w.id === walletId);
        if (wallet && installedWallets.includes(walletId)) {
          await connectWallet(walletId);
        } else {
          // Open wallet app via deep link
          const currentUrl = window.location.href;
          const deepLink = wallet?.deepLink + encodeURIComponent(currentUrl);
          if (deepLink) {
            window.open(deepLink, '_blank');
          }
        }
      }
      onClose();
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
        onClick={onClose}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh'
        }}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-0 z-[9999] flex items-end justify-center p-0"
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh'
        }}
      >
        <div 
          className="w-full bg-gray-900 border-t border-gray-700 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
          style={{
            maxHeight: '85vh',
            minHeight: '50vh',
            width: '100%',
            margin: 0,
            borderRadius: '24px 24px 0 0'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
                <p className="text-sm text-gray-400">Choose your preferred wallet</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
            {/* Installed Wallets */}
            {installedWallets.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <h3 className="text-sm font-medium text-green-400">Installed Wallets</h3>
                </div>
                <div className="space-y-3">
                  {MOBILE_WALLETS.filter(wallet => installedWallets.includes(wallet.id)).map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => handleWalletConnect(wallet.id)}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-2xl hover:bg-green-500/20 transition-all duration-200 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {wallet.name.charAt(0)}
                          </span>
                        </div>
                        <div className="text-left">
                          <div className="text-white font-medium">{wallet.name}</div>
                          <div className="text-green-400 text-sm">Ready to connect</div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-green-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* WalletConnect */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-4">Universal Connection</h3>
              <button
                onClick={() => handleWalletConnect('walletConnect')}
                disabled={isConnecting}
                className="w-full flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl hover:bg-blue-500/20 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.65 7.65c4.7-4.7 12.3-4.7 17 0L22.5 9.8c.4.4.4 1 0 1.4l-1.9 1.9c-.2.2-.5.2-.7 0l-2.2-2.2c-3.3-3.3-8.6-3.3-11.9 0l-2.4 2.4c-.2.2-.5.2-.7 0L1.5 11.2c-.4-.4-.4-1 0-1.4L7.65 7.65zM12 15c1.5 0 2.8 1.3 2.8 2.8s-1.3 2.8-2.8 2.8-2.8-1.3-2.8-2.8S10.5 15 12 15z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">WalletConnect</div>
                    <div className="text-blue-400 text-sm">Works with 200+ wallets</div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-400" />
              </button>
            </div>

            {/* Other Wallets */}
            {MOBILE_WALLETS.filter(wallet => !installedWallets.includes(wallet.id)).length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-4">Download & Connect</h3>
                <div className="space-y-3">
                  {MOBILE_WALLETS.filter(wallet => !installedWallets.includes(wallet.id)).map((wallet) => (
                    <button
                      key={wallet.id}
                      onClick={() => handleWalletConnect(wallet.id)}
                      disabled={isConnecting}
                      className="w-full flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-2xl hover:bg-gray-700/50 transition-all duration-200 active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {wallet.name.charAt(0)}
                          </span>
                        </div>
                        <div className="text-left">
                          <div className="text-white font-medium">{wallet.name}</div>
                          <div className="text-gray-400 text-sm">Download required</div>
                        </div>
                      </div>
                      <ExternalLink className="h-5 w-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 text-center">
              Secure connection to the KILT Liquidity Portal on Base Network
            </p>
          </div>
        </div>
      </div>
    </>
  );
}