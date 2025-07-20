import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';


interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  initialized: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToBase: () => Promise<void>;
  validateBaseNetwork: () => Promise<boolean>;
  forceRefreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Switch to Base mainnet network
  const switchToBase = async () => {
    const ethereum = (window as unknown as { ethereum?: { request: (params: unknown) => Promise<unknown> } }).ethereum;
    try {
      await ethereum?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // Base mainnet network (8453)
      });
    } catch (error: unknown) {
      const walletError = error as { code?: number };
      if (walletError.code === 4902) {
        // Chain not added, add Base mainnet
        const ethereum = (window as unknown as { ethereum?: { request: (params: unknown) => Promise<unknown> } }).ethereum;
        await ethereum?.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x2105',
            chainName: 'Base Mainnet',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          }],
        });
      } else {
        throw error;
      }
    }
  };

  // Validate that user is on Base mainnet
  const validateBaseNetwork = async () => {
    const ethereum = (window as unknown as { ethereum?: { request: (params: { method: string }) => Promise<string> } }).ethereum;
    if (!ethereum) return false;
    
    try {
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      return chainId === '0x2105';
    } catch (error: unknown) {
      return false;
    }
  };

  // Force switch to Base mainnet for all operations
  const ensureBaseNetwork = async () => {
    const isOnBase = await validateBaseNetwork();
    if (!isOnBase && isConnected) {
      await switchToBase();
    }
  };

  // Check if wallet is already connected on mount and set up event listeners
  useEffect(() => {
    let isActive = true; // Prevent state updates if component unmounts

    const checkConnection = async () => {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        if (isActive) setInitialized(true);
        return;
      }

      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_accounts',
        });

        if (isActive && accounts && accounts.length > 0 && !manuallyDisconnected) {
          setAddress(accounts[0]);
          setIsConnected(true);
          
          // Check if we're on Base mainnet and switch if needed
          const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
          if (chainId !== '0x2105') {
            try {
              await switchToBase();
            } catch (error) {
              // Failed to switch automatically
            }
          }
        }
      } catch (error) {
        // Error checking connection
      } finally {
        if (isActive) setInitialized(true);
      }
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (!isActive) return;
      
      console.log('WalletContext: accountsChanged event fired', { accounts, currentAddress: address });
      
      // Accounts changed event
      if (accounts.length === 0) {
        // User disconnected their wallet
        console.log('WalletContext: Wallet disconnected via accountsChanged');
        setAddress(null);
        setIsConnected(false);
        setManuallyDisconnected(true); // Mark as manually disconnected
        
        // Clear all user-specific cache
        queryClient.removeQueries({ queryKey: ['user-positions'] });
        queryClient.removeQueries({ queryKey: ['rewards'] });
        queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
        queryClient.removeQueries({ queryKey: ['user-analytics'] });
        queryClient.removeQueries({ queryKey: ['kilt-balance'] });
        queryClient.removeQueries({ queryKey: ['weth-balance'] });
        
        toast({
          title: "Wallet disconnected",
          description: "Your wallet has been disconnected.",
        });
      } else {
        // User switched accounts or connected for the first time
        const newAddress = accounts[0];
        console.log('WalletContext: Checking address change', { currentAddress: address, newAddress });
        
        // Get current address at the time of the event
        setAddress(currentAddress => {
          console.log('WalletContext: setAddress callback', { currentAddress, newAddress });
          if (currentAddress !== newAddress) {
            // Address actually changed
            console.log('WalletContext: Address changed, updating state and clearing cache');
            setIsConnected(true);
            setManuallyDisconnected(false); // Reset flag when switching accounts
            
            // Clear all user-specific cache for the previous account
            queryClient.removeQueries({ queryKey: ['user-positions'] });
            queryClient.removeQueries({ queryKey: ['rewards'] });
            queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
            queryClient.removeQueries({ queryKey: ['user-analytics'] });
            queryClient.removeQueries({ queryKey: ['kilt-balance'] });
            queryClient.removeQueries({ queryKey: ['weth-balance'] });
            
            // Trigger immediate re-fetch for new account
            queryClient.invalidateQueries();
            
            toast({
              title: "Account switched",
              description: `Switched to ${newAddress.slice(0, 6)}...${newAddress.slice(-4)}`,
            });
          } else {
            console.log('WalletContext: Address unchanged, no action needed');
          }
          return newAddress;
        });
      }
    };

    const handleChainChanged = async (chainId: string) => {
      if (!isActive) return;
      
      // Force switch to Base mainnet if not already on it
      if (chainId !== '0x2105' && isConnected) {
        try {
          await switchToBase();
          toast({
            title: "Switched to Base Mainnet",
            description: "Automatically switched to Base mainnet for KILT operations.",
          });
        } catch (error) {
          toast({
            title: "Network Error",
            description: "Please manually switch to Base mainnet in your wallet.",
            variant: "destructive",
          });
        }
      }
      
      // Clear all wallet-related cache when network changes
      queryClient.removeQueries({ queryKey: ['kilt-balance'] });
      queryClient.removeQueries({ queryKey: ['weth-balance'] });
      queryClient.removeQueries({ queryKey: ['uniswap-positions'] });
      queryClient.removeQueries({ queryKey: ['kilt-eth-positions'] });
      queryClient.removeQueries({ queryKey: ['pool-data'] });
      queryClient.removeQueries({ queryKey: ['user-positions'] });
      queryClient.removeQueries({ queryKey: ['position-details'] });
      queryClient.removeQueries({ queryKey: ['rewards'] });
      queryClient.removeQueries({ queryKey: ['user-analytics'] });
      queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
      
      // Trigger re-fetch of all queries
      queryClient.invalidateQueries();
    };

    const handleConnect = () => {
      if (!isActive) return;
      // Wallet connected externally - check for account changes
      checkConnection();
    };

    const handleDisconnect = () => {
      if (!isActive) return;
      // Wallet disconnected externally
      setAddress(null);
      setIsConnected(false);
      setManuallyDisconnected(true);
      
      // Clear all user-specific cache
      queryClient.removeQueries({ queryKey: ['user-positions'] });
      queryClient.removeQueries({ queryKey: ['rewards'] });
      queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
      queryClient.removeQueries({ queryKey: ['user-analytics'] });
      queryClient.removeQueries({ queryKey: ['kilt-balance'] });
      queryClient.removeQueries({ queryKey: ['weth-balance'] });
      
      toast({
        title: "Wallet disconnected",
        description: "Your wallet has been disconnected.",
      });
    };

    if ((window as any).ethereum) {
      checkConnection();
      
      // Set up event listeners with enhanced coverage
      const ethereum = (window as any).ethereum;
      
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);
      ethereum.on('connect', handleConnect);
      ethereum.on('disconnect', handleDisconnect);
      
      // Enhanced automatic detection system
      const intervalCheck = setInterval(async () => {
        if (isActive && ethereum) {
          try {
            // Multiple detection methods for maximum reliability
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            const selectedAddress = ethereum.selectedAddress;
            const chainId = await ethereum.request({ method: 'eth_chainId' });
            
            // Get the most reliable current address
            let currentAddress = null;
            if (accounts && accounts.length > 0) {
              currentAddress = accounts[0];
            } else if (selectedAddress) {
              currentAddress = selectedAddress;
            }
            
            // Only log when there's a potential change to reduce noise
            const hasChange = currentAddress !== address;
            
            // Aggressive detection: Force refresh if any account mismatch detected
            if (accounts && accounts.length > 0) {
              // Always force a fresh request to ensure MetaMask gives us the real current account
              try {
                const freshAccounts = await ethereum.request({ method: 'eth_requestAccounts' });
                if (freshAccounts && freshAccounts.length > 0) {
                  currentAddress = freshAccounts[0];
                  
                  // Check if there's any difference between what we expected and what we got
                  if (currentAddress !== accounts[0] || currentAddress !== selectedAddress) {
                    console.log('FORCED ACCOUNT DETECTION:', {
                      ethAccounts: accounts[0],
                      selectedAddress,
                      freshResult: currentAddress,
                      storedAddress: address
                    });
                  }
                }
              } catch (error) {
                // If fresh request fails, use the best available option
                currentAddress = accounts[0] || selectedAddress;
              }
            }
            
            if (hasChange && currentAddress) {
              console.log('WALLET CHANGE DETECTED:', { 
                previousAddress: address,
                newAddress: currentAddress,
                method: 'auto-detection',
                accounts,
                selectedAddress 
              });
              
              // Address changed - update immediately
              setAddress(currentAddress);
              setIsConnected(true);
              setManuallyDisconnected(false);
              
              // Clear all user-specific cache for clean state
              queryClient.removeQueries({ queryKey: ['user-positions'] });
              queryClient.removeQueries({ queryKey: ['rewards'] });
              queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
              queryClient.removeQueries({ queryKey: ['user-analytics'] });
              queryClient.removeQueries({ queryKey: ['kilt-balance'] });
              queryClient.removeQueries({ queryKey: ['weth-balance'] });
              queryClient.invalidateQueries();
              
              toast({
                title: "Wallet account changed",
                description: `Automatically switched to ${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}`,
              });
              
              // Ensure we're on Base network
              if (chainId !== '0x2105') {
                try {
                  await switchToBase();
                } catch (error) {
                  console.log('Auto network switch failed:', error);
                }
              }
            } else if (!currentAddress && address) {
              console.log('WALLET DISCONNECT DETECTED:', { previousAddress: address });
              
              // Wallet disconnected
              setAddress(null);
              setIsConnected(false);
              setManuallyDisconnected(true);
              
              // Clear all user-specific cache
              queryClient.removeQueries({ queryKey: ['user-positions'] });
              queryClient.removeQueries({ queryKey: ['rewards'] });
              queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
              queryClient.removeQueries({ queryKey: ['user-analytics'] });
              queryClient.removeQueries({ queryKey: ['kilt-balance'] });
              queryClient.removeQueries({ queryKey: ['weth-balance'] });
              
              toast({
                title: "Wallet disconnected",
                description: "Your wallet has been automatically disconnected.",
              });
            }
          } catch (error) {
            // Only log significant errors
            if (error.message && !error.message.includes('User rejected')) {
              console.log('WalletContext: Auto-detection error', error);
            }
          }
        }
      }, 500); // Check every 500ms for very fast detection
      
      // Additional aggressive detection - monitor page focus events
      const handlePageFocus = async () => {
        if (document.hasFocus() && ethereum) {
          try {
            console.log('PAGE FOCUS - Checking for wallet changes...');
            const freshAccounts = await ethereum.request({ method: 'eth_requestAccounts' });
            if (freshAccounts && freshAccounts.length > 0 && freshAccounts[0] !== address) {
              console.log('FOCUS DETECTION - Address changed:', { 
                old: address, 
                new: freshAccounts[0] 
              });
              
              setAddress(freshAccounts[0]);
              setIsConnected(true);
              setManuallyDisconnected(false);
              
              // Clear cache
              queryClient.removeQueries({ queryKey: ['user-positions'] });
              queryClient.removeQueries({ queryKey: ['rewards'] });
              queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
              queryClient.removeQueries({ queryKey: ['user-analytics'] });
              queryClient.removeQueries({ queryKey: ['kilt-balance'] });
              queryClient.removeQueries({ queryKey: ['weth-balance'] });
              queryClient.invalidateQueries();
              
              toast({
                title: "Wallet account changed",
                description: `Detected new account: ${freshAccounts[0].slice(0, 6)}...${freshAccounts[0].slice(-4)}`,
              });
            }
          } catch (error) {
            // Silently handle errors
          }
        }
      };
      
      window.addEventListener('focus', handlePageFocus);
      document.addEventListener('visibilitychange', handlePageFocus);
      
      // Cleanup function
      return () => {
        isActive = false;
        clearInterval(intervalCheck);
        
        if (ethereum?.removeListener) {
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
          ethereum.removeListener('chainChanged', handleChainChanged);
          ethereum.removeListener('connect', handleConnect);
          ethereum.removeListener('disconnect', handleDisconnect);
        }
        
        window.removeEventListener('focus', handlePageFocus);
        document.removeEventListener('visibilitychange', handlePageFocus);
      };
    } else {
      if (isActive) setInitialized(true);
    }

    return () => {
      isActive = false;
    };
  }, [toast, queryClient, manuallyDisconnected, isConnected]);

  const connect = async () => {
    if (!(window as any).ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or another Web3 wallet to connect.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        const connectedAddress = accounts[0];
        setAddress(connectedAddress);
        setIsConnected(true);
        setManuallyDisconnected(false); // Reset flag when manually connecting
        
        // Connected to wallet successfully
        
        // Force switch to Base mainnet
        await switchToBase();
        
        // Verify we're on Base mainnet
        const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0x2105') {
          toast({
            title: "Network Warning",
            description: "Please switch to Base mainnet in your wallet for full functionality.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Wallet connected",
            description: "Successfully connected to Base mainnet.",
          });
        }
      }
    } catch (error: unknown) {
      const walletError = error as { code?: number; message?: string };
      if (walletError.code === 4001) {
        toast({
          title: "Connection rejected",
          description: "Please approve the connection request in your wallet.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection failed",
          description: walletError.message || "Failed to connect wallet.",
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    setManuallyDisconnected(true); // Set flag to prevent auto-reconnection
    
    toast({
      title: "Wallet disconnected",
      description: "Successfully disconnected from your wallet.",
    });
    
    // Wallet disconnected - Context state updated
  };

  const forceRefreshWallet = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or another Web3 wallet to connect.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('FORCE RECONNECT: Starting complete wallet reconnection...');
      
      // Step 1: Complete disconnection
      setAddress(null);
      setIsConnected(false);
      setManuallyDisconnected(true);
      
      // Step 2: Clear all cached data
      queryClient.removeQueries({ queryKey: ['user-positions'] });
      queryClient.removeQueries({ queryKey: ['rewards'] });
      queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
      queryClient.removeQueries({ queryKey: ['user-analytics'] });
      queryClient.removeQueries({ queryKey: ['kilt-balance'] });
      queryClient.removeQueries({ queryKey: ['weth-balance'] });
      
      // Step 3: Wait a moment to let MetaMask clear state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Step 4: Force fresh connection with current account
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      console.log('FORCE RECONNECT: Fresh connection result:', accounts);
      
      if (accounts && accounts.length > 0) {
        const currentAddress = accounts[0];
        
        console.log('FORCE RECONNECT: Connecting to current account:', currentAddress);
        
        setAddress(currentAddress);
        setIsConnected(true);
        setManuallyDisconnected(false);
        
        // Trigger immediate re-fetch for current account
        queryClient.invalidateQueries();
        
        toast({
          title: "Wallet reconnected",
          description: `Connected to current account: ${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}`,
        });
      }
    } catch (error) {
      console.error('FORCE RECONNECT: Error during reconnection:', error);
      toast({
        title: "Reconnection failed",
        description: "Could not reconnect to wallet. Please try manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        initialized,
        connect,
        disconnect,
        switchToBase,
        validateBaseNetwork,
        forceRefreshWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}