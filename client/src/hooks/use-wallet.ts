import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Global state to ensure consistency across all hook instances
let globalWalletState = {
  address: null as string | null,
  isConnected: false,
  initialized: false,
};

export function useWallet() {
  const [address, setAddress] = useState<string | null>(globalWalletState.address);
  const [isConnected, setIsConnected] = useState(globalWalletState.isConnected);
  const [isConnecting, setIsConnecting] = useState(false);
  const [initialized, setInitialized] = useState(globalWalletState.initialized);
  const { toast } = useToast();

  // Helper function to update both local and global state
  const updateWalletState = (newAddress: string | null, newIsConnected: boolean, newInitialized: boolean = true) => {
    globalWalletState = { address: newAddress, isConnected: newIsConnected, initialized: newInitialized };
    setAddress(newAddress);
    setIsConnected(newIsConnected);
    setInitialized(newInitialized);
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

        if (accounts && accounts.length > 0) {
          updateWalletState(accounts[0], true);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      } finally {
        setInitialized(true);
      }
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        updateWalletState(null, false);
        toast({
          title: "Wallet disconnected",
          description: "Your wallet has been disconnected.",
        });
      } else if (accounts[0] !== address) {
        // User switched accounts
        updateWalletState(accounts[0], true);
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
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org'],
          }],
        });
      }
    }
  };

  const connect = async () => {
    if (!(window as any).ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or another Ethereum wallet.",
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
        updateWalletState(connectedAddress, true);
        
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
    // Clear both local and global state immediately
    updateWalletState(null, false);
    
    // Show toast notification
    toast({
      title: "Wallet disconnected",
      description: "Successfully disconnected from your wallet.",
    });
    
    // Force component re-render by updating all dependent components
    console.log('Wallet disconnected - State updated:', { address: null, isConnected: false });
  };

  return {
    address,
    isConnected,
    isConnecting,
    initialized,
    connect,
    disconnect,
  };
}