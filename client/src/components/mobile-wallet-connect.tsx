import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useBaseNetwork } from '@/hooks/use-base-network';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Wallet, Smartphone, Monitor, ExternalLink, Loader2, CheckCircle, ChevronDown, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { MOBILE_WALLET_LINKS, isMobileDevice, openMobileWallet, getRecommendedWallets } from '@/utils/mobile-wallet-links';



export function MobileWalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { isOnBase, shouldSwitchToBase, switchToBase } = useBaseNetwork();
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMobileWalletConnect = async (wallet: any) => {
    try {
      // Find the matching connector
      const connector = connectors.find(c => 
        c.id === wallet.id || 
        c.name.toLowerCase().includes(wallet.name.toLowerCase())
      );

      if (connector && !isMobile) {
        // Desktop: use direct connector
        connect({ connector });
        setShowModal(false);
      } else if (isMobile) {
        // Mobile: use deep link
        const success = openMobileWallet(wallet.id);
        if (success) {
          setShowModal(false);
          toast({
            title: "Opening Wallet",
            description: `Redirecting to ${wallet.name}...`,
          });
        } else {
          toast({
            title: "Install Required",
            description: `Please install ${wallet.name} first`,
          });
        }
      } else {
        // Fallback: direct connection attempt
        if (connector) {
          connect({ connector });
          setShowModal(false);
        }
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      toast({
        title: "Connection Failed",
        description: `Could not connect to ${wallet.name}`,
        variant: "destructive",
      });
    }
  };

  const handleDesktopConnect = (connector: any) => {
    connect({ connector });
    setShowModal(false);
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

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {shouldSwitchToBase ? (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/30 cursor-pointer" onClick={switchToBase}>
            <div className="w-2 h-2 bg-orange-400 rounded-full mr-2 animate-pulse"></div>
            Switch to Base
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Connected • Base
          </Badge>
        )}
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
          <Wallet className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-sm">{address.slice(0, 6)}...{address.slice(-4)}</span>
          
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
                  disconnect();
                  setShowModal(true);
                }}
                className="hover:bg-blue-500/20 focus:bg-blue-500/20 hover:text-blue-400 focus:text-blue-400 cursor-pointer"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Switch Wallet
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => disconnect()}
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
        className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6"
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
          
          {/* Mobile Section */}
          {isMobile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-400 mb-4">
                <Smartphone className="h-4 w-4" />
                <span className="text-sm">Available Wallets</span>
              </div>
              
              {getRecommendedWallets().map((wallet) => (
                <Button
                  key={wallet.id}
                  onClick={() => handleMobileWalletConnect(wallet)}
                  disabled={isPending}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center gap-4 w-full">
                    <Wallet className="h-5 w-5" />
                    <span className="font-medium">{wallet.name}</span>
                  </div>
                </Button>
              ))}


            </div>
          ) : (
            // Desktop Section
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-400 mb-4">
                <Monitor className="h-4 w-4" />
                <span className="text-sm">Available Wallets</span>
              </div>
              
              {/* Filter out unwanted wallets and add custom ordering */}
              {connectors
                .filter(connector => 
                  connector.name !== 'Injected' && 
                  !connector.name.includes('Binance') && // Remove any duplicate Binance entries
                  !connector.name.toLowerCase().includes('keplr') // Remove Keplr
                )
                .map((connector) => (
                <Button
                  key={connector.id}
                  onClick={() => handleDesktopConnect(connector)}
                  disabled={isPending}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-4 h-5 w-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-4 h-5 w-5" />
                      {connector.name === 'WalletConnect' ? 'WalletConnect (200+ wallets)' : connector.name}
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
                      handleDesktopConnect(binanceConnector);
                    }
                  } else {
                    window.open('https://www.binance.com/en/web3wallet', '_blank');
                  }
                }}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
              >
                <Wallet className="mr-4 h-5 w-5" />
                Binance Wallet
              </Button>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error.message}</p>
            </div>
          )}

          <div className="text-sm text-gray-500 text-center mt-6">
            By connecting, you agree to the Terms of Service and Privacy Policy
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}