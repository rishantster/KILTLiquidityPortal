import { useContext } from 'react';
import { WalletContext } from '@/contexts/wallet-context';
import { useState, useEffect } from 'react';

interface WalletStateManager {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'network_error';
  isConnecting: boolean;
  isConnected: boolean;
  address: string | null;
  lastError: string | null;
  connectWallet: (walletName?: string) => Promise<void>;
  disconnectWallet: () => void;
  clearError: () => void;
}

export function useWalletState(): WalletStateManager {
  const walletContext = useContext(WalletContext);
  if (!walletContext) {
    throw new Error('useWalletState must be used within a WalletProvider');
  }

  const {
    address,
    isConnected,
    isConnecting,
    connectionStatus,
    lastError,
    connect,
    disconnect,
    clearError
  } = walletContext;

  const [isProcessing, setIsProcessing] = useState(false);

  const connectWallet = async (walletName?: string) => {
    try {
      setIsProcessing(true);
      await connect();
    } catch (error) {
      console.error(`Failed to connect wallet ${walletName}:`, error);
      // Error handling is already done in wallet context
    } finally {
      setIsProcessing(false);
    }
  };

  const disconnectWallet = () => {
    try {
      disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  return {
    connectionStatus,
    isConnecting: isConnecting || isProcessing,
    isConnected,
    address,
    lastError,
    connectWallet,
    disconnectWallet,
    clearError
  };
}