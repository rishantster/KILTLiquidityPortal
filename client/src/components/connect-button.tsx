import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useChainId, useSwitchChain } from 'wagmi'
import { base } from 'wagmi/chains'
import { Button } from '@/components/ui/button'

export function WalletConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const isCorrectNetwork = chainId === base.id

  // If not connected, show connect options
  if (!isConnected) {
    return (
      <div className="flex flex-col gap-2">
        {connectors.map((connector) => (
          <Button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-pink-500/25"
          >
            {isPending ? 'Connecting...' : `Connect ${connector.name}`}
          </Button>
        ))}
      </div>
    )
  }

  // If wrong network, show switch network button
  if (!isCorrectNetwork) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={() => switchChain({ chainId: base.id })}
          className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          Switch to Base
        </Button>
        <Button
          onClick={() => disconnect()}
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  // Connected to correct network
  return (
    <div className="flex items-center gap-2">
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-3 py-2 rounded-lg">
        Base Network
      </div>
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium py-2 px-4 rounded-lg">
        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
      </div>
      <Button
        onClick={() => disconnect()}
        variant="outline"
        size="sm"
        className="border-white/20 text-white hover:bg-white/10"
      >
        Disconnect
      </Button>
    </div>
  )
}