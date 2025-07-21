import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Wallet,
  CheckCircle,
  AlertTriangle,
  WifiOff
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';

export function Web3ModalConnect() {
  const { 
    isConnected, 
    isConnecting, 
    connectionStatus, 
    lastError, 
    address, 
    connectWithWalletConnect,
    disconnect, 
    clearError 
  } = useWallet();
  
  const [showModal, setShowModal] = useState(false);

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

  const handleConnect = () => {
    setShowModal(false);
    connectWithWalletConnect();
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg">
          {getStatusIcon()}
          <span className="text-sm text-white font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
          className="border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 text-red-400"
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
        className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 text-white border-0 px-6 py-2 font-medium transition-all duration-200 hover:scale-105"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md bg-black/90 backdrop-blur-xl border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-center text-xl font-semibold">
              Web3Modal v3
            </DialogTitle>
            <p className="text-gray-400 text-sm text-center mt-2">
              Universal wallet connector supporting 200+ wallets
            </p>
          </DialogHeader>

          {lastError && (
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                {lastError}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full h-16 bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white border-0 transition-all duration-200 hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    <circle cx="12" cy="12" r="2" fill="white"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">Web3Modal v3</div>
                  <div className="text-sm text-white/80">
                    MetaMask, Coinbase, Trust Wallet & 200+ more
                  </div>
                </div>
              </div>
            </Button>

            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>✓ MetaMask, Coinbase Wallet, Trust Wallet, Phantom</p>
              <p>✓ WalletConnect protocol for mobile wallets</p>
              <p>✓ Hardware wallets and 200+ other options</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}