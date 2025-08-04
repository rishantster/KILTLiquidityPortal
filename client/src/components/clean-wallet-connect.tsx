import { useState } from 'react';
import { useCleanWallet } from '@/contexts/clean-wallet-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, ExternalLink, Shield } from 'lucide-react';

export function CleanWalletConnect() {
  const { address, isConnected, isConnecting, connect, disconnect } = useCleanWallet();
  const [showModal, setShowModal] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {/* Base Network Badge - Enhanced Styling */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-blue-400/5 border border-blue-400/30 rounded-lg px-3 py-1.5 backdrop-blur-sm">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-sm shadow-blue-400/50"></div>
          <span className="text-blue-400 text-sm font-medium">Base</span>
        </div>
        
        {/* Wallet Address Section - Professional Look */}
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400/20 to-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-sm text-white/90">{formatAddress(address)}</span>
              <span className="text-xs text-white/50">0.043 ETH</span>
            </div>
          </div>
          
          {/* Account Button - Modern Design */}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200"
          >
            Account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        disabled={isConnecting}
        className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6"
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md bg-black/95 backdrop-blur-xl border border-gray-800/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-400" />
              Connect Your Wallet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-3 flex-shrink-0">
                  <span className="text-2xl">🦊</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">MetaMask</h3>
                  <p className="text-gray-400 text-sm mb-3">
                    Most popular Ethereum wallet with browser extension
                  </p>
                  <Button
                    onClick={() => {
                      setShowModal(false);
                      connect();
                    }}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0"
                  >
                    Connect MetaMask
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-300 mb-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Security Notice</span>
              </div>
              <p className="text-gray-400 text-xs">
                We'll automatically switch you to the Base network. Your wallet will be used to interact with KILT liquidity pools.
              </p>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-xs">
                Don't have MetaMask?{' '}
                <button
                  onClick={() => window.open('https://metamask.io/download/', '_blank')}
                  className="text-emerald-400 hover:text-emerald-300 underline"
                >
                  Download here <ExternalLink className="h-3 w-3 inline ml-1" />
                </button>
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}