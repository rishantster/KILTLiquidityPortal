import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { wagmiConfig } from './lib/wagmi-config';

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">KILT Liquidity Portal</h1>
            <p className="text-gray-400">Simple test version loading successfully</p>
          </div>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  );
}