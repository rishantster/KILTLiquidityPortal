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

// Import wallet logos
import metamaskLogo from '@assets/image_1753057696583.png';
import coinbaseLogo from '@assets/image_1753057740918.png';
import walletconnectLogo from '@assets/image_1753057768625.png';
import trustLogo from '@assets/image_1753057819760.png';
import phantomLogo from '@assets/image_1753057840313.png';

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
        <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
          <img 
            src={metamaskLogo} 
            alt="MetaMask" 
            className="w-8 h-8 object-contain drop-shadow-sm"
          />
        </div>
      ),
      coinbase: (
        <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
          <img 
            src={coinbaseLogo} 
            alt="Coinbase Wallet" 
            className="w-8 h-8 object-contain drop-shadow-sm"
          />
        </div>
      ),
      walletconnect: (
        <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
          <img 
            src={walletconnectLogo} 
            alt="WalletConnect" 
            className="w-8 h-8 object-contain drop-shadow-sm"
          />
        </div>
      ),
      trust: (
        <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
          <img 
            src={trustLogo} 
            alt="Trust Wallet" 
            className="w-8 h-8 object-contain drop-shadow-sm"
          />
        </div>
      ),
      phantom: (
        <div className="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center">
          <img 
            src={phantomLogo} 
            alt="Phantom" 
            className="w-8 h-8 object-contain drop-shadow-sm"
          />
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