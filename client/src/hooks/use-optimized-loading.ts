import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/contexts/wallet-context';

interface OptimizedData {
  kiltData: any;
  balances: any;
  positions: any;
  rewards: any;
  poolData: any;
}

/**
 * Optimized loading hook that batches API calls and implements progressive loading
 * Only loads essential data first, then loads secondary data
 */
export function useOptimizedLoading() {
  const { address, isConnected } = useWallet();
  const [isLoading, setIsLoading] = useState(true);
  const [essentialData, setEssentialData] = useState<Partial<OptimizedData>>({});
  const [secondaryData, setSecondaryData] = useState<Partial<OptimizedData>>({});

  // Load essential data first (needed for immediate display)
  const loadEssentialData = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      const essentialRequests = [
        fetch('/api/kilt-data'),
        fetch('/api/rewards/maximum-apr'),
      ];

      const responses = await Promise.all(essentialRequests);
      const [kiltData, aprData] = await Promise.all(
        responses.map(r => r.json())
      );

      setEssentialData({
        kiltData,
        rewards: { aprData }
      });
    } catch (error) {
      // Failed to load essential data
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Load secondary data (can be loaded after initial render)
  const loadSecondaryData = useCallback(async () => {
    if (!isConnected || !address) return;
    
    try {
      const secondaryRequests = [
        fetch(`/api/positions/wallet/${address}`),
        fetch(`/api/rewards/user-apr/${address}`),
        fetch('/api/blockchain/config'),
        fetch('/api/pools/0x82Da478b1382B951cBaD01Beb9eD459cDB16458E/info'),
      ];

      const responses = await Promise.all(secondaryRequests);
      const [positions, userApr, blockchainConfig, poolInfo] = await Promise.all(
        responses.map(r => r.json())
      );

      setSecondaryData({
        positions,
        rewards: { userApr },
        poolData: { blockchainConfig, poolInfo }
      });
    } catch (error) {
      // Failed to load secondary data
    }
  }, [isConnected, address]);

  useEffect(() => {
    loadEssentialData();
  }, [loadEssentialData]);

  useEffect(() => {
    // Load secondary data after a short delay to avoid blocking initial render
    const timer = setTimeout(() => {
      loadSecondaryData();
    }, 100);

    return () => clearTimeout(timer);
  }, [loadSecondaryData]);

  return {
    isLoading,
    essentialData,
    secondaryData,
    reload: {
      essential: loadEssentialData,
      secondary: loadSecondaryData
    }
  };
}