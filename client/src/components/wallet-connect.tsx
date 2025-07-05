import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { formatAddress } from '@/lib/web3';
import { Wallet, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WalletConnect() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  if (!isConnected) {
    return (
      <Button 
        onClick={connect} 
        disabled={isConnecting}
        className="cluely-primary rounded-lg px-4 py-2 font-medium"
      >
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="cluely-button border-white/10 hover:border-white/20 font-medium rounded-lg">
          <Wallet className="mr-2 h-4 w-4" />
          {formatAddress(address!)}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="cluely-card border-white/10">
        <DropdownMenuItem onClick={disconnect} className="text-red-400 hover:text-red-300 font-body">
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
