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
      
      // Additional periodic check for wallet changes (fallback)
      const intervalCheck = setInterval(async () => {
        if (isActive && ethereum) {
          try {
            // Get current accounts directly from wallet
            const accounts = await ethereum.request({ method: 'eth_accounts' });
            const currentSelectedAddress = ethereum.selectedAddress || (accounts && accounts[0]);
            
            console.log('WalletContext: Periodic check', { 
              currentSelectedAddress, 
              storedAddress: address, 
              accounts,
              selectedAddress: ethereum.selectedAddress 
            });
            
            if (currentSelectedAddress && currentSelectedAddress !== address) {
              console.log('WalletContext: Address changed detected via periodic check');
              // Address changed without event
              setAddress(currentSelectedAddress);
              setIsConnected(true);
              setManuallyDisconnected(false);
              
              // Clear cache and invalidate queries
              queryClient.removeQueries({ queryKey: ['user-positions'] });
              queryClient.removeQueries({ queryKey: ['rewards'] });
              queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
              queryClient.removeQueries({ queryKey: ['user-analytics'] });
              queryClient.removeQueries({ queryKey: ['kilt-balance'] });
              queryClient.removeQueries({ queryKey: ['weth-balance'] });
              queryClient.invalidateQueries();
              
              toast({
                title: "Account detected",
                description: `Switched to ${currentSelectedAddress.slice(0, 6)}...${currentSelectedAddress.slice(-4)}`,
              });
            } else if (!currentSelectedAddress && address) {
              console.log('WalletContext: Wallet disconnected detected via periodic check');
              // Wallet was disconnected
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
            }
          } catch (error) {
            console.log('WalletContext: Error during periodic check', error);
          }
        }
      }, 1000); // Check every 1 second for faster detection
      
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
      console.log('forceRefreshWallet: Starting forced wallet refresh');
      
      // Force request accounts to trigger MetaMask to update connection
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      console.log('forceRefreshWallet: Got accounts from eth_requestAccounts:', accounts);
      
      if (accounts && accounts.length > 0) {
        const newAddress = accounts[0];
        
        if (newAddress !== address) {
          console.log('forceRefreshWallet: Address changed!', { oldAddress: address, newAddress });
          
          setAddress(newAddress);
          setIsConnected(true);
          setManuallyDisconnected(false);
          
          // Clear all user-specific cache
          queryClient.removeQueries({ queryKey: ['user-positions'] });
          queryClient.removeQueries({ queryKey: ['rewards'] });
          queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
          queryClient.removeQueries({ queryKey: ['user-analytics'] });
          queryClient.removeQueries({ queryKey: ['kilt-balance'] });
          queryClient.removeQueries({ queryKey: ['weth-balance'] });
          
          // Trigger immediate re-fetch for new account
          queryClient.invalidateQueries();
          
          toast({
            title: "Wallet refreshed",
            description: `Now connected to ${newAddress.slice(0, 6)}...${newAddress.slice(-4)}`,
          });
        } else {
          console.log('forceRefreshWallet: No address change detected');
          toast({
            title: "Wallet up to date",
            description: "No account changes detected.",
          });
        }
      }
    } catch (error) {
      console.error('forceRefreshWallet: Error during force refresh:', error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh wallet connection.",
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