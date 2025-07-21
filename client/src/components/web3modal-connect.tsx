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
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
          {/* Authentic MetaMask Fox Logo */}
          <svg width="20" height="20" viewBox="0 0 318.6 318.6" fill="none">
            <path d="m274.1 35.5-99.5 73.9L193 65.8z" fill="#e2761b" stroke="#e2761b" strokeWidth=".27"/>
            <path d="m44.4 35.5 98.7 74.6-17.5-44.3z" fill="#e4761b" stroke="#e4761b" strokeWidth=".27"/>
            <path d="m238.3 206.8-26.5 40.6 56.7 15.6 16.3-55.3z" fill="#e4761b" stroke="#e4761b" strokeWidth=".27"/>
            <path d="m33.9 207.7 16.2 55.3 56.7-15.6-26.5-40.6z" fill="#e4761b" stroke="#e4761b" strokeWidth=".27"/>
            <path d="m103.6 138.2-15.8 23.9 56.3 2.5-1.9-60.6z" fill="#e4761b" stroke="#e4761b" strokeWidth=".27"/>
            <path d="m214.9 138.2-39-34.8-1.3 61.2 56.2-2.5z" fill="#e4761b" stroke="#e4761b" strokeWidth=".27"/>
            <path d="m106.8 247.4 33.8-16.5-29.2-22.8z" fill="#e4761b" stroke="#e4761b" strokeWidth=".27"/>
            <path d="m177.9 230.9 33.9 16.5-4.7-39.3z" fill="#e4761b" stroke="#e4761b" strokeWidth=".27"/>
          </svg>
        </div>
      ),
      coinbase: (
        <div className="w-10 h-10 rounded-lg bg-[#0052FF] flex items-center justify-center shadow-lg">
          {/* Authentic Coinbase Logo */}
          <svg width="20" height="20" viewBox="0 0 1024 1024" fill="none">
            <circle cx="512" cy="512" r="400" fill="white"/>
            <rect x="360" y="360" width="304" height="304" rx="152" fill="#0052FF"/>
          </svg>
        </div>
      ),
      walletconnect: (
        <div className="w-10 h-10 rounded-lg bg-[#3B99FC] flex items-center justify-center shadow-lg">
          {/* Authentic WalletConnect Logo */}
          <svg width="20" height="20" viewBox="0 0 400 400" fill="none">
            <path d="M100 150c55-55 145-55 200 0l7 7c3 3 3 8 0 11l-25 25c-1.5 1.5-4 1.5-5.5 0l-10-10c-38-38-100-38-138 0l-11 11c-1.5 1.5-4 1.5-5.5 0l-25-25c-3-3-3-8 0-11l7.5-7.5z" fill="white"/>
            <path d="M318 210l22 22c3 3 3 8 0 11l-100 100c-3 3-8 3-11 0l-100-100c-3-3-3-8 0-11l22-22c3-3 8-3 11 0l78 78c1.5 1.5 4 1.5 5.5 0l78-78c3-3 8-3 11 0z" fill="white"/>
          </svg>
        </div>
      ),
      trust: (
        <div className="w-10 h-10 rounded-lg bg-[#3375BB] flex items-center justify-center shadow-lg">
          {/* Authentic Trust Wallet Logo */}
          <svg width="20" height="20" viewBox="0 0 128 128" fill="none">
            <path d="M64 8L112 32v32c0 35.2-24 64-48 64s-48-28.8-48-64V32L64 8z" fill="white"/>
            <path d="M64 24L88 36v28c0 22.4-12.8 40-24 40s-24-17.6-24-40V36L64 24z" fill="#3375BB"/>
          </svg>
        </div>
      ),
      phantom: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#AB9FF2] to-[#4E44CE] flex items-center justify-center shadow-lg">
          {/* Authentic Phantom Ghost Logo */}
          <svg width="20" height="20" viewBox="0 0 128 128" fill="none">
            <path d="M64 16C81.6 16 96 30.4 96 48v40c0 8.8-7.2 16-16 16h-8l-8 8-8-8h-8c-8.8 0-16-7.2-16-16V48c0-17.6 14.4-32 32-32z" fill="white"/>
            <circle cx="52" cy="60" r="6" fill="#4E44CE"/>
            <circle cx="76" cy="60" r="6" fill="#4E44CE"/>
            <path d="M44 96c4 4 8 4 12 0s8-4 12 0 8 4 12 0 8-4 12 0" stroke="white" strokeWidth="4" fill="none"/>
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