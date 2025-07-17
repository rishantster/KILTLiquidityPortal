import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/contexts/wallet-context';

interface Position {
  id: string;
  nftTokenId: string;
  tokenAmountKilt: string;
  tokenAmountEth: string;
  currentValueUsd: number;
  isActive: boolean;
  priceRangeLower: number;
  priceRangeUpper: number;
  feeTier: number;
}

// Global cache for instant access
const positionCache = new Map<string, Position[]>();
const loadingStates = new Map<string, boolean>();

/**
 * Instant position loading with zero delay
 * Returns cached data immediately, updates in background
 */
export function useInstantPositions() {
  const { address } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get positions instantly from cache
  const getInstantPositions = useCallback((userAddress: string): Position[] => {
    return positionCache.get(userAddress) || [];
  }, []);

  // Background loader that doesn't block UI
  const loadInBackground = useCallback(async (userAddress: string) => {
    if (!userAddress || loadingStates.get(userAddress)) return;

    loadingStates.set(userAddress, true);

    try {
      // Ultra-fast parallel fetch
      const [walletResponse, userResponse] = await Promise.all([
        fetch(`/api/positions/wallet/${userAddress}`),
        fetch(`/api/users/${userAddress}`)
      ]);

      const [walletPositions, userData] = await Promise.all([
        walletResponse.json(),
        userResponse.json()
      ]);

      // Get user positions if user exists
      let userPositions: Position[] = [];
      if (userData?.id) {
        const userPositionsResponse = await fetch(`/api/positions/user/${userData.id}`);
        if (userPositionsResponse.ok) {
          userPositions = await userPositionsResponse.json();
        }
      }

      // Combine and dedupe
      const allPositions = [...walletPositions, ...userPositions];
      const uniquePositions = allPositions.filter((pos, index, self) => 
        index === self.findIndex(p => p.nftTokenId === pos.nftTokenId)
      );

      // Update cache
      positionCache.set(userAddress, uniquePositions);
      
      // Update component state
      setPositions(uniquePositions);
      
    } catch (error) {
      console.error('Background position loading failed:', error);
    } finally {
      loadingStates.set(userAddress, false);
    }
  }, []);

  // Initial load - return cached data immediately
  useEffect(() => {
    if (address) {
      // Get cached data instantly
      const cached = getInstantPositions(address);
      setPositions(cached);
      
      // Only show loading if no cache
      if (cached.length === 0) {
        setIsLoading(true);
      }

      // Load in background
      loadInBackground(address).then(() => {
        setIsLoading(false);
      });
    }
  }, [address, getInstantPositions, loadInBackground]);

  return {
    positions,
    isLoading,
    hasPositions: positions.length > 0,
    refresh: () => address && loadInBackground(address)
  };
}

// Preload positions when user connects
export function preloadPositions(address: string) {
  if (!address || positionCache.has(address)) return;

  // Silent background preload
  Promise.all([
    fetch(`/api/positions/wallet/${address}`).then(r => r.json()),
    fetch(`/api/users/${address}`).then(r => r.json())
  ]).then(([walletPositions, userData]) => {
    if (userData?.id) {
      return fetch(`/api/positions/user/${userData.id}`).then(r => r.json()).then(userPositions => {
        const allPositions = [...walletPositions, ...userPositions];
        const uniquePositions = allPositions.filter((pos, index, self) => 
          index === self.findIndex(p => p.nftTokenId === pos.nftTokenId)
        );
        positionCache.set(address, uniquePositions);
      });
    } else {
      positionCache.set(address, walletPositions);
    }
  }).catch(console.error);
}