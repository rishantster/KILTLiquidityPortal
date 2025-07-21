import { useAccount, useChainId } from 'wagmi'
import { base } from 'wagmi/chains'

export function useWallet() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()

  const isCorrectNetwork = chainId === base.id

  return {
    address,
    isConnected,
    isCorrectNetwork,
    chainId,
    requiredChainId: base.id,
  }
}