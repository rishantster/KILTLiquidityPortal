import { useAccount, useChainId, useAccountEffect } from 'wagmi'
import { base } from 'wagmi/chains'
import { useEffect } from 'react'
import { queryClient } from '@/lib/queryClient'

export function useWallet() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const chainId = useChainId()

  const isCorrectNetwork = chainId === base.id

  // Listen for account changes and invalidate all queries when account changes
  useAccountEffect({
    onConnect(data) {
      console.log('✅ Wallet connected:', data.address)
      // Invalidate all queries when a new wallet connects
      queryClient.invalidateQueries()
    },
    onDisconnect() {
      console.log('❌ Wallet disconnected')
      // Clear all queries when wallet disconnects
      queryClient.clear()
    },
  })

  // Additional effect to handle account changes
  useEffect(() => {
    if (address) {
      console.log('🔄 Wallet address changed to:', address)
      // Invalidate all user-specific queries when address changes
      setTimeout(() => {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as string[]
            return key.some(k => 
              typeof k === 'string' && (
                k.includes('/api/users/') ||
                k.includes('/api/positions/') ||
                k.includes('/api/rewards/') ||
                k.includes('user-') ||
                k.includes(address.toLowerCase())
              )
            )
          }
        })
      }, 100) // Small delay to avoid hook order issues
    }
  }, [address])

  return {
    address,
    isConnected,
    isConnecting,
    isReconnecting,
    isCorrectNetwork,
    chainId,
    requiredChainId: base.id,
  }
}