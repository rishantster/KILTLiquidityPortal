import { useState, useEffect } from 'react';
import { getWalletClient } from '@/lib/web3';
import { useToast } from '@/hooks/use-toast';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize wallet state and set up event listeners
    const initializeWallet = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        // Set up event listeners
        (window as any).ethereum.on('accountsChanged', handleAccountsChanged);
        (window as any).ethereum.on('chainChanged', handleChainChanged);
        
        // Don't auto-connect - let user explicitly connect
        setInitialized(true);
      } else {
        setInitialized(true);
      }
    };

    initializeWallet();

    return () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        (window as any).ethereum.removeListener('accountsChanged', handleAccountsChanged);
        (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      setAddress(accounts[0]);
      setIsConnected(true);
    } else {
      setAddress(null);
      setIsConnected(false);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const connect = async () => {
    console.log('🚀 Connect function called');
    
    if (!(window as any).ethereum) {
      console.log('❌ No ethereum provider found');
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or another Ethereum wallet.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Ethereum provider found, starting connection...');
    setIsConnecting(true);
    
    try {
      console.log('📞 Requesting accounts...');
      
      // Always request account access - this will show MetaMask popup
      const accounts = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });

      console.log('📋 Received accounts:', accounts);

      if (accounts && accounts.length > 0) {
        const connectedAddress = accounts[0];
        console.log('🔗 Setting connected address:', connectedAddress);
        
        setAddress(connectedAddress);
        setIsConnected(true);
        
        console.log('🌐 Switching to Base network...');
        // Switch to Base network
        await switchToBase();
        
        // Save connection state
        localStorage.setItem('wallet_connected', 'true');
        localStorage.setItem('wallet_address', connectedAddress);
        
        console.log('✅ Connection successful!');
        toast({
          title: "Wallet connected",
          description: "Successfully connected to Base network.",
        });
      } else {
        console.log('❌ No accounts in response');
      }
    } catch (error: any) {
      console.error('❌ Error connecting wallet:', error);
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
      console.log('🏁 Connection process finished');
    }
  };

  const switchToBase = async () => {
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // Base network chain ID
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not added, add it
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

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    
    // Clear saved connection state
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('wallet_address');
    
    // Force page reload to ensure clean state
    window.location.reload();
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
