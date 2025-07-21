import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Wallet,
  CheckCircle,
  AlertTriangle,
  WifiOff,
  Download,
  ExternalLink
} from 'lucide-react';
import { useWallet } from '@/contexts/wallet-context';
import { web3ModalService, type WalletOption } from '@/services/web3modal-service';

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

  const [availableWallets, setAvailableWallets] = useState<(WalletOption & { detected?: boolean; recommended?: boolean })[]>([]);

  // Load available wallets when modal opens
  const handleOpenModal = () => {
    setShowModal(true);
    const wallets = web3ModalService.getAvailableWallets();
    setAvailableWallets(wallets);
  };

  const handleWalletConnect = async (walletId: string) => {
    try {
      setShowModal(false);
      
      if (walletId === 'walletconnect') {
        // Use existing WalletConnect service
        await connectWithWalletConnect();
      } else {
        // Use our Web3Modal service for injected wallets
        const address = await web3ModalService.connectWallet(walletId);
        if (address) {
          console.log(`Connected to ${walletId}:`, address);
        }
      }
    } catch (error) {
      console.error(`Failed to connect to ${walletId}:`, error);
      setLastError((error as Error).message);
      setShowModal(true); // Reopen modal on error
    }
  };

  const getWalletIcon = (walletId: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      metamask: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 212 189" fill="white">
            <path d="M40.8 1.7L26 46.1L54.5 26.8Z" />
            <path d="M171.1 1.7L185.7 46.1L157.4 26.8Z" />
          </svg>
        </div>
      ),
      coinbase: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 28 28" fill="white">
            <rect width="28" height="28" rx="14" fill="#0052FF"/>
            <circle cx="14" cy="14" r="6" fill="white"/>
          </svg>
        </div>
      ),
      walletconnect: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 480 332" fill="white">
            <path d="M126.613 93.9842C162.109 58.4877 219.441 58.4877 254.937 93.9842L341.616 166.125Z"/>
          </svg>
        </div>
      ),
      trust: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 64 64" fill="white">
            <path d="M32 2C23.16 2 16 9.16 16 18v8h-2c-1.1 0-2 .9-2 2v32c0 1.1.9 2 2 2h36c1.1 0 2-.9 2-2V28c0-1.1-.9-2-2-2h-2v-8c0-8.84-7.16-16-16-16z"/>
          </svg>
        </div>
      ),
      phantom: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 2.74 1.58 5.11 3.88 6.26L7 19h10l-1.88-3.74C17.42 14.11 19 11.74 19 9c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
      )
    };
    
    return iconMap[walletId] || (
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
        <Wallet className="w-6 h-6 text-white" />
      </div>
    );
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
        onClick={handleOpenModal}
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
        <DialogContent className="sm:max-w-lg bg-black/90 backdrop-blur-xl border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-center text-xl font-semibold">
              Connect Wallet
            </DialogTitle>
            <p className="text-gray-400 text-sm text-center mt-2">
              Choose your preferred wallet to connect
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

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableWallets.map((wallet) => (
              <Button
                key={wallet.id}
                onClick={() => handleWalletConnect(wallet.id)}
                disabled={isConnecting}
                className="w-full h-16 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-pink-500/30 transition-all duration-200 hover:scale-[1.02] justify-start px-4"
                variant="ghost"
              >
                <div className="flex items-center gap-4 w-full">
                  {getWalletIcon(wallet.id)}
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{wallet.name}</span>
                      {wallet.detected && (
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                          Installed
                        </span>
                      )}
                      {wallet.recommended && (
                        <span className="bg-pink-500/20 text-pink-400 text-xs px-2 py-1 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {wallet.id === 'walletconnect' && 'Scan with any mobile wallet'}
                      {wallet.id === 'metamask' && 'Connect with MetaMask extension'}
                      {wallet.id === 'coinbase' && 'Connect with Coinbase Wallet'}
                      {wallet.id === 'trust' && 'Connect with Trust Wallet'}
                      {wallet.id === 'phantom' && 'Multi-chain wallet support'}
                    </div>
                  </div>

                  {!wallet.detected && wallet.injected && (
                    <div className="flex items-center text-gray-500">
                      <Download className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>

          <div className="text-xs text-gray-500 text-center mt-4 pt-4 border-t border-white/10">
            <p>By connecting a wallet, you agree to the Terms of Service</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}