import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWallet } from '@/contexts/wallet-context';
import { Wallet, CheckCircle, AlertCircle } from 'lucide-react';

interface WalletOption {
  id: string;
  name: string;
  description: string;
  detected: boolean;
  recommended: boolean;
  action: () => Promise<void>;
}

export function SimpleWalletConnect() {
  const { isConnected, isConnecting, address, connect, disconnect } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const handleConnect = async () => {
    try {
      clearError();
      await connect();
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const detectWallet = () => {
    const ethereum = (window as any).ethereum;
    return {
      metamask: ethereum?.isMetaMask,
      coinbase: ethereum?.isCoinbaseWallet || ethereum?.selectedProvider?.isCoinbaseWallet,
      trust: ethereum?.isTrustWallet,
      rainbow: ethereum?.isRainbow
    };
  };

  const wallets = detectWallet();
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-100">
            {address.slice(0, 6)}...{address.slice(-4)}
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
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-center">Connect Your Wallet</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            )}

            {/* Browser Extensions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400 flex items-center space-x-2">
                <Wallet className="w-4 h-4" />
                <span>Browser Extensions</span>
              </h3>
              
              {/* MetaMask */}
              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">M</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">MetaMask</div>
                    <div className="text-gray-400 text-sm">Connect with MetaMask browser extension</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {wallets.metamask && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      Detected
                    </span>
                  )}
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                    Recommended
                  </span>
                </div>
              </button>

              {/* Coinbase Wallet */}
              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">C</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">Coinbase Wallet</div>
                    <div className="text-gray-400 text-sm">Connect with Coinbase Wallet extension</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {wallets.coinbase && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      Detected
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Universal/Mobile Wallets Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400 flex items-center space-x-2">
                <Wallet className="w-4 h-4" />
                <span>{isMobile ? 'Mobile Wallets' : 'Universal Wallets'}</span>
              </h3>
              
              {/* WalletConnect */}
              <button
                onClick={() => {
                  if (isMobile) {
                    window.open('https://metamask.app.link/dapp/' + window.location.hostname, '_self');
                  } else {
                    alert('WalletConnect QR modal coming soon! For now, please use MetaMask extension or mobile deep links.');
                  }
                }}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">W</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">WalletConnect</div>
                    <div className="text-gray-400 text-sm">{isMobile ? 'Connect with any mobile wallet' : 'Connect via QR code'}</div>
                  </div>
                </div>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                  Universal
                </span>
              </button>

              {/* Trust Wallet */}
              <button
                onClick={() => {
                  if (isMobile) {
                    window.open('https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(window.location.href), '_self');
                  } else {
                    window.open('https://trustwallet.com/', '_blank');
                  }
                }}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">T</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">Trust Wallet</div>
                    <div className="text-gray-400 text-sm">{isMobile ? 'Connect with Trust Wallet mobile app' : 'Download Trust Wallet'}</div>
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                  {isMobile ? 'Mobile' : 'Download'}
                </span>
              </button>

              {/* Rainbow Wallet */}
              <button
                onClick={() => {
                  if (isMobile) {
                    window.open('https://rnbwapp.com/open?url=' + encodeURIComponent(window.location.href), '_self');
                  } else {
                    window.open('https://rainbow.me/', '_blank');
                  }
                }}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">R</span>
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">Rainbow</div>
                    <div className="text-gray-400 text-sm">{isMobile ? 'Connect with Rainbow mobile app' : 'Download Rainbow'}</div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {wallets.rainbow && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      Detected
                    </span>
                  )}
                  <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded">
                    {isMobile ? 'Mobile' : 'Download'}
                  </span>
                </div>
              </button>
            </div>

            <div className="text-center text-xs text-gray-500">
              By connecting, you agree to our terms of service and privacy policy.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}