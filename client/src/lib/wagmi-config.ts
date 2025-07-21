import { http, createConfig } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

// WalletConnect project ID - get from https://cloud.walletconnect.com
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '2a1306d3c7b6b3b4e8a9f0e5d4c2b1a0'

export const wagmiConfig = createConfig({
  chains: [base, mainnet],
  connectors: [
    injected(),
    walletConnect({
      projectId,
      metadata: {
        name: 'KILT Liquidity Portal',
        description: 'DeFi liquidity management with treasury rewards',
        url: 'https://liq.kilt.io',
        icons: ['https://avatars.githubusercontent.com/u/37784886']
      }
    }),
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
})

export { projectId }