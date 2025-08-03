# KILT Liquidity Incentive Portal

## Overview
The KILT Liquidity Incentive Portal is a DeFi application for managing concentrated liquidity positions in the KILT/ETH Uniswap V3 pool on the Base network. It enables users to earn rewards from the KILT treasury. The project aims to provide a production-ready, full-stack TypeScript application with a React frontend and Express.js backend, focusing on real-time, authentic blockchain data, advanced analytics, and a mobile-first design for a blazing fast user experience.

## User Preferences
**Communication Style**: Simple, everyday language without technical jargon
**Design Inspiration**: Cluely.com aesthetic with Inter font and minimal glassmorphism design
**Data Priority**: Zero fallbacks - only authentic real-time blockchain data from verified sources
**Mobile Experience**: Optimized wallet connection with WalletConnect, MetaMask, Trust Wallet, and Coinbase Wallet support
**Gas Estimation**: Real Base network costs only (currently $0.02 total transaction costs)
**Suggested Domain**: liq.kilt.io (for liquid theme portal)

## System Architecture
The KILT Liquidity Incentive Portal is a full-stack TypeScript application emphasizing high performance, security, and scalability.

**Frontend Stack**:
- **Framework**: React 18 with TypeScript, Vite.
- **UI**: Shadcn/ui (Radix UI), Tailwind CSS with custom KILT brand colors, glassmorphism dark theme.
- **State Management**: TanStack Query v5 (optimistic updates).
- **Routing**: Wouter.
- **Web3**: Viem for type-safe Ethereum interactions on Base network.
- **Mobile Support**: Responsive design with deep link integration.
- **UI/UX Decisions**: Cluely.com aesthetic, Inter font, minimal glassmorphism, dark theme, smooth transitions, micro-interactions, 6-tab interface (Overview, Add Liquidity, Positions, Rewards, Analytics, Integration), clear separation of trading fees and treasury rewards.

**Backend Stack**:
- **Framework**: Express.js with TypeScript and ESM modules, Node.js runtime.
- **Database**: PostgreSQL with Drizzle ORM (Neon Database).
- **API Design**: RESTful endpoints with Zod validation, JSON responses.
- **Real-time Data**: CoinGecko API.
- **Performance**: Aggressive caching, parallel processing (e.g., ParallelPositionProcessor, ParallelDataLoader), request deduplication for sub-second responses.

**Database Schema (Core Entities)**:
- Users, LP Positions, Rewards, Pool Stats, Analytics Tables, Treasury Configuration (single source of truth for smart contract addresses).

**Smart Contract Architecture**:
- **Core Contract**: `MultiTokenTreasuryPool` for advanced treasury-based reward distribution.
- **Token**: KILT (0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8) on Base network.
- **Multi-Token Support**: Designed for KILT, BTC, ETH, SOL, BNB, DOT, or any ERC20 token as rewards.
- **Security**: Funds held directly by contract, includes ReentrancyGuard, Pausable, Ownable, SafeERC20.
- **Reward Lock**: Rolling 7-day lock per individual reward.
- **Claiming**: Batch claims, user-paid gas optimization.
- **Admin Control**: Multi-admin wallet support.
- **Reward Formula**: Sophisticated formula for proportional reward distribution based on liquidity share, time, in-range multiplier, and full-range bonus.

**Core Functionality Specifications**:
- **Wallet Integration**: MetaMask, Coinbase Wallet, WalletConnect (with deep link support).
- **Liquidity Management**: Full Uniswap V3 NFT position management (mint, increase, decrease, collect, burn) with UI for creation (sliders, presets, range visualization).
- **Reward System**: KILT treasury rewards with proportional distribution.
- **Real-time Analytics**: Live KILT token data, pool metrics (TVL, volume, APR), user portfolio dashboards.
- **Mobile Optimization**: Responsive design, mobile-optimized tabs, deep link integration.
- **Position Tracking**: Complete LP position lifecycle management with historical analytics.
- **One-Click Features**: One-click liquidity addition and rebalancing.
- **Buy KILT Integration**: Seamless "Buy KILT" functionality through Uniswap swap interface.

**System Design Choices**:
- **Data Integrity**: 100% authentic blockchain data with zero fallbacks.
- **Database-Driven Configuration**: Smart contract addresses stored in database as single source of truth, eliminating hardcoded values throughout the application.
- **Performance**: Aggressive caching, parallel processing, optimized API responses.
- **Modularity**: Clean component architecture.
- **Security**: Input validation, rate limiting, secure smart contract design.
- **User Experience**: Intuitive navigation, clear messaging, visually appealing glassmorphism dark theme.

## External Dependencies

**Blockchain Integration**:
- **Base Network**: Ethereum L2.
- **Viem**: Ethereum library for wallet interactions.
- **MetaMask**: Wallet provider.
- **WalletConnect**: For broader mobile wallet support.
- **Coinbase Wallet**, **Trust Wallet**, **Rainbow**: Mobile wallet deep link integrations.
- **Uniswap V3 Contracts**: Direct interaction for liquidity pool management.

**Database and Storage**:
- **Neon Database**: Serverless PostgreSQL.
- **Drizzle ORM**: Type-safe database operations.

**UI and Styling**:
- **Shadcn/ui**: Accessible component library.
- **Radix UI**: Primitive components.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

**APIs**:
- **CoinGecko API**: Real-time KILT token data.
- **DexScreener API**: Real-time KILT/ETH pool conversion rates.