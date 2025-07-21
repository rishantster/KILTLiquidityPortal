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
    
    // Add connecting state animation
    const buttonElement = document.querySelector(`[data-wallet="${walletName}"]`);
    if (buttonElement) {
      buttonElement.classList.add('wallet-connecting');
    }
    
    try {
      // Use wallet context connect method for proper state management
      await connect();
      
      // Add success animation
      if (buttonElement) {
        buttonElement.classList.remove('wallet-connecting');
        buttonElement.classList.add('wallet-connected');
        setTimeout(() => {
          buttonElement.classList.remove('wallet-connected');
        }, 1000);
      }
      
      setShowModal(false);
      toast({
        title: "Neural Link Established",
        description: `Successfully connected to ${walletName}`,
      });
    } catch (err) {
      console.error(`Failed to connect to ${walletName}:`, err);
      
      // Remove connecting animation on error
      if (buttonElement) {
        buttonElement.classList.remove('wallet-connecting');
      }
      
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
        <DialogContent className="sm:max-w-md bg-black/95 backdrop-blur-xl border border-pink-500/30 shadow-2xl shadow-pink-500/20 max-h-[80vh] overflow-y-auto cyberpunk-modal">
          <DialogHeader>
            <DialogTitle className="text-transparent bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 bg-clip-text text-center text-xl font-bold tracking-wide">
              CONNECT NEURAL LINK
            </DialogTitle>
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
              <h3 className="text-xs font-mono text-cyan-400 flex items-center space-x-2 uppercase tracking-wider">
                <Monitor className="w-4 h-4 text-pink-400" />
                <span>BROWSER NEURAL INTERFACES</span>
              </h3>

              {/* MetaMask */}
              <button
                data-wallet="MetaMask"
                onClick={() => handleDirectWalletConnect('MetaMask')}
                onFocus={refreshWallets}
                className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-pink-500/10 rounded border border-gray-800/50 hover:border-pink-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20 cyberpunk-glow"
              >
                <div className="flex items-center space-x-3">
                  <MetaMaskIcon className="w-10 h-10 border-2 border-red-500" />
                  <div className="text-left">
                    <div className="text-white font-mono font-medium tracking-wide">MetaMask</div>
                    <div className="text-cyan-400 text-xs font-mono">
                      {detectedWallets.find(w => w.name === 'MetaMask')?.detected 
                        ? 'NEURAL LINK ACTIVE' 
                        : 'INSTALL REQUIRED'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {detectedWallets.find(w => w.name === 'MetaMask')?.detected && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono uppercase tracking-wider border border-green-500/30">
                      ONLINE
                    </span>
                  )}
                  <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs font-mono uppercase tracking-wider border border-pink-500/30">
                    PRIME
                  </span>
                </div>
              </button>

              {/* Coinbase Wallet */}
              <button
                data-wallet="Coinbase Wallet"
                onClick={() => handleDirectWalletConnect('Coinbase Wallet')}
                className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-pink-500/10 rounded border border-gray-800/50 hover:border-pink-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20 cyberpunk-glow"
              >
                <div className="flex items-center space-x-3">
                  <CoinbaseIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-mono font-medium tracking-wide">Coinbase Wallet</div>
                    <div className="text-cyan-400 text-xs font-mono">
                      {detectedWallets.find(w => w.name === 'Coinbase Wallet')?.detected 
                        ? 'NEURAL LINK ACTIVE' 
                        : 'INSTALL REQUIRED'
                      }
                    </div>
                  </div>
                </div>
                {detectedWallets.find(w => w.name === 'Coinbase Wallet')?.detected && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono uppercase tracking-wider border border-green-500/30">
                    ONLINE
                  </span>
                )}
              </button>

              {/* Trust Wallet */}
              <button
                data-wallet="Trust Wallet"
                onClick={() => isMobile ? handleMobileWallet('Trust Wallet') : handleDirectWalletConnect('Trust Wallet')}
                className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-pink-500/10 rounded border border-gray-800/50 hover:border-pink-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20 cyberpunk-glow"
              >
                <div className="flex items-center space-x-3">
                  <TrustWalletIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-mono font-medium tracking-wide">Trust Wallet</div>
                    <div className="text-cyan-400 text-xs font-mono">
                      {isMobile ? 'MOBILE BRIDGE READY' : 'QUANTUM SECURE'}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-wider border border-cyan-500/30">
                  {isMobile ? 'MOBILE' : 'SECURE'}
                </span>
              </button>

              {/* Rainbow Wallet */}
              <button
                data-wallet="Rainbow"
                onClick={() => isMobile ? handleMobileWallet('Rainbow') : handleDirectWalletConnect('Rainbow')}
                className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-pink-500/10 rounded border border-gray-800/50 hover:border-pink-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20 cyberpunk-glow"
              >
                <div className="flex items-center space-x-3">
                  <RainbowIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-mono font-medium tracking-wide">Rainbow</div>
                    <div className="text-cyan-400 text-xs font-mono">
                      {detectedWallets.find(w => w.name === 'Rainbow')?.detected 
                        ? 'NEURAL LINK ACTIVE' 
                        : 'AESTHETIC PROTOCOL'
                      }
                    </div>
                  </div>
                </div>
                {detectedWallets.find(w => w.name === 'Rainbow')?.detected && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono uppercase tracking-wider border border-green-500/30">
                    ONLINE
                  </span>
                )}
              </button>

              {/* Phantom Wallet */}
              <button
                data-wallet="Phantom"
                onClick={() => isMobile ? handleMobileWallet('Phantom') : handleDirectWalletConnect('Phantom')}
                className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-pink-500/10 rounded border border-gray-800/50 hover:border-pink-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20 cyberpunk-glow"
              >
                <div className="flex items-center space-x-3">
                  <PhantomIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-mono font-medium tracking-wide">Phantom</div>
                    <div className="text-cyan-400 text-xs font-mono">
                      {detectedWallets.find(w => w.name === 'Phantom')?.detected 
                        ? 'NEURAL LINK ACTIVE' 
                        : 'GHOST PROTOCOL'
                      }
                    </div>
                  </div>
                </div>
                {detectedWallets.find(w => w.name === 'Phantom')?.detected && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono uppercase tracking-wider border border-green-500/30">
                    ONLINE
                  </span>
                )}
              </button>

              {/* Binance Wallet */}
              <button
                data-wallet="Binance Wallet"
                onClick={() => isMobile ? handleMobileWallet('Binance Wallet') : handleDirectWalletConnect('Binance Wallet')}
                className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-pink-500/10 rounded border border-gray-800/50 hover:border-pink-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/20 cyberpunk-glow"
              >
                <div className="flex items-center space-x-3">
                  <BinanceIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-mono font-medium tracking-wide">Binance Wallet</div>
                    <div className="text-cyan-400 text-xs font-mono">
                      {detectedWallets.find(w => w.name === 'Binance Wallet')?.detected 
                        ? 'NEURAL LINK ACTIVE' 
                        : 'EXCHANGE BRIDGE'
                      }
                    </div>
                  </div>
                </div>
                {detectedWallets.find(w => w.name === 'Binance Wallet')?.detected && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono uppercase tracking-wider border border-green-500/30">
                    ONLINE
                  </span>
                )}
              </button>
            </div>

            {/* Mobile & Universal */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono text-violet-400 flex items-center space-x-2 uppercase tracking-wider">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>MOBILE QUANTUM BRIDGE</span>
              </h3>

              {/* WalletConnect */}
              <button
                data-wallet="WalletConnect"
                onClick={handleWalletConnect}
                className="w-full flex items-center justify-between p-4 bg-gray-900/50 hover:bg-violet-500/10 rounded border border-gray-800/50 hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/20 cyberpunk-glow"
              >
                <div className="flex items-center space-x-3">
                  <WalletConnectIcon className="w-10 h-10" />
                  <div className="text-left">
                    <div className="text-white font-mono font-medium tracking-wide">WalletConnect</div>
                    <div className="text-violet-400 text-xs font-mono">QUANTUM ENTANGLEMENT</div>
                  </div>
                </div>
                <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs font-mono uppercase tracking-wider border border-violet-500/30">
                  UNIVERSAL
                </span>
              </button>
            </div>

            <div className="text-center text-xs font-mono text-gray-600 border-t border-gray-800/50 pt-4">
              <span className="text-pink-400">⚠</span> NEURAL INTERFACE CONNECTION PROTOCOL <span className="text-pink-400">⚠</span>
              <div className="text-gray-500 mt-1">By connecting, you accept quantum entanglement terms</div>
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