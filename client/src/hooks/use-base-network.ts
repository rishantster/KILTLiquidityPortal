import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export function useBaseNetwork() {
  const chainId = useChainId();
  const { isConnected, address } = useAccount();
  const { switchChain } = useSwitchChain();

  const isOnBase = chainId === base.id;
  const shouldSwitchToBase = isConnected && !isOnBase;

  const switchToBase = async () => {
    try {
      await switchChain({ chainId: base.id });
      toast({
        title: "Switched to Base",
        description: "Successfully switched to Base network",
      });
    } catch (error) {
      console.error('Failed to switch to Base:', error);
      toast({
        title: "Network Switch Failed",
        description: "Please manually switch to Base network in your wallet",
        variant: "destructive",
      });
    }
  };

  // Auto-switch to Base when wallet connects
  useEffect(() => {
    if (shouldSwitchToBase) {
      const timer = setTimeout(() => {
        switchToBase();
      }, 1000); // Give wallet time to settle
      return () => clearTimeout(timer);
    }
  }, [shouldSwitchToBase, address]);

  return {
    isOnBase,
    shouldSwitchToBase,
    switchToBase,
    baseChainId: base.id,
    currentChainId: chainId
  };
}