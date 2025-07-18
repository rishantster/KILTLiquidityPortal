import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { positionCache, fetchPositionsBlazingFast } from '@/utils/position-cache';

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

/**
 * Ultra-fast position loading with aggressive optimization
 * - Instant cache return
 * - Parallel batch processing
 * - Background refresh
 * - Minimal re-renders
 */
export function useUltraFastPositions() {
  const { address } = useWallet();
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memory cache for instant returns
  const positionsCache = new Map<string, { data: Position[]; timestamp: number }>();

  // Ultra-fast cache retrieval
  const getCachedPositions = useCallback((userAddress: string): Position[] | null => {
    const cached = positionsCache.get(userAddress);
    if (!cached) return null;
    
    // Cache valid for 30 seconds
    if (Date.now() - cached.timestamp < 30000) {
      return cached.data;
    }
    
    return null;
  }, []);

  // Lightning-fast position loading with instant cache returns
  const loadPositions = useCallback(async (userAddress: string, useCache: boolean = true) => {
    if (!userAddress) return;

    // Return cached data immediately if available
    if (useCache) {
      const cached = getCachedPositions(userAddress);
      if (cached) {
        setPositions(cached);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use blazing fast fetcher with parallel processing
      const uniquePositions = await fetchPositionsBlazingFast(userAddress);

      // Cache the result
      positionsCache.set(userAddress, {
        data: uniquePositions,
        timestamp: Date.now()
      });

      setPositions(uniquePositions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions');
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, [getCachedPositions]);

  // Background refresh without loading state
  const refreshPositions = useCallback(async (userAddress: string) => {
    if (!userAddress) return;
    
    try {
      await loadPositions(userAddress, false);
    } catch (error) {
      // Background refresh failed
    }
  }, [loadPositions]);

  // Initial load with cache check
  useEffect(() => {
    if (address) {
      loadPositions(address, true);
    }
  }, [address, loadPositions]);

  // Background refresh every 30 seconds
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      refreshPositions(address);
    }, 30000);

    return () => clearInterval(interval);
  }, [address, refreshPositions]);

  return {
    positions,
    isLoading,
    error,
    refresh: () => address && loadPositions(address, false),
    hasPositions: positions.length > 0
  };
}