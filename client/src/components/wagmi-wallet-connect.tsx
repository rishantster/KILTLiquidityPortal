import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Wallet, AlertTriangle, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { base } from 'wagmi/chains';



export function WagmiWalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [showModal, setShowModal] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = (connector: any) => {
    connect({ connector });
    setShowModal(false);
  };

  const handleSwitchAccount = async () => {
    setIsSwitchingAccount(true);
    try {
      // Use wallet_requestPermissions to force account selection dialog
      if ((window as any).ethereum) {
        await (window as any).ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (error) {
      console.error('Account switch error:', error);
    } finally {
      setIsSwitchingAccount(false);
    }
  };

  const isWrongNetwork = chainId !== base.id;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {isWrongNetwork && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-semibold">Wrong Network</span>
            </div>
            <Button
              onClick={() => switchChain({ chainId: base.id })}
              className="bg-red-600 hover:bg-red-500 text-white text-xs h-6 px-2"
            >
              Switch to Base
            </Button>
          </div>
        )}

        {!isWrongNetwork && (
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Base Network
          </Badge>
        )}

        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2">
          <Wallet className="h-4 w-4 text-emerald-400" />
          <span className="font-mono text-sm">{formatAddress(address)}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-6 px-2 text-xs hover:bg-white/10 hover:text-white"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black/90 backdrop-blur-md border border-white/10 text-white">
              <DropdownMenuItem 
                onClick={handleSwitchAccount}
                disabled={isSwitchingAccount}
                className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                {isSwitchingAccount ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Switch Account
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={() => {
                  disconnect();
                  setShowModal(true);
                }}
                className="hover:bg-blue-500/20 focus:bg-blue-500/20 hover:text-blue-400 focus:text-blue-400 cursor-pointer"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Switch Wallet
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => disconnect()}
                className="hover:bg-red-500/20 focus:bg-red-500/20 hover:text-red-400 focus:text-red-400 cursor-pointer"
              >
                <Wallet className="mr-2 h-3 w-3" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        disabled={isPending}
        className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-black/90 backdrop-blur-md border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Connect Wallet
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {connectors.map((connector) => (
              <Button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white justify-start h-12"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-3 h-5 w-5" />
                    {connector.name}
                  </>
                )}
              </Button>
            ))}
          </div>

          <div className="text-xs text-gray-400 text-center mt-4">
            By connecting, you agree to the Terms of Service and Privacy Policy
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}