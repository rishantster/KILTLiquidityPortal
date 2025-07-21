import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getWalletConnectService } from '@/services/walletconnect-service';


interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  initialized: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'network_error';
  lastError: string | null;
  connect: () => Promise<void>;
  connectWithWalletConnect: () => Promise<void>;
  disconnect: () => void;
  switchToBase: () => Promise<void>;
  validateBaseNetwork: () => Promise<boolean>;
  forceRefreshWallet: () => Promise<void>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error' | 'network_error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  
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

  const clearError = () => {
    setLastError(null);
    if (connectionStatus === 'error' || connectionStatus === 'network_error') {
      setConnectionStatus('disconnected');
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

      // CRITICAL: Never auto-reconnect if user manually disconnected
      if (manuallyDisconnected) {
        console.log('WALLET CONTEXT: Skipping connection check - user manually disconnected');
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
      
      console.log('WalletContext: accountsChanged event fired', { accounts, currentAddress: address, manuallyDisconnected });
      
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
      } else if (!manuallyDisconnected) {
        // Only auto-connect if user hasn't manually disconnected
        const newAddress = accounts[0];
        console.log('WalletContext: Auto-connecting to new address', { currentAddress: address, newAddress });
        
        setAddress(newAddress);
        setIsConnected(true);
        
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
      } else {
        console.log('WalletContext: Ignoring accountsChanged - user manually disconnected');
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

    // Listen for custom wallet connection events from Web3Modal service
    const handleWalletConnected = (event: CustomEvent) => {
      if (!isActive) return;
      
      const { address: connectedAddress, wallet } = event.detail;
      console.log('WALLET CONTEXT: Custom wallet-connected event', { connectedAddress, wallet });
      
      if (connectedAddress) {
        setAddress(connectedAddress);
        setIsConnected(true);
        setConnectionStatus('connected');
        setManuallyDisconnected(false); // Clear manual disconnect flag
        setLastError(null);
        
        // Clear and refresh cache for new connection
        queryClient.removeQueries({ queryKey: ['user-positions'] });
        queryClient.removeQueries({ queryKey: ['rewards'] });
        queryClient.removeQueries({ queryKey: ['unregistered-positions'] });
        queryClient.removeQueries({ queryKey: ['user-analytics'] });
        queryClient.removeQueries({ queryKey: ['kilt-balance'] });
        queryClient.removeQueries({ queryKey: ['weth-balance'] });
        queryClient.invalidateQueries();
        
        toast({
          title: "Wallet connected",
          description: `Connected to ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`,
        });
      }
    };

    if ((window as any).ethereum) {
      checkConnection();
      
      // Set up event listeners with enhanced coverage
      const ethereum = (window as any).ethereum;
      
      ethereum.on('accountsChanged', handleAccountsChanged);
      ethereum.on('chainChanged', handleChainChanged);
      ethereum.on('connect', handleConnect);
      ethereum.on('disconnect', handleDisconnect);
      
      // Listen for custom wallet connection events
      window.addEventListener('wallet-connected', handleWalletConnected as EventListener);
      
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
        
        // Remove custom event listener
        window.removeEventListener('wallet-connected', handleWalletConnected as EventListener);
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
      setConnectionStatus('error');
      setLastError('MetaMask not found. Please install MetaMask.');
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or another Web3 wallet to connect.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Set connecting state immediately (Reown best practice: immediate feedback)
      setIsConnecting(true);
      setConnectionStatus('connecting');
      setLastError(null);
      setManuallyDisconnected(false); // Reset flag when manually connecting
      
      // Show connecting toast (Reown best practice: inform user of status)
      toast({
        title: "Connecting...",
        description: "Please approve the connection in MetaMask",
      });
      
      // Force MetaMask to show account selector to get the currently selected account
      // This ensures we always connect to the account the user actually wants
      let accounts;
      try {
        // Try to request fresh permissions first (this shows account selector)
        await (window as any).ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        
        // Now get the freshly selected accounts
        const connectPromise = (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout - please try again')), 30000)
        );
        
        accounts = await Promise.race([connectPromise, timeoutPromise]);
      } catch (permissionError) {
        // If permission request fails, fall back to regular request
        console.log('WALLET CONTEXT: Permission request failed, using fallback', permissionError);
        
        const connectPromise = (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout - please try again')), 30000)
        );
        
        accounts = await Promise.race([connectPromise, timeoutPromise]);
      }

      if (accounts && accounts.length > 0) {
        const connectedAddress = accounts[0]; // This is the currently selected/active account
        
        console.log('WALLET CONTEXT: Manual connect to fresh address', {
          connectedAddress,
          previousAddress: address,
          allAccounts: accounts
        });
        
        // Check if this is a different address than what we had before
        if (address && address !== connectedAddress) {
          console.log('WALLET CONTEXT: Address change detected during connect', {
            oldAddress: address,
            newAddress: connectedAddress
          });
          
          // Clear cache for address change
          queryClient.clear();
          
          toast({
            title: "Account Changed",
            description: `Switched from ${address.slice(0, 6)}...${address.slice(-4)} to ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`,
          });
        } else if (!address) {
          // First time connection
          queryClient.clear();
        }
        
        setAddress(connectedAddress);
        setIsConnected(true);
        
        // Check network connectivity before proceeding
        try {
          await switchToBase();
          
          const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
          if (chainId !== '0x2105') {
            setConnectionStatus('network_error');
            setLastError('Please switch to Base network to continue');
            toast({
              title: "Network Warning",
              description: "Please switch to Base mainnet in your wallet for full functionality.",
              variant: "destructive",
            });
            return;
          }
        } catch (networkError) {
          setConnectionStatus('network_error');
          setLastError('Network switch failed - please manually switch to Base network');
          throw networkError;
        }

        // Connection successful (Reown best practice: clear success message)
        setConnectionStatus('connected');
        toast({
          title: "✅ Connected Successfully",
          description: `Connected to ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)} on Base network`,
        });
      }
    } catch (error: unknown) {
      const walletError = error as { code?: number; message?: string };
      
      // Set error state (Reown best practice: proper error state management)
      setConnectionStatus('error');
      setIsConnected(false);
      setAddress(null);
      
      if (walletError.code === 4001) {
        setLastError('Connection rejected by user');
        toast({
          title: "Connection rejected",
          description: "Please approve the connection request in your wallet.",
          variant: "destructive",
        });
      } else if (walletError.message?.includes('timeout')) {
        setLastError('Connection timeout - please try again');
        toast({
          title: "Connection Timeout",
          description: "Connection took too long. Please try again.",
          variant: "destructive",
        });
      } else {
        setLastError(walletError.message || 'Failed to connect wallet');
        toast({
          title: "Connection failed",
          description: walletError.message || "Failed to connect wallet. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const connectWithWalletConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');
      setLastError(null);
      setManuallyDisconnected(false);
      
      toast({
        title: "Initializing WalletConnect",
        description: "Setting up WalletConnect v2 connection...",
      });
      
      // Initialize WalletConnect service
      const wcService = getWalletConnectService();
      await wcService.initialize();
      
      // Check if already connected
      if (wcService.isConnected()) {
        const sessions = wcService.getActiveSessions();
        const session = Object.values(sessions)[0];
        
        if (session && session.namespaces?.eip155?.accounts) {
          const account = session.namespaces.eip155.accounts[0];
          const address = account.split(':')[2]; // Extract address from 'eip155:8453:0x...'
          
          setAddress(address);
          setIsConnected(true);
          setConnectionStatus('connected');
          
          toast({
            title: "WalletConnect Connected",
            description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
          });
          
          return;
        }
      }
      
      // Show QR code or open mobile wallet
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // On mobile, use deep linking
        const currentUrl = window.location.href;
        const walletConnectUrl = `wc:${currentUrl}`;
        window.location.href = walletConnectUrl;
      } else {
        // On desktop, show QR code modal (implement QR modal separately)
        toast({
          title: "WalletConnect Ready",
          description: "Scan QR code with your mobile wallet",
        });
        
        // TODO: Show QR code modal for desktop users
        // For now, we'll just notify that WalletConnect is ready
      }
      
      setConnectionStatus('connected');
      
    } catch (error: unknown) {
      const wcError = error as { message?: string };
      
      setConnectionStatus('error');
      setIsConnected(false);
      setAddress(null);
      setLastError(wcError.message || 'WalletConnect initialization failed');
      
      toast({
        title: "WalletConnect Error",
        description: wcError.message || "Failed to initialize WalletConnect",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    console.log('WALLET CONTEXT: Manual disconnect - clearing all state and cache');
    
    // Disconnect WalletConnect sessions if any exist
    try {
      const wcService = getWalletConnectService();
      if (wcService.isConnected()) {
        await wcService.disconnect();
        console.log('WalletConnect sessions disconnected');
      }
    } catch (error) {
      console.log('WalletConnect disconnect error (non-critical):', error);
    }
    
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
    
    // Set disconnected state (Reown best practice: clear status indication)
    setConnectionStatus('disconnected');
    setLastError(null);
    
    toast({
      title: "✅ Disconnected Successfully",
      description: "Your wallet has been safely disconnected and cache cleared.",
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
        connectionStatus,
        lastError,
        connect,
        connectWithWalletConnect,
        disconnect,
        switchToBase,
        validateBaseNetwork,
        forceRefreshWallet,
        clearError,
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