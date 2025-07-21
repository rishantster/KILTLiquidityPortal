import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useWalletWagmi } from '@/hooks/use-wallet-wagmi'
import { base } from 'wagmi/chains'

export function NetworkSwitchBanner() {
  const { isConnected, chainId, isCorrectNetwork, networkName, switchToBase, isSwitchingChain } = useWalletWagmi()

  // Don't show banner if not connected or already on correct network
  if (!isConnected || isCorrectNetwork) {
    return null
  }

  const currentNetworkDisplay = chainId === 1 
    ? 'Ethereum Mainnet' 
    : chainId 
    ? `${networkName} (${chainId})`
    : 'Unknown Network'

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert className="max-w-4xl mx-auto border-amber-500/50 bg-amber-500/10 backdrop-blur-sm">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <AlertDescription className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="text-amber-200">
              <strong>Wrong Network:</strong> You're connected to
            </span>
            <Badge variant="destructive" className="bg-red-500/20 text-red-300 border-red-500/30">
              {currentNetworkDisplay}
            </Badge>
            <span className="text-amber-200">but this app requires</span>
            <Badge variant="default" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              Base Mainnet
            </Badge>
          </div>
          <Button 
            onClick={switchToBase}
            disabled={isSwitchingChain}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white border-0 ml-4"
          >
            {isSwitchingChain ? (
              <>
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                Switching...
              </>
            ) : (
              <>
                Switch to Base
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}