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
        className="kilt-gradient hover:shadow-lg hover:shadow-kilt-500/25 transition-all duration-300 glass-button font-body"
      >
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="glass-button border-kilt-500/50 hover:border-kilt-500 font-body">
          <Wallet className="mr-2 h-4 w-4" />
          {formatAddress(address!)}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="glass-card border-slate-700">
        <DropdownMenuItem onClick={disconnect} className="text-red-400 hover:text-red-300 font-body">
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
