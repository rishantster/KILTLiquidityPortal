// Uniswap V3 utilities and constants
import { ethers } from 'ethers';

// Uniswap V3 contract addresses on Base
export const UNISWAP_V3_ADDRESSES = {
  FACTORY: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  POSITION_MANAGER: '0x03a520b32C04BF3bEEf7BEb72E919cf82D4C7c848',
  QUOTER: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  ROUTER: '0x2626664c2603336E57B271c5C0b26F421741e481'
};

// Common token addresses on Base
export const BASE_TOKENS = {
  WETH: '0x4200000000000000000000000000000000000006',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  KILT: '0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8', // KILT token address on Base
  ETH: '0x0000000000000000000000000000000000000000' // Native ETH placeholder
};

// Export alias for backward compatibility
export const TOKENS = BASE_TOKENS;

// Fee tiers
export const FEE_TIERS = {
  LOWEST: 100,   // 0.01%
  LOW: 500,      // 0.05%
  MEDIUM: 3000,  // 0.3%
  HIGH: 10000    // 1%
};

// Pool configuration for KILT/ETH
export const KILT_ETH_POOL = {
  token0: BASE_TOKENS.KILT,
  token1: BASE_TOKENS.WETH,
  fee: FEE_TIERS.MEDIUM,
  address: '' // Will be computed dynamically
};

// Utility functions
export function getPoolAddress(token0: string, token1: string, fee: number): string {
  // This would normally compute the pool address using the factory
  // For now, return a placeholder that matches the expected format
  // Use a simplified approach for pool address generation
  return `0x${token0.slice(2)}${token1.slice(2)}${fee.toString(16)}`.slice(0, 42);
}

export function formatTokenAmount(amount: string, decimals: number = 18): string {
  try {
    // Simple formatting without ethers utils
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const formatted = Number(value) / Number(divisor);
    return formatted.toFixed(6);
  } catch {
    return '0.000000';
  }
}

export function parseTokenAmount(amount: string, decimals: number = 18): string {
  try {
    // Simple parsing without ethers utils
    const value = parseFloat(amount);
    const multiplier = BigInt(10 ** decimals);
    return (BigInt(Math.floor(value * Number(multiplier))) / BigInt(1)).toString();
  } catch {
    return '0';
  }
}

// Price utilities
export function calculatePrice(amount0: string, amount1: string, decimals0: number = 18, decimals1: number = 18): number {
  try {
    // Simple price calculation without ethers utils
    const amt0 = Number(BigInt(amount0)) / Number(BigInt(10 ** decimals0));
    const amt1 = Number(BigInt(amount1)) / Number(BigInt(10 ** decimals1));
    
    if (amt0 === 0) return 0;
    return amt1 / amt0;
  } catch {
    return 0;
  }
}

export function isValidAddress(address: string): boolean {
  try {
    ethers.utils.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

// Position utilities
export interface PositionData {
  tokenId: string;
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  amount0: string;
  amount1: string;
}

export function isKiltPosition(position: PositionData): boolean {
  const kiltAddress = BASE_TOKENS.KILT.toLowerCase();
  return position.token0.toLowerCase() === kiltAddress || 
         position.token1.toLowerCase() === kiltAddress;
}

export function calculatePositionValue(position: PositionData, ethPrice: number = 0): number {
  try {
    const amount0 = parseFloat(formatTokenAmount(position.amount0));
    const amount1 = parseFloat(formatTokenAmount(position.amount1));
    
    // Assuming token1 is WETH, token0 is KILT
    // This is a simplified calculation
    return (amount0 * 0.1) + (amount1 * ethPrice); // Placeholder KILT price
  } catch {
    return 0;
  }
}