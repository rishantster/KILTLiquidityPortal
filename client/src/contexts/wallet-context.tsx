import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  initialized: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);
  const { toast } = useToast();

  // Switch to Base network
  const switchToBase = async () => {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // Base network
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added, add it
        await (window as any).ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x2105',
            chainName: 'Base',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          }],
        });
      }
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
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      } finally {
        setInitialized(true);
      }
    };

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('Accounts changed:', accounts);
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

    const handleChainChanged = () => {
      // Reload the page when chain changes to avoid state issues
      window.location.reload();
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
        title: "MetaMask not found",
        description: "Please install MetaMask to connect your wallet.",
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
        
        await switchToBase();
        
        toast({
          title: "Wallet connected",
          description: "Successfully connected to Base network.",
        });
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        toast({
          title: "Connection rejected",
          description: "Please approve the connection request in your wallet.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Connection failed",
          description: error.message || "Failed to connect wallet.",
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
    
    console.log('Wallet disconnected - Context state updated:', { address: null, isConnected: false });
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