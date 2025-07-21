import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useWalletWagmi } from "@/hooks/use-wallet-wagmi"
import { Loader2 } from "lucide-react"

export function WagmiConnectModal() {
  const { 
    isModalOpen, 
    closeModal, 
    connect, 
    isConnecting, 
    connectors,
    isConnected 
  } = useWalletWagmi()

  // Close modal if already connected
  if (isConnected && isModalOpen) {
    closeModal()
  }

  const handleConnect = (connectorId: string) => {
    connect(connectorId)
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-md bg-black/90 backdrop-blur-sm border-pink-500/20">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            Connect Wallet
          </DialogTitle>
          <DialogDescription className="text-center text-gray-300">
            Choose your preferred wallet to connect to the KILT Liquidity Portal
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-6">
          {connectors.map((connector) => {
            const isLoading = isConnecting && connector.id === connector.id
            
            return (
              <Button
                key={connector.id}
                onClick={() => handleConnect(connector.id)}
                disabled={isConnecting}
                className="w-full p-4 h-auto bg-gradient-to-r from-gray-800/50 to-gray-700/50 hover:from-pink-900/30 hover:to-purple-900/30 border border-gray-700/50 hover:border-pink-500/50 transition-all duration-200"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    {isLoading && (
                      <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
                    )}
                    <div className="text-left">
                      <div className="font-semibold text-white">
                        {connector.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {connector.type === 'injected' && 'Browser Extension'}
                        {connector.type === 'walletConnect' && 'Mobile & Desktop'}
                      </div>
                    </div>
                  </div>
                  
                  {connector.type === 'injected' && (
                    <div className="text-2xl">🦊</div>
                  )}
                  {connector.type === 'walletConnect' && (
                    <div className="text-2xl">📱</div>
                  )}
                </div>
              </Button>
            )
          })}
        </div>
        
        <div className="text-xs text-gray-500 text-center mt-4">
          By connecting a wallet, you agree to KILT's Terms of Service
        </div>
      </DialogContent>
    </Dialog>
  )
}