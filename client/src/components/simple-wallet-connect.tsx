import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWallet } from '@/contexts/wallet-context';
import { useToast } from '@/hooks/use-toast';
import { WalletConnectModal } from './wallet-connect-modal';
import { walletDetection } from '@/services/wallet-detection';
import { MetaMaskIcon, TrustWalletIcon, RainbowIcon, CoinbaseIcon, PhantomIcon, BinanceIcon, WalletConnectIcon } from './wallet-icons';
import { Wallet, CheckCircle, AlertCircle, ExternalLink, Smartphone, Monitor } from 'lucide-react';

export function SimpleWalletConnect() {
  const { isConnected, isConnecting, address, connect, disconnect } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const [showWalletConnectModal, setShowWalletConnectModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedWallets, setDetectedWallets] = useState(walletDetection.detectWallets());
  const { toast } = useToast();

  const handleWalletConnect = () => {
    setShowModal(false);
    setShowWalletConnectModal(true);
  };

  const handleDirectWalletConnect = async (walletName: string) => {
    setError(null);
    try {
      const accounts = await walletDetection.connectWallet(walletName);
      if (accounts && accounts.length > 0) {
        setShowModal(false);
        toast({
          title: "Wallet Connected",
          description: `Successfully connected to ${walletName}`,
        });
      }
    } catch (err) {
      console.error(`Failed to connect to ${walletName}:`, err);
      setError(err instanceof Error ? err.message : `Failed to connect to ${walletName}`);
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : `Could not connect to ${walletName}`,
        variant: "destructive"
      });
    }
  };

  const handleMobileWallet = (walletName: string) => {
    walletDetection.openMobileWallet(walletName);
    setShowModal(false);
  };

  const refreshWallets = () => {
    setDetectedWallets(walletDetection.detectWallets());
  };

  const isMobile = walletDetection.isMobile();

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
        <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700 max-h-[80vh] overflow-y-auto">
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
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400 flex items-center space-x-2">
                <Monitor className="w-4 h-4" />
                <span>Browser Extensions</span>
              </h3>

              {/* MetaMask */}
              <button
                onClick={() => handleDirectWalletConnect('MetaMask')}
                onFocus={refreshWallets}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <MetaMaskIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-medium">MetaMask</div>
                    <div className="text-gray-400 text-sm">
                      {detectedWallets.find(w => w.name === 'MetaMask')?.detected 
                        ? 'Ready to connect' 
                        : 'Download MetaMask'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {detectedWallets.find(w => w.name === 'MetaMask')?.detected && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                      Detected
                    </span>
                  )}
                  <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">
                    Popular
                  </span>
                </div>
              </button>

              {/* Coinbase Wallet */}
              <button
                onClick={() => handleDirectWalletConnect('Coinbase Wallet')}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <CoinbaseIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-medium">Coinbase Wallet</div>
                    <div className="text-gray-400 text-sm">
                      {detectedWallets.find(w => w.name === 'Coinbase Wallet')?.detected 
                        ? 'Ready to connect' 
                        : 'Download Coinbase Wallet'
                      }
                    </div>
                  </div>
                </div>
                {detectedWallets.find(w => w.name === 'Coinbase Wallet')?.detected && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    Detected
                  </span>
                )}
              </button>

              {/* Trust Wallet */}
              <button
                onClick={() => isMobile ? handleMobileWallet('Trust Wallet') : handleDirectWalletConnect('Trust Wallet')}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <TrustWalletIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-medium">Trust Wallet</div>
                    <div className="text-gray-400 text-sm">
                      {isMobile ? 'Open Trust Wallet app' : 'Mobile-first wallet'}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                  {isMobile ? 'Mobile' : 'Download'}
                </span>
              </button>

              {/* Rainbow Wallet */}
              <button
                onClick={() => isMobile ? handleMobileWallet('Rainbow') : handleDirectWalletConnect('Rainbow')}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <RainbowIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-medium">Rainbow</div>
                    <div className="text-gray-400 text-sm">
                      {detectedWallets.find(w => w.name === 'Rainbow')?.detected 
                        ? 'Ready to connect' 
                        : 'Beautiful wallet with great UX'
                      }
                    </div>
                  </div>
                </div>
                {detectedWallets.find(w => w.name === 'Rainbow')?.detected && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    Detected
                  </span>
                )}
              </button>

              {/* Phantom Wallet */}
              <button
                onClick={() => isMobile ? handleMobileWallet('Phantom') : handleDirectWalletConnect('Phantom')}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <PhantomIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-medium">Phantom</div>
                    <div className="text-gray-400 text-sm">
                      {detectedWallets.find(w => w.name === 'Phantom')?.detected 
                        ? 'Ready to connect' 
                        : 'Multi-chain wallet'
                      }
                    </div>
                  </div>
                </div>
                {detectedWallets.find(w => w.name === 'Phantom')?.detected && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    Detected
                  </span>
                )}
              </button>

              {/* Binance Wallet */}
              <button
                onClick={() => isMobile ? handleMobileWallet('Binance Wallet') : handleDirectWalletConnect('Binance Wallet')}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <BinanceIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-medium">Binance Wallet</div>
                    <div className="text-gray-400 text-sm">
                      {detectedWallets.find(w => w.name === 'Binance Wallet')?.detected 
                        ? 'Ready to connect' 
                        : 'Exchange wallet'
                      }
                    </div>
                  </div>
                </div>
                {detectedWallets.find(w => w.name === 'Binance Wallet')?.detected && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    Detected
                  </span>
                )}
              </button>
            </div>

            {/* Mobile & Universal */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-400 flex items-center space-x-2">
                <Smartphone className="w-4 h-4" />
                <span>Mobile & Universal</span>
              </h3>

              {/* WalletConnect */}
              <button
                onClick={handleWalletConnect}
                className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <WalletConnectIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-medium">WalletConnect</div>
                    <div className="text-gray-400 text-sm">Connect with QR code</div>
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                  Universal
                </span>
              </button>
            </div>

            <div className="text-center text-xs text-gray-500">
              By connecting, you agree to our terms of service and privacy policy.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WalletConnectModal
        isOpen={showWalletConnectModal}
        onClose={() => setShowWalletConnectModal(false)}
      />
    </>
  );
}