import { useState, useEffect } from 'react';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

export interface GasEstimation {
  gasPrice: bigint;
  gasLimit: bigint;
  estimatedCost: string;
  estimatedCostUSD: string;
  gasPriceGwei: string;
  isLoading: boolean;
  error: string | null;
}

export interface TransactionCostEstimate {
  approve: GasEstimation;
  mint: GasEstimation;
  increaseLiquidity: GasEstimation;
  decreaseLiquidity: GasEstimation;
  collect: GasEstimation;
  burn: GasEstimation;
  total: {
    estimatedCost: string;
    estimatedCostUSD: string;
  };
}

// Base network contract addresses
const CONTRACTS = {
  POSITION_MANAGER: '0x03a520b32C04BF3bEEf7BF5d3C2b0F8e0b1e3f7b',
  KILT_TOKEN: '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8',
  WETH_TOKEN: '0x4200000000000000000000000000000000000006',
};

// Estimated gas limits for different operations
const GAS_LIMITS = {
  APPROVE: 50000n,
  MINT: 300000n,
  INCREASE_LIQUIDITY: 200000n,
  DECREASE_LIQUIDITY: 200000n,
  COLLECT: 150000n,
  BURN: 180000n,
};

export function useGasEstimation(ethPrice: number = 2500) {
  const [gasPrice, setGasPrice] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create public client for Base network
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  useEffect(() => {
    const fetchGasPrice = async () => {
      try {
        setIsLoading(true);
        const currentGasPrice = await publicClient.getGasPrice();
        setGasPrice(currentGasPrice);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch gas price:', err);
        setError('Failed to fetch gas price');
        // Fallback to reasonable Base network gas price (0.001 gwei)
        setGasPrice(1000000n);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGasPrice();
    
    // Update gas price every 30 seconds
    const interval = setInterval(fetchGasPrice, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const calculateGasEstimation = (gasLimit: bigint): GasEstimation => {
    const estimatedCost = formatEther(gasPrice * gasLimit);
    const estimatedCostUSD = (parseFloat(estimatedCost) * ethPrice).toFixed(2);
    const gasPriceGwei = formatEther(gasPrice * 1000000000n);

    return {
      gasPrice,
      gasLimit,
      estimatedCost,
      estimatedCostUSD,
      gasPriceGwei,
      isLoading,
      error,
    };
  };

  const getTransactionCosts = (): TransactionCostEstimate => {
    const approve = calculateGasEstimation(GAS_LIMITS.APPROVE);
    const mint = calculateGasEstimation(GAS_LIMITS.MINT);
    const increaseLiquidity = calculateGasEstimation(GAS_LIMITS.INCREASE_LIQUIDITY);
    const decreaseLiquidity = calculateGasEstimation(GAS_LIMITS.DECREASE_LIQUIDITY);
    const collect = calculateGasEstimation(GAS_LIMITS.COLLECT);
    const burn = calculateGasEstimation(GAS_LIMITS.BURN);

    // Calculate total for approve + mint (most common flow)
    const totalCost = parseFloat(approve.estimatedCost) + parseFloat(mint.estimatedCost);
    const totalCostUSD = (totalCost * ethPrice).toFixed(2);

    return {
      approve,
      mint,
      increaseLiquidity,
      decreaseLiquidity,
      collect,
      burn,
      total: {
        estimatedCost: totalCost.toFixed(6),
        estimatedCostUSD: totalCostUSD,
      },
    };
  };

  const estimateCustomTransaction = async (
    to: string,
    data: string,
    value: bigint = 0n
  ): Promise<GasEstimation> => {
    try {
      const gasLimit = await publicClient.estimateGas({
        to: to as `0x${string}`,
        data: data as `0x${string}`,
        value,
      });

      return calculateGasEstimation(gasLimit);
    } catch (err) {
      console.error('Failed to estimate gas:', err);
      return {
        gasPrice,
        gasLimit: 0n,
        estimatedCost: '0',
        estimatedCostUSD: '0',
        gasPriceGwei: formatEther(gasPrice * 1000000000n),
        isLoading: false,
        error: 'Failed to estimate gas',
      };
    }
  };

  return {
    gasPrice,
    isLoading,
    error,
    getTransactionCosts,
    estimateCustomTransaction,
    calculateGasEstimation,
  };
}