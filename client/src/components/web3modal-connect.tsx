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
          <svg width="24" height="24" viewBox="0 0 212 189" fill="none">
            <path d="M210.51 68.2L195.9 46.11L170.6 10.56L129.8 41.87L97.05 69.81L89.06 75.91L94.72 81.28L102.56 88.34L89.99 110.72L81.45 131.22L76.47 148.81L82.33 175.52L97.8 186.92L138.7 155.61L171.45 127.67L179.44 121.57L173.78 116.2L165.94 109.14L178.51 86.76L187.05 66.26L192.03 48.67L186.17 21.96L170.7 10.56L129.8 41.87M82.13 175.72L76.27 149.01L81.25 131.42L89.79 110.92L102.36 88.54L94.52 81.48L88.86 76.11L96.85 70.01L129.6 42.07L170.5 10.76L185.97 22.16L191.83 48.87L186.85 66.46L178.31 86.96L165.74 109.34L173.58 116.4L179.24 121.77L171.25 127.87L138.5 155.81L97.6 187.12L82.13 175.72Z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.25"/>
            <path d="M138.7 155.61L97.8 186.92L82.33 175.52L76.47 148.81L81.45 131.22L89.99 110.72L102.56 88.34L94.72 81.28L89.06 75.91L97.05 69.81L129.8 41.87L170.7 10.56L186.17 21.96L192.03 48.67L187.05 66.26L178.51 86.76L165.94 109.14L173.78 116.2L179.44 121.57L171.45 127.67L138.7 155.61Z" fill="#E4761B"/>
            <path d="M195.9 46.11L170.6 10.56L186.07 21.96L191.93 48.67L186.95 66.26L178.41 86.76L165.84 109.14L173.68 116.2L179.34 121.57L171.35 127.67L138.6 155.61L179.5 124.3L210.41 68.2L195.9 46.11Z" fill="#E4761B"/>
          </svg>
        </div>
      ),
      coinbase: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 1024 1024" fill="none">
            <circle cx="512" cy="512" r="512" fill="#0052FF"/>
            <path d="M512 692C607.41 692 684 615.41 684 520C684 424.59 607.41 348 512 348C416.59 348 340 424.59 340 520C340 615.41 416.59 692 512 692Z" fill="white"/>
            <path d="M512 580C547.35 580 576 551.35 576 516C576 480.65 547.35 452 512 452C476.65 452 448 480.65 448 516C448 551.35 476.65 580 512 580Z" fill="#0052FF"/>
          </svg>
        </div>
      ),
      walletconnect: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 480 332" fill="none">
            <path d="M126.613 93.9842C162.109 58.4877 219.441 58.4877 254.937 93.9842L341.616 166.125C365.306 178.481 365.306 202.019 341.616 214.375L254.937 286.516C219.441 322.012 162.109 322.012 126.613 286.516L39.934 214.375C16.244 202.019 16.244 178.481 39.934 166.125L126.613 93.9842Z" fill="white" stroke="#3B99FC" strokeWidth="2"/>
          </svg>
        </div>
      ),
      trust: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 336 336" fill="none">
            <circle cx="168" cy="168" r="168" fill="white"/>
            <path d="M168 48L273 120V192C273 248 228 288 168 288C108 288 63 248 63 192V120L168 48ZM168 96L108 136V192C108 220 136 248 168 248C200 248 228 220 228 192V136L168 96Z" fill="#3375BB"/>
          </svg>
        </div>
      ),
      phantom: (
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 128 128" fill="none">
            <circle cx="64" cy="64" r="64" fill="url(#phantomGradient)"/>
            <path d="M90 32H38C33.6 32 30 35.6 30 40V88C30 92.4 33.6 96 38 96H56L64 104L72 96H90C94.4 96 98 92.4 98 88V40C98 35.6 94.4 32 90 32ZM58 72C54.7 72 52 69.3 52 66C52 62.7 54.7 60 58 60C61.3 60 64 62.7 64 66C64 69.3 61.3 72 58 72ZM70 72C66.7 72 64 69.3 64 66C64 62.7 66.7 60 70 60C73.3 60 76 62.7 76 66C76 69.3 73.3 72 70 72Z" fill="white"/>
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