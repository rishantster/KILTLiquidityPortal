import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Smartphone, Wallet } from 'lucide-react';

interface RainbowConnectButtonProps {
  className?: string;
}

export function RainbowConnectButton({ className = "" }: RainbowConnectButtonProps) {
  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  return (
    <div className={`${className}`}>
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
          // Prevent hydration errors
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
                    <div className="space-y-6">
                      <div className="text-center mb-6">
                        <h3 className="text-white text-xl font-bold mb-2">Connect Your Wallet</h3>
                        <p className="text-gray-400 text-sm">Choose your preferred wallet to get started</p>
                      </div>

                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="w-full bg-gradient-to-r from-[#ff0066] to-[#cc0052] hover:from-[#ff3385] hover:to-[#ff0066] text-white border-0 h-16 text-lg font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-4"
                      >
                        <div className="flex items-center gap-3">
                          {isMobile ? (
                            <Smartphone className="h-6 w-6" />
                          ) : (
                            <Wallet className="h-6 w-6" />
                          )}
                          <span>Connect Wallet</span>
                        </div>
                      </button>

                      {isMobile && (
                        <div className="bg-gradient-to-r from-[#ff0066]/10 to-[#cc0052]/10 p-4 rounded-lg border border-[#ff0066]/20">
                          <h4 className="text-[#ff0066] font-medium mb-2 flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Mobile Optimized:
                          </h4>
                          <ul className="text-gray-300 text-sm space-y-1">
                            <li>• Supports all major mobile wallets</li>
                            <li>• One-tap connection with deep links</li>
                            <li>• Secure WalletConnect v2 integration</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-900/50 to-red-800/50 rounded-xl border border-red-500/20">
                        <div className="flex-1">
                          <div className="text-red-400 font-medium">Wrong Network</div>
                          <div className="text-red-300 text-sm">Switch to Base network</div>
                        </div>
                        <button
                          onClick={openChainModal}
                          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                          Switch Network
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl border border-[#ff0066]/20">
                      <Wallet className="h-6 w-6 text-[#ff0066]" />
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {account.displayName}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {account.displayBalance}
                        </div>
                      </div>
                      <button
                        onClick={openAccountModal}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                      >
                        Account
                      </button>
                    </div>
                    
                    {chain && (
                      <div className="flex justify-center">
                        <button
                          onClick={openChainModal}
                          className="flex items-center gap-2 px-3 py-1 bg-[#ff0066]/10 hover:bg-[#ff0066]/20 text-[#ff0066] rounded-lg text-sm font-medium transition-colors"
                        >
                          {chain.hasIcon && (
                            <div className="w-4 h-4 rounded-full overflow-hidden">
                              {chain.iconUrl && (
                                <img
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  className="w-4 h-4"
                                />
                              )}
                            </div>
                          )}
                          {chain.name}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}