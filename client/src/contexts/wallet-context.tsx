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
  
  // Persist manually disconnected state across page reloads
  const [manuallyDisconnected, setManuallyDisconnectedState] = useState(() => {
    try {
      return localStorage.getItem('manually-disconnected') === 'true';
    } catch {
      return false;
    }
  });
  
  const setManuallyDisconnected = (value: boolean) => {
    setManuallyDisconnectedState(value);
    try {
      if (value) {
        localStorage.setItem('manually-disconnected', 'true');
      } else {
        localStorage.removeItem('manually-disconnected');
      }
    } catch {
      // Ignore localStorage errors
    }
  };
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
        // Always get fresh accounts - never trust cached state
        const accounts = await (window as any).ethereum.request({
          method: 'eth_accounts',
        });
        
        const currentAddress = accounts && accounts.length > 0 ? accounts[0] : null;
        
        console.log('WALLET CONTEXT: Connection check', {
          currentAddress,
          storedAddress: address,
          accountsLength: accounts?.length || 0,
          manuallyDisconnected
        });

        if (isActive && currentAddress && !manuallyDisconnected) {
          // Always update to the real current address (don't trust stored state)
          if (currentAddress !== address) {
            console.log('WALLET CONTEXT: Address change detected during reconnection', {
              old: address,
              new: currentAddress
            });
            
            // Clear cache when address changes
            queryClient.removeQueries({ queryKey: ['user-positions'] });
            queryClient.removeQueries({ queryKey: ['rewards'] });
            queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
            queryClient.removeQueries({ queryKey: ['user-analytics'] });
            queryClient.removeQueries({ queryKey: ['kilt-balance'] });
            queryClient.removeQueries({ queryKey: ['weth-balance'] });
            queryClient.invalidateQueries();
            
            toast({
              title: "Account detected",
              description: `Connected to ${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}`,
            });
          }
          
          setAddress(currentAddress);
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
        } else if (isActive && !currentAddress) {
          // No current address - ensure disconnected state
          setAddress(null);
          setIsConnected(false);
        }
      } catch (error) {
        console.log('WALLET CONTEXT: Connection check error', error);
        if (isActive) {
          setAddress(null);
          setIsConnected(false);
        }
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
        
        // Always update address when MetaMask fires accountsChanged event
        console.log('WalletContext: Address update from MetaMask event', { currentAddress: address, newAddress });
        
        setAddress(newAddress);
        setIsConnected(true);
        setManuallyDisconnected(false);
        
        // Always clear cache when address changes (MetaMask knows best)
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
          description: `Now connected to ${newAddress.slice(0, 6)}...${newAddress.slice(-4)}`,
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
      
      console.log('WALLET CONTEXT: Setting up pure event listener system');
      
      // Cleanup function
      return () => {
        isActive = false;
        
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
      // Always request fresh accounts - never trust cached state
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        const connectedAddress = accounts[0];
        
        console.log('WALLET CONTEXT: Manual connect to fresh address', {
          connectedAddress,
          previousAddress: address
        });
        
        // Clear all cache when connecting (fresh start)
        queryClient.clear();
        
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
    console.log('WALLET CONTEXT: Manual disconnect - clearing all state and cache');
    
    // Clear wallet state
    setAddress(null);
    setIsConnected(false);
    setManuallyDisconnected(true); // Set flag to prevent auto-reconnection
    
    // Completely clear all cached data
    queryClient.clear(); // This clears ALL cache
    
    // Also specifically remove user-related queries for extra safety
    queryClient.removeQueries({ queryKey: ['user-positions'] });
    queryClient.removeQueries({ queryKey: ['rewards'] });
    queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
    queryClient.removeQueries({ queryKey: ['user-analytics'] });
    queryClient.removeQueries({ queryKey: ['kilt-balance'] });
    queryClient.removeQueries({ queryKey: ['weth-balance'] });
    queryClient.removeQueries({ queryKey: ['users'] });
    
    // Clear any localStorage wallet data
    try {
      localStorage.removeItem('walletconnect');
      localStorage.removeItem('wallet-connected');
      localStorage.removeItem('wallet-address');
      // Don't remove 'manually-disconnected' - we want to keep this flag
    } catch (error) {
      // Ignore localStorage errors
    }
    
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected and all cache cleared.",
    });
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
      
      // Step 4: Nuclear option - Force MetaMask to completely refresh connection
      // First try to disconnect from MetaMask's perspective
      try {
        await ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (error) {
        console.log('Permission reset failed, continuing with reconnection...');
      }
      
      // Force fresh connection with current account
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