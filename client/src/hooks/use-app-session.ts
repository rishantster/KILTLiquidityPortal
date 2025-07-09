import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AppSessionData {
  sessionId: string;
  message: string;
  expiresIn: string;
}

interface TransactionRecordData {
  success: boolean;
  transactionId?: number;
  message: string;
  status: string;
}

export function useAppSession() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);
  
  // Check if session is expired
  const isSessionExpired = useCallback(() => {
    if (!sessionExpiry) return true;
    return new Date() > sessionExpiry;
  }, [sessionExpiry]);

  // Create app session for transaction tracking
  const createAppSession = useCallback(async (userId: number): Promise<string | null> => {
    if (!address || !isConnected) {
      console.error('Cannot create app session: wallet not connected');
      return null;
    }

    try {
      setIsCreatingSession(true);
      
      const response = await apiRequest<AppSessionData>('/api/app-sessions/create', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          userAddress: address,
        }),
      });

      if (response.sessionId) {
        setSessionId(response.sessionId);
        // Set expiry to 24 hours from now
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        setSessionExpiry(expiry);
        
        console.log('App session created successfully:', response.sessionId);
        return response.sessionId;
      }

      return null;
    } catch (error) {
      console.error('Failed to create app session:', error);
      toast({
        title: 'Session Creation Failed',
        description: 'Failed to create secure app session. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsCreatingSession(false);
    }
  }, [address, isConnected, toast]);

  // Record transaction for reward eligibility
  const recordAppTransaction = useCallback(async (transactionData: {
    userId: number;
    userAddress: string;
    transactionHash: string;
    transactionType: 'mint' | 'increase' | 'decrease' | 'collect' | 'burn';
    nftTokenId?: string;
    poolAddress: string;
    amount0?: number;
    amount1?: number;
    liquidityAmount?: number;
    gasUsed?: number;
    gasPrice?: number;
    blockNumber?: number;
  }): Promise<TransactionRecordData | null> => {
    if (!sessionId || isSessionExpired()) {
      console.error('Cannot record transaction: no valid session');
      toast({
        title: 'Session Expired',
        description: 'Please reconnect your wallet to continue.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const response = await apiRequest<TransactionRecordData>('/api/app-transactions/record', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          transactionData,
        }),
      });

      if (response.success) {
        console.log('Transaction recorded successfully:', response.transactionId);
        return response;
      }

      console.error('Failed to record transaction:', response);
      return null;
    } catch (error) {
      console.error('Error recording transaction:', error);
      toast({
        title: 'Transaction Recording Failed',
        description: 'Failed to record transaction for rewards. Position may not be eligible.',
        variant: 'destructive',
      });
      return null;
    }
  }, [sessionId, isSessionExpired, toast]);

  // Get current session status
  const getSessionStatus = useCallback(() => {
    return {
      hasSession: !!sessionId,
      isExpired: isSessionExpired(),
      expiresAt: sessionExpiry,
      sessionId,
    };
  }, [sessionId, isSessionExpired, sessionExpiry]);

  // Clear session
  const clearSession = useCallback(() => {
    setSessionId(null);
    setSessionExpiry(null);
  }, []);

  // Auto-clear session when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      clearSession();
    }
  }, [isConnected, clearSession]);

  return {
    sessionId,
    isCreatingSession,
    sessionExpiry,
    createAppSession,
    recordAppTransaction,
    getSessionStatus,
    clearSession,
    isSessionExpired: isSessionExpired(),
  };
}