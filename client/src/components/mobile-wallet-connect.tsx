import React, { useState } from 'react';
import { Wallet, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWagmiWallet } from '@/hooks/use-wagmi-wallet';
import { MobileWalletModal } from './mobile-wallet-modal';

export function MobileWalletConnect() {
  const { address, isConnected, disconnect } = useWagmiWallet();
  const [showModal, setShowModal] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <Button
        onClick={disconnect}
        className="mobile-button mobile-touch-target bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white border-0 px-3 sm:px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
          <span className="hidden sm:inline">Connected:</span>
          <span className="font-mono">{formatAddress(address)}</span>
        </div>
      </Button>
    );
  }

  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className="mobile-button mobile-touch-target bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white border-0 px-3 sm:px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Wallet</span>
          <span className="sm:hidden">Connect</span>
          <ChevronDown className="h-3 w-3" />
        </div>
      </Button>

      <MobileWalletModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
}