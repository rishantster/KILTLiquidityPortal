import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

export function RainbowConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Loading state
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button
                    onClick={openConnectModal}
                    className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-14 text-lg font-medium justify-start px-6 rounded-lg transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-red-500 to-yellow-500 flex items-center justify-center text-xs">
                        🌈
                      </div>
                      <span className="font-medium">RainbowKit (Enhanced)</span>
                    </div>
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button
                    onClick={openChainModal}
                    variant="destructive"
                    className="w-full px-6"
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1 text-xs text-emerald-400">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      {chain.name}
                    </div>
                  </div>
                  <Button
                    onClick={openAccountModal}
                    variant="outline"
                    className="bg-white/5 backdrop-blur-sm border-white/10 text-white hover:bg-white/10 px-4"
                  >
                    <Wallet className="mr-2 h-4 w-4 text-emerald-400" />
                    {account.displayName}
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}