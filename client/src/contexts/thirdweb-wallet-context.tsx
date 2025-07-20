import { createContext, useContext, useEffect, useState } from 'react';
import { useActiveAccount, useActiveWallet } from 'thirdweb/react';
import { useWallet } from './wallet-context';
import { useLocation } from 'wouter';

interface ThirdwebWalletContextType {
  thirdwebAddress: string | null;
  thirdwebWallet: any | null;
  isThirdwebConnected: boolean;
  connectionMode: 'legacy' | 'thirdweb' | 'none';
}

const ThirdwebWalletContext = createContext<ThirdwebWalletContextType>({
  thirdwebAddress: null,
  thirdwebWallet: null,
  isThirdwebConnected: false,
  connectionMode: 'none',
});

export function ThirdwebWalletProvider({ children }: { children: React.ReactNode }) {
  const [thirdwebAddress, setThirdwebAddress] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'legacy' | 'thirdweb' | 'none'>('none');
  const [, setLocation] = useLocation();
  
  // Thirdweb hooks
  const activeAccount = useActiveAccount();
  const activeWallet = useActiveWallet();
  
  // Legacy wallet context
  const { address: legacyAddress, isConnected: legacyConnected } = useWallet();

  // Update Thirdweb address and handle navigation
  useEffect(() => {
    if (activeAccount?.address) {
      setThirdwebAddress(activeAccount.address);
      setConnectionMode('thirdweb');
      console.log('Thirdweb wallet connected:', activeAccount.address);
      
      // Navigate to dashboard after successful connection
      setLocation('/dashboard');
    } else if (!activeAccount && thirdwebAddress) {
      setThirdwebAddress(null);
      // Only change mode if legacy isn't connected
      if (!legacyConnected) {
        setConnectionMode('none');
      }
      console.log('Thirdweb wallet disconnected');
    }
  }, [activeAccount, thirdwebAddress, legacyConnected, setLocation]);

  // Update connection mode based on which system is active
  useEffect(() => {
    if (thirdwebAddress) {
      setConnectionMode('thirdweb');
    } else if (legacyConnected && legacyAddress) {
      setConnectionMode('legacy');
    } else {
      setConnectionMode('none');
    }
  }, [thirdwebAddress, legacyConnected, legacyAddress]);

  const value = {
    thirdwebAddress,
    thirdwebWallet: activeWallet,
    isThirdwebConnected: !!thirdwebAddress,
    connectionMode,
  };

  return (
    <ThirdwebWalletContext.Provider value={value}>
      {children}
    </ThirdwebWalletContext.Provider>
  );
}

export function useThirdwebWallet() {
  const context = useContext(ThirdwebWalletContext);
  if (!context) {
    throw new Error('useThirdwebWallet must be used within ThirdwebWalletProvider');
  }
  return context;
}

// Unified hook that returns the currently active wallet (Thirdweb or legacy)
export function useUnifiedWallet() {
  const thirdweb = useThirdwebWallet();
  const legacy = useWallet();
  
  const currentAddress = thirdweb.thirdwebAddress || legacy.address;
  const isConnected = thirdweb.isThirdwebConnected || legacy.isConnected;
  
  return {
    address: currentAddress,
    isConnected,
    connectionMode: thirdweb.connectionMode,
    thirdwebWallet: thirdweb.thirdwebWallet,
    legacyWallet: legacy,
  };
}