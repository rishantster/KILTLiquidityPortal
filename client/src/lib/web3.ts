import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { base } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

export const getWalletClient = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return createWalletClient({
      chain: base,
      transport: custom(window.ethereum),
    });
  }
  return null;
};

export const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTokenAmount = (amount: string, decimals: number = 18) => {
  const num = parseFloat(amount) / Math.pow(10, decimals);
  return num.toFixed(4);
};
