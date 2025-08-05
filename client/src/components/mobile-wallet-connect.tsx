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

  // Detect installed mobile wallets
  const getInstalledMobileWallets = () => {
    const installed = [];
    
    // Debug: Log available providers
    console.log('🔍 Checking for mobile wallet providers...');
    console.log('window.ethereum:', (window as any).ethereum);
    console.log('window.phantom:', (window as any).phantom);
    console.log('Available connectors:', connectors.map(c => ({ id: c.id, name: c.name })));
    
    // Check for MetaMask Mobile
    if ((window as any).ethereum?.isMetaMask) {
      console.log('✅ MetaMask detected');
      installed.push({ id: 'metamask', name: 'MetaMask', isInstalled: true });
    }
    
    // Check for Phantom Mobile
    if ((window as any).phantom?.ethereum) {
      console.log('✅ Phantom detected');
      installed.push({ id: 'phantom', name: 'Phantom', isInstalled: true });
    }
    
    // Check for Trust Wallet
    if ((window as any).ethereum?.isTrust) {
      console.log('✅ Trust Wallet detected');
      installed.push({ id: 'trust', name: 'Trust Wallet', isInstalled: true });
    }
    
    // Check for Coinbase Wallet
    if ((window as any).ethereum?.isCoinbaseWallet || (window as any).coinbaseWalletExtension) {
      console.log('✅ Coinbase Wallet detected');
      installed.push({ id: 'coinbase', name: 'Coinbase Wallet', isInstalled: true });
    }
    
    // Check for Rainbow
    if ((window as any).ethereum?.isRainbow) {
      console.log('✅ Rainbow detected');
      installed.push({ id: 'rainbow', name: 'Rainbow', isInstalled: true });
    }
    
    // Additional checks for mobile-specific providers
    if (isMobile) {
      // Check if we're in a mobile wallet browser
      if ((window as any).ethereum && !Object.keys((window as any).ethereum).length) {
        console.log('📱 Detected mobile wallet browser environment');
      }
      
      // Check for specific mobile wallet user agents
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('metamask')) {
        console.log('📱 MetaMask mobile browser detected via user agent');
        if (!installed.some(w => w.id === 'metamask')) {
          installed.push({ id: 'metamask', name: 'MetaMask', isInstalled: true });
        }
      }
      
      if (userAgent.includes('trust')) {
        console.log('📱 Trust Wallet mobile browser detected via user agent');
        if (!installed.some(w => w.id === 'trust')) {
          installed.push({ id: 'trust', name: 'Trust Wallet', isInstalled: true });
        }
      }
    }
    
    console.log('🎯 Final installed wallets:', installed);
    return installed;
  };

  const handleMobileWalletConnect = async (wallet: any) => {
    try {
      if (wallet.id === 'walletConnect') {
        // WalletConnect: Always use WalletConnect connector
        const wcConnector = connectors.find(c => c.id === 'walletConnect' || c.name === 'WalletConnect');
        if (wcConnector) {
          connect({ connector: wcConnector });
          setShowModal(false);
          toast({
            title: "Connecting Wallet",
            description: "Scan QR code or approve connection in your wallet app",
          });
        }
        return;
      }

      // Check if wallet is installed on mobile
      const installedWallets = getInstalledMobileWallets();
      const installedWallet = installedWallets.find(w => w.id === wallet.id);
      
      if (installedWallet) {
        console.log(`✅ ${wallet.name} is installed on mobile, using direct connection`);
        
        // Find the connector for the installed wallet
        const connector = connectors.find(c => 
          c.id === wallet.id || 
          c.name.toLowerCase().includes(wallet.name.toLowerCase()) ||
          (wallet.id === 'metamask' && c.name === 'MetaMask') ||
          (wallet.id === 'phantom' && c.name === 'Phantom') ||
          (wallet.id === 'coinbase' && (c.name === 'Coinbase Wallet' || c.id === 'coinbaseWallet')) ||
          (wallet.id === 'trust' && c.name === 'Trust Wallet') ||
          (wallet.id === 'rainbow' && c.name === 'Rainbow')
        );
        
        if (connector) {
          connect({ connector });
          setShowModal(false);
          toast({
            title: "Connecting to Wallet",
            description: `Connecting to your installed ${wallet.name} app`,
          });
          return;
        }
      }
      
      // If not installed, try deep link (mobile only)
      if (isMobile) {
        console.log(`📱 ${wallet.name} not detected as installed, trying deep link`);
        
        const success = openMobileWallet(wallet.id);
        setShowModal(false);
        
        if (success) {
          toast({
            title: "Opening Wallet App",
            description: `Redirecting to ${wallet.name}. If the app doesn't open, try WalletConnect instead.`,
          });
          
          // If app doesn't open after 4 seconds, suggest WalletConnect
          setTimeout(() => {
            if (!isConnected && document.visibilityState === 'visible') {
              toast({
                title: "App Not Opening?",
                description: "Try the WalletConnect option instead - it works with any wallet.",
                variant: "default",
              });
            }
          }, 4000);
        } else {
          // Immediate fallback to WalletConnect
          toast({
            title: "Deep Link Failed",
            description: `Couldn't open ${wallet.name}. Please use WalletConnect or install the app.`,
            variant: "destructive",
          });
        }
      } else {
        // Desktop: find and use direct connector
        const connector = connectors.find(c => 
          c.id === wallet.id || 
          c.name.toLowerCase().includes(wallet.name.toLowerCase())
        );
        
        if (connector) {
          connect({ connector });
          setShowModal(false);
        } else {
          // Fallback to WalletConnect
          const wcConnector = connectors.find(c => c.id === 'walletConnect');
          if (wcConnector) {
            connect({ connector: wcConnector });
            setShowModal(false);
          }
        }
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      toast({
        title: "Connection Failed",
        description: `Could not connect to ${wallet.name}. Try WalletConnect instead.`,
        variant: "destructive",
      });
      
      // Fallback to WalletConnect on error
      const wcConnector = connectors.find(c => c.id === 'walletConnect');
      if (wcConnector) {
        connect({ connector: wcConnector });
        setShowModal(false);
      }
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
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] shadow-medium-modern hover:shadow-strong-modern hover:-translate-y-0.5 h-11 py-2.5 from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6 bg-[#f70363]"
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
        <DialogContent className={`
          bg-black border border-gray-800
          ${isMobile 
            ? 'fixed inset-2 top-4 bottom-4 w-[calc(100vw-16px)] h-[calc(100vh-32px)] max-h-[calc(100vh-32px)] rounded-lg m-0 p-4 max-w-none flex flex-col'
            : 'max-w-md mx-auto my-8 max-h-[90vh] rounded-lg w-full'
          }
          overflow-hidden
        `}>
          <DialogHeader className={isMobile ? 'mb-8' : 'mb-6'}>
            <DialogTitle className={`
              text-white font-bold flex items-center justify-between
              ${isMobile ? 'text-2xl' : 'text-xl sm:text-2xl'}
            `}>
              <div className="flex items-center gap-3">
                <Wallet className={`${isMobile ? 'h-7 w-7' : 'h-5 w-5 sm:h-6 sm:w-6'}`} />
                Connect Your Wallet
              </div>
              {isMobile && (
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          
          {/* Mobile Section */}
          {isMobile ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-3 text-gray-400 mb-6">
                <Smartphone className="h-5 w-5" />
                <span className="text-base">Mobile Wallets</span>
              </div>
              
              <div className="space-y-4 flex-1 overflow-y-auto">
                {/* Show installed wallets first */}
                {(() => {
                  const installedWallets = getInstalledMobileWallets();
                  const recommendedWallets = getRecommendedWallets().filter(w => w.id !== 'walletConnect');
                  
                  return (
                    <>
                      {/* Installed wallets section */}
                      {installedWallets.length > 0 && (
                        <>
                          <div className="text-green-400 text-sm font-medium flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Installed Wallets
                          </div>
                          {installedWallets.map((wallet) => (
                            <Button
                              key={wallet.id}
                              onClick={() => handleMobileWalletConnect(wallet)}
                              disabled={isPending}
                              className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white border-0 h-16 text-lg font-medium justify-start px-6 rounded-xl transition-all duration-200 active:scale-[0.98]"
                            >
                              <div className="flex items-center gap-4 w-full">
                                <CheckCircle className="h-6 w-6 flex-shrink-0" />
                                <div className="text-left">
                                  <div className="font-semibold">{wallet.name}</div>
                                  <div className="text-sm opacity-80">Ready to connect</div>
                                </div>
                              </div>
                            </Button>
                          ))}
                        </>
                      )}
                      
                      {/* WalletConnect - Always available */}
                      <Button
                        onClick={() => handleMobileWalletConnect({ id: 'walletConnect', name: 'WalletConnect (200+ wallets)' })}
                        disabled={isPending}
                        className="w-full bg-gradient-to-r from-[#3b9df8] to-[#2b7fd8] hover:from-[#4daef9] hover:to-[#3b9df8] text-white border-0 h-16 text-lg font-medium justify-start px-6 rounded-xl transition-all duration-200 active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4 w-full">
                          <svg className="h-6 w-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.65 7.65c4.7-4.7 12.3-4.7 17 0L22.5 9.8c.4.4.4 1 0 1.4l-1.9 1.9c-.2.2-.5.2-.7 0l-2.2-2.2c-3.3-3.3-8.6-3.3-11.9 0l-2.4 2.4c-.2.2-.5.2-.7 0L1.5 11.2c-.4-.4-.4-1 0-1.4L7.65 7.65zM12 15c1.5 0 2.8 1.3 2.8 2.8s-1.3 2.8-2.8 2.8-2.8-1.3-2.8-2.8S10.5 15 12 15z"/>
                          </svg>
                          <div className="text-left">
                            <div className="font-semibold">WalletConnect</div>
                            <div className="text-sm opacity-80">Works with any wallet</div>
                          </div>
                        </div>
                      </Button>
                      
                      {/* Other wallets - only show if not installed */}
                      {recommendedWallets.filter(wallet => 
                        !installedWallets.some(installed => installed.id === wallet.id)
                      ).map((wallet) => (
                        <Button
                          key={wallet.id}
                          onClick={() => handleMobileWalletConnect(wallet)}
                          disabled={isPending}
                          className="w-full bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-500 hover:to-gray-400 text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-xl transition-all duration-200 active:scale-[0.98]"
                        >
                          <div className="flex items-center gap-4 w-full">
                            <ExternalLink className="h-5 w-5 flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium">{wallet.name}</div>
                              <div className="text-xs opacity-70">Download & open</div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </>
                  );
                })()}
              </div>


            </div>
          ) : (
            // Desktop Section
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
                  onClick={() => handleDesktopConnect(connector)}
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
                className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
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

          <div className={`text-gray-500 text-center px-2 flex-shrink-0 ${isMobile ? 'text-sm mt-6 pt-4 border-t border-gray-800' : 'text-xs sm:text-sm mt-4 sm:mt-6'}`}>
            By connecting, you agree to the Terms of Service and Privacy Policy
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}