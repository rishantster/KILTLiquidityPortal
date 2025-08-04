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
                  <div className="flex items-center gap-3">
                    {/* Base Network Badge - Cyberpunk Glassmorphism */}
                    {chain && !chain.unsupported && (
                      <div className="relative group">
                        {/* Cyberpunk glow layers */}
                        <div className="absolute inset-0 bg-cyan-400/20 rounded-lg blur-md animate-pulse"></div>
                        <div className="absolute inset-0 bg-blue-500/10 rounded-lg blur-sm"></div>
                        
                        <div className="relative flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-cyan-400/30 rounded-lg px-3 py-1.5 shadow-lg shadow-cyan-400/10">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-sm shadow-cyan-400/80"></div>
                          <span className="text-cyan-400 text-sm font-medium font-mono tracking-wide">Base</span>
                          
                          {/* Scanning line effect */}
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent animate-pulse"></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Wallet Address Section - Cyberpunk Glassmorphism */}
                    <div className="relative group">
                      {/* Cyberpunk outer glow */}
                      <div className="absolute inset-0 bg-matrix-green/20 rounded-xl blur-lg animate-pulse opacity-70"></div>
                      <div className="absolute inset-0 bg-[#ff0066]/10 rounded-xl blur-md"></div>
                      
                      <div className="relative flex items-center gap-3 bg-black/70 backdrop-blur-xl border border-matrix-green/30 rounded-xl px-4 py-2 shadow-2xl shadow-matrix-green/20 hover:border-matrix-green/50 transition-all duration-300">
                        <div className="flex items-center gap-2">
                          {/* Cyberpunk wallet icon container */}
                          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-matrix-green/30 to-matrix-green/10 border border-matrix-green/40 flex items-center justify-center overflow-hidden">
                            {/* Inner glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-matrix-green/20 to-transparent animate-pulse"></div>
                            <Wallet className="relative h-4 w-4 text-matrix-green drop-shadow-lg" />
                            
                            {/* Corner accent lines */}
                            <div className="absolute top-0 left-0 w-2 h-0.5 bg-matrix-green/80"></div>
                            <div className="absolute top-0 left-0 w-0.5 h-2 bg-matrix-green/80"></div>
                            <div className="absolute bottom-0 right-0 w-2 h-0.5 bg-matrix-green/80"></div>
                            <div className="absolute bottom-0 right-0 w-0.5 h-2 bg-matrix-green/80"></div>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="font-mono text-sm text-white/95 tracking-wide drop-shadow-sm">{account.displayName}</span>
                            <span className="text-xs text-matrix-green/80 font-mono">{account.displayBalance}</span>
                          </div>
                        </div>
                        
                        {/* Account Button - Cyberpunk Style */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-[#ff0066]/20 rounded-lg blur-sm animate-pulse opacity-60"></div>
                          <button
                            onClick={openAccountModal}
                            className="relative bg-black/50 hover:bg-black/70 text-white/90 hover:text-white border border-[#ff0066]/40 hover:border-[#ff0066]/60 rounded-lg px-3 py-1.5 text-sm font-medium font-mono tracking-wide transition-all duration-300 shadow-lg shadow-[#ff0066]/10 hover:shadow-[#ff0066]/20 uppercase"
                          >
                            Account
                            
                            {/* Button corner accents */}
                            <div className="absolute top-0 left-0 w-1 h-1 bg-[#ff0066] opacity-80"></div>
                            <div className="absolute top-0 right-0 w-1 h-1 bg-[#ff0066] opacity-80"></div>
                            <div className="absolute bottom-0 left-0 w-1 h-1 bg-[#ff0066] opacity-80"></div>
                            <div className="absolute bottom-0 right-0 w-1 h-1 bg-[#ff0066] opacity-80"></div>
                          </button>
                        </div>
                        
                        {/* Data flow animation line */}
                        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-matrix-green/40 to-transparent animate-pulse"></div>
                      </div>
                    </div>
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