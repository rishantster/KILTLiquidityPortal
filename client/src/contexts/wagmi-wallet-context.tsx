import { createConfig, http, WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { metaMask, walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';
import { ReactNode } from 'react';

// Create WalletConnect connector with mobile-optimized configuration
const createWalletConnectConnector = () => walletConnect({
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'ce981d1074e2285cb11221be6e7d72ef',
  metadata: {
    name: 'KILT Liquidity Portal',
    description: 'KILT token liquidity incentive program on Base',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://kilt-portal.replit.app',
    icons: ['https://avatars.githubusercontent.com/u/37784886']
  },
  showQrModal: false // Disable the default modal to prevent issues
});

// Enhanced Wagmi configuration optimized for Base chain with mobile deep linking support
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // MetaMask with enhanced mobile detection
    metaMask({
      dappMetadata: {
        name: 'KILT Liquidity Portal',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://kilt-portal.replit.app'
      }
    }),
    // Coinbase Wallet with Base-optimized mobile support
    coinbaseWallet({
      appName: 'KILT Liquidity Portal',
      appLogoUrl: 'https://avatars.githubusercontent.com/u/37784886',
      enableMobileWalletLink: true
    }),
    // WalletConnect with mobile support
    createWalletConnectConnector(),
    // Binance Wallet via injected provider (only if detected)
    injected({
      shimDisconnect: true,
      target() {
        return {
          id: 'binance',
          name: 'Binance Wallet',
          provider: typeof window !== 'undefined' && window.ethereum?.isBinance ? window.ethereum : undefined
        };
      }
    })
  ],
  // Disable auto-reconnection to prevent unwanted wallet connections
  ssr: false,
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