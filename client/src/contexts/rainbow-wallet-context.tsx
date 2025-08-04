import '@rainbow-me/rainbowkit/styles.css';
import { ReactNode } from 'react';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create RainbowKit config with mobile optimization
const config = getDefaultConfig({
  appName: 'KILT Liquidity Portal',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'ce981d1074e2285cb11221be6e7d72ef',
  chains: [base],
  ssr: false,
});

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1_000 * 60 * 60 * 24, // 24 hours
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
      retry: 0,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// Custom KILT theme for RainbowKit
const kiltTheme = darkTheme({
  accentColor: '#ff0066',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

interface RainbowWalletProviderProps {
  children: ReactNode;
}

export function RainbowWalletProvider({ children }: RainbowWalletProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          modalSize="compact" 
          theme={kiltTheme}
          showRecentTransactions={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export { config };