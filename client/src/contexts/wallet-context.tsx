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
    const checkConnection = async () => {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        setInitialized(true);
        return;
      }

      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts && accounts.length > 0 && !manuallyDisconnected) {
          setAddress(accounts[0]);
          setIsConnected(true);
          
          // Check if we're on Base mainnet and switch if needed
          const chainId = await (window as any).ethereum.request({ method: 'eth_chainId' });
          if (chainId !== '0x2105') {
            try {
              await switchToBase();
            } catch (error) {
              
            }
          }
        }
      } catch (error) {
        
      } finally {
        setInitialized(true);
      }
    };

    const handleAccountsChanged = (accounts: string[]) => {
      // Accounts changed event
      if (accounts.length === 0) {
        // User disconnected their wallet
        setAddress(null);
        setIsConnected(false);
        toast({
          title: "Wallet disconnected",
          description: "Your wallet has been disconnected.",
        });
      } else if (accounts[0] !== address) {
        // User switched accounts
        setAddress(accounts[0]);
        setIsConnected(true);
        toast({
          title: "Account switched",
          description: `Switched to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
      }
    };

    const handleChainChanged = async (chainId: string) => {
      // Network changed event
      
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
      
      // Trigger re-fetch of all queries
      queryClient.invalidateQueries();
    };

    if ((window as any).ethereum) {
      checkConnection();
      
      // Set up event listeners
      (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
      (window as any).ethereum.on('chainChanged', handleChainChanged);
      
      // Cleanup function
      return () => {
        if ((window as any).ethereum?.removeListener) {
          (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
          (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    } else {
      setInitialized(true);
    }
  }, [address, toast]);

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