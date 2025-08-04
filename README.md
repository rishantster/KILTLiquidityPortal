# KILT Liquidity Incentive Portal

> Production-ready DeFi application for KILT/ETH Uniswap V3 liquidity management with dynamic reward distribution

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Deploy smart contract
npm run deploy:contract
```

## 📁 Project Structure

```
├── client/           # React frontend application
├── server/           # Express.js backend API
├── contracts/        # Smart contracts (Solidity)
├── shared/          # Shared types and schemas
├── docs/            # Documentation and guides
├── scripts/         # Development and testing scripts
├── assets/          # Project assets (logos, images)
└── README.md
```

## 🔧 Key Features

- **Zero Restrictions**: Unlimited reward claiming with signature-based security
- **Real-time Data**: Authentic blockchain data from verified sources only
- **Mobile Optimized**: WalletConnect, MetaMask, Trust Wallet support
- **Advanced Analytics**: Live TVL, APR, and user portfolio tracking
- **Gas Efficient**: ~$0.02 transaction costs on Base network

## 🌐 Network & Contracts

- **Network**: Base (Chain ID: 8453)
- **KILT Token**: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8`
- **Pool**: KILT/ETH Uniswap V3 (0.3% fee tier)
- **Smart Contract**: DynamicTreasuryPool with OpenZeppelin v5

## 📚 Documentation

- [Smart Contract Deployment](docs/smart-contract-deployment.md)
- [Contract Funding Guide](docs/contract-funding.md)
- [Admin Operations](docs/admin-guide.md)
- [Complete Deployment Package](docs/deployment-package.md)

## 🔐 Security Features

- Cryptographic signature validation
- Time-based replay protection (1-hour windows)
- Reentrancy protection with pause functionality
- Owner-only emergency controls

## 💡 Architecture Highlights

- **Frontend**: React 18 + TypeScript + Vite + Shadcn/ui
- **Backend**: Express.js + PostgreSQL + Drizzle ORM
- **Web3**: Viem for type-safe Ethereum interactions
- **Real-time**: CoinGecko & DexScreener API integration
- **Performance**: Aggressive caching and parallel processing

Built for production with focus on security, performance, and user experience.