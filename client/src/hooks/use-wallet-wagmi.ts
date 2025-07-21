import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useConnectors, useSwitchChain } from 'wagmi'
import { base } from 'wagmi/chains'
import { useMemo, useState } from 'react'

export function useWalletWagmi() {
  const { address, isConnected, isConnecting, isDisconnected, connector, status } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect } = useConnect()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
  const connectors = useConnectors()
  const chainId = useChainId()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
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
      networkName: chainId === base.id ? 'Base' : (chainId === 1 ? 'Ethereum' : `Chain ${chainId}`),
      isSwitchingChain,
      
      // Balance state
      kiltBalance: kiltBalance?.value || 0n,
      kiltBalanceFormatted: kiltBalance?.formatted || '0',
      kiltBalanceLoading: kiltLoading,
      
      ethBalance: ethBalance?.value || 0n,
      ethBalanceFormatted: ethBalance?.formatted || '0',
      ethBalanceLoading: ethLoading,
      
      // Modal state
      isModalOpen,
      setIsModalOpen,
      
      // Available connectors
      connectors,
      
      // Actions
      connect: (connectorId?: string) => {
        const targetConnector = connectorId 
          ? connectors.find(c => c.id === connectorId) 
          : connectors.find(c => c.type === 'injected') || connectors[0]
        
        if (targetConnector) {
          connect({ connector: targetConnector })
        }
        setIsModalOpen(false)
      },
      
      disconnect: () => {
        disconnect()
        setIsModalOpen(false)
      },
      
      switchToBase: () => {
        if (switchChain) {
          switchChain({ chainId: base.id })
        }
      },
      
      openConnectModal: () => setIsModalOpen(true),
      closeModal: () => setIsModalOpen(false),
      
      // Helper computed values
      hasKiltBalance: kiltBalance ? kiltBalance.value > 0n : false,
      hasEthBalance: ethBalance ? ethBalance.value > 0n : false,
      
      // Loading states
      isLoading: isConnecting || kiltLoading || ethLoading || isSwitchingChain,
    }
  }, [
    address, isConnected, isConnecting, isDisconnected, status, connector,
    chainId, kiltBalance, ethBalance, kiltLoading, ethLoading, isSwitchingChain,
    connectors, connect, disconnect, switchChain, isModalOpen
  ])

  return walletState
}

// Type for the wallet state
export type WalletState = ReturnType<typeof useWalletWagmi>