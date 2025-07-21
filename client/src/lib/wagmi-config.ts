import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'
import { WagmiProvider } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// 1. Get projectId from https://cloud.walletconnect.com
const projectId = process.env.VITE_WALLETCONNECT_PROJECT_ID || 'fallback_project_id'

// 2. Create wagmiConfig
const metadata = {
  name: 'KILT Liquidity Incentive Portal',
  description: 'DeFi liquidity management with treasury rewards',
  url: 'https://liq.kilt.io', // Your domain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [base, mainnet] as const
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
})

// 3. Create modal
createWeb3Modal({
  projectId,
  wagmiConfig,
  defaultChain: base,
  enableAnalytics: true,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-color-mix': '#ff0066',
    '--w3m-accent': '#ff0066',
  }
})

export { projectId }