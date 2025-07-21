import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Wallet, AlertTriangle, Loader2, ChevronDown, RefreshCw, Monitor } from 'lucide-react';
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
        <DialogContent className="bg-black/95 backdrop-blur-xl border-2 border-pink-500/30 shadow-2xl shadow-pink-500/20 max-w-md rounded-2xl overflow-hidden relative">
          {/* Cyberpunk background grid effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(236,72,153,0.03),transparent_70%)] pointer-events-none" />
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-white text-2xl font-bold flex items-center gap-3 mb-6 drop-shadow-lg">
              <div className="relative">
                <Wallet className="h-6 w-6 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                <div className="absolute inset-0 h-6 w-6 bg-pink-500/20 blur-sm rounded-full" />
              </div>
              <span className="bg-gradient-to-r from-white to-pink-200 bg-clip-text text-transparent">
                Connect Your Wallet
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3 text-gray-400 mb-6">
              <div className="relative">
                <Monitor className="h-4 w-4 drop-shadow-[0_0_4px_rgba(236,72,153,0.6)]" />
                <div className="absolute inset-0 h-4 w-4 bg-pink-500/10 blur-sm rounded-full" />
              </div>
              <span className="text-sm font-medium tracking-wider uppercase">Available Wallets</span>
            </div>
            
            {connectors.map((connector, index) => (
              <Button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 text-white border-0 h-16 text-lg font-bold justify-start px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/25 relative overflow-hidden group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Animated background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600/0 via-pink-400/20 to-pink-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                {isPending ? (
                  <>
                    <Loader2 className="mr-4 h-5 w-5 animate-spin drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
                    <span className="tracking-wide">Connecting...</span>
                  </>
                ) : (
                  <>
                    <div className="relative mr-4">
                      <Wallet className="h-5 w-5 drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
                      <div className="absolute inset-0 h-5 w-5 bg-white/20 blur-sm rounded-full" />
                    </div>
                    <span className="tracking-wide font-bold">{connector.name}</span>
                  </>
                )}
              </Button>
            ))}
          </div>

          <div className="text-sm text-gray-400 text-center mt-8 relative z-10 font-medium tracking-wide">
            <span className="bg-gradient-to-r from-gray-400 to-gray-300 bg-clip-text text-transparent">
              By connecting, you agree to the Terms of Service and Privacy Policy
            </span>
          </div>
          
          {/* Cyberpunk corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-pink-500/50" />
          <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-pink-500/50" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-pink-500/50" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-pink-500/50" />
        </DialogContent>
      </Dialog>
    </>
  );
}