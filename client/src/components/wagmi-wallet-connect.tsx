import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Wallet, AlertTriangle, Loader2, ChevronDown, RefreshCw, Monitor, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { base } from 'wagmi/chains';
import { MobileWalletModal } from './mobile-wallet-modal';



export function WagmiWalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showModal, setShowModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);


  // Detect if user is on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async (connector: any) => {
    try {
      // FORCE mobile modal for WalletConnect - check display text
      const isWalletConnect = connector.name === 'WalletConnect' || 
                             connector.name?.includes('WalletConnect') ||
                             connector.id?.includes('walletConnect');
      
      if (isWalletConnect) {
        console.log('WalletConnect detected - forcing mobile modal');
        setShowModal(false);
        setShowMobileModal(true);
        return;
      }

      // Clear any previous wallet connections first
      if (isConnected) {
        disconnect();
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay
      }
      
      // Clear localStorage cache for wallet connections
      localStorage.removeItem('wagmi.connected');
      localStorage.removeItem('wagmi.store');
      
      // Connect to the selected wallet
      connect({ connector });
      setShowModal(false);
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  const handleSwitchAccount = async () => {
    setIsSwitchingAccount(true);
    try {
      // Use wallet_requestPermissions to force account selection dialog
      if ((window as any).ethereum) {
        await (window as any).ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (error) {
      console.error('Account switch error:', error);
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  const isWrongNetwork = chainId !== base.id;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {isWrongNetwork && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-semibold">Wrong Network</span>
            </div>
            <Button
              onClick={() => switchChain({ chainId: base.id })}
              className="bg-red-600 hover:bg-red-500 text-white text-xs h-6 px-2"
            >
              Switch to Base
            </Button>
          </div>
        )}

        {!isWrongNetwork && (
          <div className="relative group">
            {/* Pink glow layers */}
            <div className="absolute inset-0 bg-pink-500/20 rounded-lg blur-md animate-pulse"></div>
            <div className="absolute inset-0 bg-pink-600/10 rounded-lg blur-sm"></div>
            
            <div className="relative flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-pink-500/30 rounded-lg px-3 py-1.5 shadow-lg shadow-pink-500/10">
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse shadow-sm shadow-pink-500/80"></div>
              <span className="text-pink-500 text-sm font-medium font-mono tracking-wide">Base</span>
              
              {/* Scanning line effect */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-pink-500/60 to-transparent animate-pulse"></div>
            </div>
          </div>
        )}

        <div className="relative group">
          {/* Pink outer glow */}
          <div className="absolute inset-0 bg-pink-500/20 rounded-xl blur-lg animate-pulse opacity-70"></div>
          <div className="absolute inset-0 bg-[#ff0066]/10 rounded-xl blur-md"></div>
          
          <div className="relative flex items-center gap-3 bg-black/70 backdrop-blur-xl border border-pink-500/30 rounded-xl px-4 py-2 shadow-2xl shadow-pink-500/20 hover:border-pink-500/50 transition-all duration-300">
            <div className="flex items-center gap-2">
              {/* Pink wallet icon container */}
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/30 to-pink-500/10 border border-pink-500/40 flex items-center justify-center overflow-hidden">
                {/* Inner glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-transparent animate-pulse"></div>
                <Wallet className="relative h-4 w-4 text-pink-500 drop-shadow-lg" />
                
                {/* Corner accent lines */}
                <div className="absolute top-0 left-0 w-2 h-0.5 bg-pink-500/80"></div>
                <div className="absolute top-0 left-0 w-0.5 h-2 bg-pink-500/80"></div>
                <div className="absolute bottom-0 right-0 w-2 h-0.5 bg-pink-500/80"></div>
                <div className="absolute bottom-0 right-0 w-0.5 h-2 bg-pink-500/80"></div>
              </div>
              
              <div className="flex flex-col">
                <span className="font-mono text-sm text-white/95 tracking-wide drop-shadow-sm">{formatAddress(address)}</span>
                <span className="text-xs text-pink-500/80 font-mono">0.043 ETH</span>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative">
                  <div className="absolute inset-0 bg-[#ff0066]/20 rounded-lg blur-sm animate-pulse opacity-60"></div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative bg-black/50 hover:bg-black/70 text-white/90 hover:text-white border border-[#ff0066]/40 hover:border-[#ff0066]/60 rounded-lg px-3 py-1.5 text-sm font-medium font-mono tracking-wide transition-all duration-300 shadow-lg shadow-[#ff0066]/10 hover:shadow-[#ff0066]/20 uppercase"
                  >
                    Account
                    <ChevronDown className="h-3 w-3 ml-2" />
                    
                    {/* Button corner accents */}
                    <div className="absolute top-0 left-0 w-1 h-1 bg-[#ff0066] opacity-80"></div>
                    <div className="absolute top-0 right-0 w-1 h-1 bg-[#ff0066] opacity-80"></div>
                    <div className="absolute bottom-0 left-0 w-1 h-1 bg-[#ff0066] opacity-80"></div>
                    <div className="absolute bottom-0 right-0 w-1 h-1 bg-[#ff0066] opacity-80"></div>
                  </Button>
                </div>
              </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black/90 backdrop-blur-md border border-white/10 text-white">
              <DropdownMenuItem 
                onClick={handleSwitchAccount}
                disabled={isSwitchingAccount}
                className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                {isSwitchingAccount ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Switch Account
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={() => {
                  // Clear wallet cache completely
                  localStorage.removeItem('wagmi.connected');
                  localStorage.removeItem('wagmi.store');
                  localStorage.removeItem('wagmi.cache');
                  localStorage.removeItem('wagmi.injected.shimDisconnect');
                  
                  // Clear Phantom-specific storage
                  if ((window as any).phantom?.ethereum) {
                    try {
                      (window as any).phantom.ethereum.disconnect?.();
                    } catch (error) {
                      console.log('Phantom disconnect not available');
                    }
                  }
                  
                  disconnect();
                  setShowModal(true);
                }}
                className="hover:bg-blue-500/20 focus:bg-blue-500/20 hover:text-blue-400 focus:text-blue-400 cursor-pointer"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Switch Wallet
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // Clear all wallet-related localStorage when disconnecting
                  localStorage.removeItem('wagmi.connected');
                  localStorage.removeItem('wagmi.store');
                  localStorage.removeItem('wagmi.cache');
                  localStorage.removeItem('wagmi.injected.shimDisconnect');
                  
                  // Clear Phantom-specific storage
                  if ((window as any).phantom?.ethereum) {
                    try {
                      (window as any).phantom.ethereum.disconnect?.();
                    } catch (error) {
                      console.log('Phantom disconnect not available');
                    }
                  }
                  
                  disconnect();
                }}
                className="hover:bg-red-500/20 focus:bg-red-500/20 hover:text-red-400 focus:text-red-400 cursor-pointer"
              >
                <Wallet className="mr-2 h-3 w-3" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Data flow animation line */}
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-pink-500/40 to-transparent animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={() => setShowModal(true)}
          disabled={isPending}
          className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6"
        >
          {isPending ? (
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
        
        {/* Test button for mobile modal */}
        <Button
          onClick={() => setShowMobileModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-4"
        >
          <Smartphone className="mr-2 h-4 w-4" />
          Mobile Test
        </Button>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-black border border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl font-bold flex items-center gap-3 mb-6">
              <Wallet className="h-6 w-6" />
              Connect Your Wallet
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-400 mb-4">
              <Monitor className="h-4 w-4" />
              <span className="text-sm">Available Wallets</span>
            </div>
            
            {/* Filter out unwanted wallets and remove duplicates */}
            {connectors
              .filter((connector, index, array) => 
                connector.name !== 'Injected' && 
                !connector.name.includes('Binance') && // Remove any duplicate Binance entries
                !connector.name.toLowerCase().includes('keplr') && // Remove Keplr
                array.findIndex(c => c.name === connector.name) === index // Remove duplicates
              )
              .map((connector) => (
              <Button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"

              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-4 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    {connector.name === 'WalletConnect' ? (
                      <Smartphone className="mr-4 h-5 w-5" />
                    ) : (
                      <Wallet className="mr-4 h-5 w-5" />
                    )}
                    {connector.name === 'WalletConnect' ? 'WalletConnect (Recommended)' : connector.name}
                  </>
                )}
              </Button>
            ))}
            
            {/* Single Binance Wallet Button */}
            <Button
              onClick={() => {
                if (window.ethereum?.isBinance) {
                  const binanceConnector = connectors.find(c => c.id === 'binance' || c.name.includes('Binance'));
                  if (binanceConnector) {
                    handleConnect(binanceConnector);
                  }
                } else {
                  window.open('https://www.binance.com/en/web3wallet', '_blank');
                }
              }}
              disabled={isPending}
              className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
            >
              <Wallet className="mr-4 h-5 w-5" />
              Binance Wallet
            </Button>
          </div>

          <div className="text-sm text-gray-500 text-center mt-6">
            By connecting, you agree to the Terms of Service and Privacy Policy
          </div>
        </DialogContent>
      </Dialog>

      <MobileWalletModal 
        isOpen={showMobileModal} 
        onClose={() => setShowMobileModal(false)} 
      />
      

    </>
  );
}