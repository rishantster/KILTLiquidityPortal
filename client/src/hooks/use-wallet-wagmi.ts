import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { base } from 'wagmi/chains'
import { useMemo } from 'react'

export function useWalletWagmi() {
  const { address, isConnected, isConnecting, isDisconnected, connector, status } = useAccount()
  const { disconnect } = useDisconnect()
  const { open, close } = useWeb3Modal()
  const chainId = useChainId()
  
  // Get KILT balance
  const { data: kiltBalance, isLoading: kiltLoading } = useBalance({
    address,
    token: '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8', // KILT token address
    chainId: base.id,
  })
  
  // Get ETH balance
  const { data: ethBalance, isLoading: ethLoading } = useBalance({
    address,
    chainId: base.id,
  })

  const walletState = useMemo(() => {
    return {
      // Connection state
      address: address || null,
      isConnected,
      isConnecting,
      isDisconnected,
      status,
      connector: connector?.name || null,
      
      // Network state
      chainId,
      isCorrectNetwork: chainId === base.id,
      networkName: chainId === base.id ? 'Base' : 'Unknown',
      
      // Balance state
      kiltBalance: kiltBalance?.value || 0n,
      kiltBalanceFormatted: kiltBalance?.formatted || '0',
      kiltBalanceLoading: kiltLoading,
      
      ethBalance: ethBalance?.value || 0n,
      ethBalanceFormatted: ethBalance?.formatted || '0',
      ethBalanceLoading: ethLoading,
      
      // Actions
      connect: () => open(),
      disconnect: () => disconnect(),
      closeModal: () => close(),
      
      // Helper computed values
      hasKiltBalance: kiltBalance ? kiltBalance.value > 0n : false,
      hasEthBalance: ethBalance ? ethBalance.value > 0n : false,
      
      // Loading states
      isLoading: isConnecting || kiltLoading || ethLoading,
    }
  }, [
    address, isConnected, isConnecting, isDisconnected, status, connector,
    chainId, kiltBalance, ethBalance, kiltLoading, ethLoading,
    open, disconnect, close
  ])

  return walletState
}

// Type for the wallet state
export type WalletState = ReturnType<typeof useWalletWagmi>