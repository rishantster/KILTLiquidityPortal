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
  const [localError, setLocalError] = useState<string | null>(null);

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
      setLocalError((error as Error).message);
      setShowModal(true); // Reopen modal on error
    }
  };

  const getWalletIcon = (walletId: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
      metamask: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M22.46 12.96L21.73 11.73L20.67 9.5L18.8 6.5L15.5 10L12.77 12.5L12 13.2L13.04 14.15L14.67 15.6L13.23 18L12.15 20L11.48 21.5L12.48 23.5L14.67 24.5L18.8 21L21.73 18L22.46 16.5L21.73 15.2L20.67 13L18.8 10L15.5 14L12.77 16.5M12.48 23.7L11.48 21.7L12.15 20.2L13.23 18.2L14.67 15.8L13.04 14.35L12 13.4L12.77 12.7L15.5 10.2L18.8 6.7L20.67 9.7L21.73 11.9L22.46 13.16L21.73 15.4L20.67 17.6L18.8 20.6L14.67 24.7L12.48 23.7Z" fill="#E17726"/>
            <path d="M18.8 21L14.67 24.5L12.48 23.5L11.48 21.5L12.15 20L13.23 18L14.67 15.6L13.04 14.15L12 13.2L12.77 12.5L15.5 10L18.8 6.5L20.67 9.5L21.73 11.73L22.46 12.96L21.73 15.2L20.67 17.4L18.8 20.4L14.67 23.9L18.8 21Z" fill="#E27625"/>
          </svg>
        </div>
      ),
      coinbase: (
        <div className="w-10 h-10 rounded-lg bg-[#0052FF] flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="#0052FF"/>
            <circle cx="12" cy="12" r="8" fill="white"/>
            <circle cx="12" cy="12" r="4" fill="#0052FF"/>
          </svg>
        </div>
      ),
      walletconnect: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 10c3-3 8-3 11 0l1 1c.3.3.3.8 0 1.1l-.4.4c-.2.2-.4.2-.6 0l-.9-.9c-2.1-2.1-5.5-2.1-7.6 0l-1 1c-.2.2-.4.2-.6 0l-.4-.4c-.3-.3-.3-.8 0-1.1L6 10z" fill="white"/>
            <path d="M16.8 13.2l.4.4c.3.3.3.8 0 1.1l-5.2 5.2c-.2.2-.4.2-.6 0l-5.2-5.2c-.3-.3-.3-.8 0-1.1l.4-.4c.2-.2.4-.2.6 0L12 17.6l4.8-4.8c.2-.2.4-.2.6 0z" fill="white"/>
          </svg>
        </div>
      ),
      trust: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="white"/>
            <path d="M12 2l7 4v6c0 4-3 7-7 7s-7-3-7-7V6l7-4zm0 3L8 7v5c0 2 2 4 4 4s4-2 4-4V7l-4-2z" fill="#3375BB"/>
          </svg>
        </div>
      ),
      phantom: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="12" fill="url(#phantomGradient)"/>
            <path d="M18 6H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h4l2 2 2-2h4c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 14c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm4 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" fill="white"/>
            <defs>
              <linearGradient id="phantomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#AB9FF2"/>
                <stop offset="100%" stopColor="#4E44CE"/>
              </linearGradient>
            </defs>
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

          {(lastError || localError) && (
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                {localError || lastError}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearError();
                    setLocalError(null);
                  }}
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