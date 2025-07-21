import { createConfig, http, WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { metaMask, walletConnect, injected } from 'wagmi/connectors';
import { ReactNode } from 'react';

// Create Wagmi configuration with modern v2 approach
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    metaMask(),
    injected(),
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
      metadata: {
        name: 'KILT Liquidity Portal',
        description: 'KILT token liquidity incentive program',
        url: window.location.origin,
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    }),
  ],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
});

interface WagmiWalletProviderProps {
  children: ReactNode;
}

export function WagmiWalletProvider({ children }: WagmiWalletProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      {children}
    </WagmiProvider>
  );
}

export { wagmiConfig };