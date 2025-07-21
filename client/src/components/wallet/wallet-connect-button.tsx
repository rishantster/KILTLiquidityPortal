import { Button } from "@/components/ui/button"
import { useWalletWagmi } from "@/hooks/use-wallet-wagmi"
import { Wallet, LogOut, Loader2 } from "lucide-react"
import { formatEther } from "viem"

export function WalletConnectButton() {
  const { 
    isConnected, 
    address, 
    isConnecting, 
    openConnectModal, 
    disconnect, 
    kiltBalance, 
    ethBalance, 
    isCorrectNetwork,
    networkName
  } = useWalletWagmi()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {/* Network indicator */}
        {!isCorrectNetwork && (
          <div className="px-2 py-1 rounded-md bg-red-500/20 border border-red-500/50 text-red-400 text-xs">
            Wrong Network ({networkName})
          </div>
        )}
        
        {/* Wallet info */}
        <div className="hidden md:flex flex-col items-end text-xs">
          <div className="text-gray-400">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        </div>
        
        {/* Disconnect button */}
        <Button
          onClick={disconnect}
          variant="outline"
          size="sm"
          className="border-gray-700 hover:border-pink-500/50 bg-gray-900/50 hover:bg-pink-900/20"
        >
          <LogOut className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">Disconnect</span>
        </Button>
      </div>
    )
  }

  return (
    <Button
      onClick={openConnectModal}
      disabled={isConnecting}
      className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white border-none"
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </>
      )}
    </Button>
  )
}