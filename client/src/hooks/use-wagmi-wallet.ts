import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { base } from 'wagmi/chains';

export function useWagmiWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = async (walletId: string) => {
    const connector = connectors.find(c => c.id === walletId);
    if (connector) {
      try {
        await connect({ connector });
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        throw error;
      }
    }
  };

  return {
    address,
    isConnected,
    isConnecting: isConnecting || isPending,
    connectWallet,
    disconnect,
    connectors,
    chainId: base.id,
  };
}