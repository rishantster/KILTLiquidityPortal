import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi'
import { useEffect } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

// Window focus handler to refresh data
function useWindowFocusHandler() {
  useEffect(() => {
    const handleFocus = () => {
      // Only refetch critical data on window focus
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as string[]
          return key.some(k => 
            typeof k === 'string' && (
              k.includes('/api/kilt-data') ||
              k.includes('/api/rewards/program-analytics')
            )
          )
        }
      })
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  useWindowFocusHandler()
  
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}