import { createConfig, http, WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { metaMask, walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';
import { ReactNode } from 'react';

// Enhanced Wagmi configuration optimized for Base chain with mobile deep linking support
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // Injected first for better wallet detection (includes Binance Wallet)
    injected({ 
      shimDisconnect: true,
      target() {
        return {
          id: 'injected',
          name: 'Injected',
          provider: window.ethereum
        };
      }
    }),
    // MetaMask with enhanced mobile detection
    metaMask({
      dappMetadata: {
        name: 'KILT Liquidity Portal',
        url: window.location.origin
      }
    }),
    // Coinbase Wallet with Base-optimized mobile support
    coinbaseWallet({
      appName: 'KILT Liquidity Portal',
      appLogoUrl: 'https://avatars.githubusercontent.com/u/37784886',
      enableMobileWalletLink: true
    }),
    // Binance Wallet via injected provider
    injected({
      shimDisconnect: true,
      target() {
        return {
          id: 'binance',
          name: 'Binance Wallet',
          provider: window.ethereum?.isBinance ? window.ethereum : undefined
        };
      }
    }),
    // WalletConnect with Base-specific configuration (conditionally enabled)
    ...(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID && 
        import.meta.env.VITE_WALLETCONNECT_PROJECT_ID !== 'demo-project-id' ? [
      walletConnect({
        projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
        metadata: {
          name: 'KILT Liquidity Portal',
          description: 'KILT token liquidity incentive program on Base',
          url: window.location.origin,
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        },
        showQrModal: true
      })
    ] : [])
  ],
  transports: {
    // Base-optimized RPC with batching and retry logic
    [base.id]: http('https://mainnet.base.org', {
      batch: true,
      retryCount: 3,
      retryDelay: 150
    }),
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