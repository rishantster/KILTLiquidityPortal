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
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Detect if user is on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = async (connector: any) => {
    try {
      const debugMsg = `Clicked: ID="${connector.id}", Name="${connector.name}"`;
      console.log('Connector clicked:', connector.id, connector.name, connector);
      setDebugInfo(debugMsg);
      
      // Add a delay to show the debug message before proceeding
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Special handling for WalletConnect - check all possible identifiers
      if (connector.id?.includes('walletConnect') || 
          connector.name?.includes('WalletConnect') || 
          connector.type === 'walletConnect' ||
          connector.uid?.includes('walletConnect')) {
        console.log('Opening mobile wallet modal for WalletConnect');
        setDebugInfo(debugMsg + ' -> Opening Mobile Modal');
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
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Base Network
          </Badge>
        )}

        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
          <Wallet className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-sm">{formatAddress(address)}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-6 px-2 text-xs hover:bg-white/10 hover:text-white"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
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
        </div>
      </div>
    );
  }

  return (
    <>
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
                data-testid={`wallet-${connector.id}`}
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
        open={showMobileModal} 
        onOpenChange={setShowMobileModal} 
      />
      
      {/* Debug info display */}
      {debugInfo && (
        <div className="fixed top-4 left-4 bg-red-600 text-white p-4 rounded text-sm z-[9999] max-w-sm border-2 border-white">
          <button onClick={() => setDebugInfo('')} className="float-right ml-2 text-lg font-bold">×</button>
          <div className="pr-8">{debugInfo}</div>
        </div>
      )}
      
      {/* Always show debug button for testing - moved outside modal */}
      {!showModal && (
        <div className="fixed bottom-4 left-4 z-[9999]">
          <button 
            onClick={() => setDebugInfo('Debug: Test message - handler is working!')} 
            className="bg-blue-600 text-white p-2 rounded text-xs"
          >
            Test Debug
          </button>
        </div>
      )}
    </>
  );
}