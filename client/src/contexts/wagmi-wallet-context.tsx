import { createConfig, http, WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { metaMask, walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';
import { ReactNode } from 'react';

// Enhanced Wagmi configuration with mobile deep linking support
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // MetaMask with mobile detection
    metaMask({
      dappMetadata: {
        name: 'KILT Liquidity Portal',
        url: window.location.origin
      }
    }),
    // Coinbase Wallet with mobile support
    coinbaseWallet({
      appName: 'KILT Liquidity Portal',
      appLogoUrl: 'https://avatars.githubusercontent.com/u/37784886',
      enableMobileWalletLink: true
    }),
    // Enhanced WalletConnect with proper mobile linking
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
      metadata: {
        name: 'KILT Liquidity Portal',
        description: 'KILT token liquidity incentive program',
        url: window.location.origin,
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      },
      showQrModal: true,
      enableExplorer: true
    }),
    // Generic injected for other wallets
    injected(),
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