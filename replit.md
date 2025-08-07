# KILT Liquidity Incentive Portal

## Overview
The KILT Liquidity Incentive Portal is a production-ready DeFi application designed for managing concentrated liquidity positions in the KILT/ETH Uniswap V3 pool on the Base network. Its primary purpose is to enable users to earn dynamic rewards from the KILT treasury through a zero-restriction claiming system. The project is a full-stack TypeScript application with a React frontend and an Express.js backend, prioritizing real-time blockchain data, signature-based security, and a mobile-optimized user experience. The business vision is to provide a seamless and secure platform for KILT holders to participate in DeFi, thereby enhancing KILT's liquidity and utility within the broader crypto ecosystem.

## User Preferences
**Communication Style**: Simple, everyday language without technical jargon
**Design Inspiration**: Cluely.com aesthetic with Inter font and minimal glassmorphism design
**Data Priority**: Zero fallbacks - only authentic real-time blockchain data from verified sources
**Mobile Experience**: Optimized wallet connection with WalletConnect, MetaMask, Trust Wallet, and Coinbase Wallet support
**Gas Estimation**: Real Base network costs only (currently $0.02 total transaction costs)
**Suggested Domain**: liq.kilt.io (for liquid theme portal)

## System Architecture
The KILT Liquidity Incentive Portal is a full-stack TypeScript application built for high performance, security, and scalability.

**Frontend Stack**:
- **Framework**: React 18 with TypeScript, Vite.
- **UI**: Shadcn/ui (Radix UI), Tailwind CSS with custom KILT brand colors, glassmorphism dark theme.
- **State Management**: TanStack Query v5 (optimistic updates).
- **Routing**: Wouter.
- **Web3**: Viem for type-safe Ethereum interactions on Base network.
- **Mobile Support**: Responsive design with deep link integration.
- **UI/UX Decisions**: Cluely.com aesthetic, Inter font, minimal glassmorphism, dark theme, smooth transitions, micro-interactions, 6-tab interface (Overview, Add Liquidity, Positions, Rewards, Analytics, Integration), clear separation of trading fees and treasury rewards. Extensive mobile CSS class system for optimal mobile user experience.

**Backend Stack**:
- **Framework**: Express.js with TypeScript and ESM modules, Node.js runtime.
- **Database**: PostgreSQL with Drizzle ORM (Neon Database).
- **API Design**: RESTful endpoints with Zod validation, JSON responses.
- **Performance**: Aggressive caching, parallel processing (e.g., ParallelPositionProcessor, ParallelDataLoader), request deduplication for sub-second responses.

**Database Schema (Core Entities)**:
- Users, LP Positions, Rewards, Pool Stats, Analytics Tables, Treasury Configuration.

**Smart Contract Architecture**:
- **Core Contract**: `DynamicTreasuryPool` deployed at `0x09bcB93e7E2FF067232d83f5e7a7E8360A458175` with enhanced security features (nonce-based replay protection, 24-hour calculator authorization delays, absolute maximum claim limits).
- **Reward System**: Single-click claiming of full reward balance with 100,000 KILT absolute maximum.
- **Admin Control**: Owner-controlled calculator authorization with time delays and emergency revocation.
- **Reward Formula**: Sophisticated formula for proportional reward distribution based on liquidity share, time, in-range multiplier, and full-range bonus.
- **Contract Alignment**: Perfect function and terminology matching with app's API patterns.

**Core Functionality Specifications**:
- **Wallet Integration**: MetaMask, Coinbase Wallet, WalletConnect (with deep link support).
- **Liquidity Management**: Full Uniswap V3 NFT position management (mint, increase, decrease, collect, burn) with UI for creation (sliders, presets, range visualization).
- **Reward System**: KILT treasury rewards with proportional distribution and a precise 24-hour waiting period for new registrations.
- **Real-time Analytics**: Live KILT token data, pool metrics (TVL, volume, APR), user portfolio dashboards.
- **Mobile Optimization**: Responsive design, mobile-optimized tabs, deep link integration.
- **Position Tracking**: Complete LP position lifecycle management with historical analytics.
- **One-Click Features**: One-click liquidity addition and rebalancing.
- **Buy KILT Integration**: Seamless "Buy KILT" functionality through Uniswap swap interface.

**System Design Choices**:
- **Data Integrity**: 100% authentic blockchain data with zero fallbacks, comprehensive validation, and robust RPC resilience to prevent data corruption. All reward calculations use real market data.
- **Database-Driven Configuration**: Smart contract addresses and all critical configurations are stored in the database as a single source of truth, eliminating hardcoded values.
- **Performance**: Aggressive caching, parallel processing, optimized API responses, and comprehensive TypeScript optimization.
- **Modularity**: Clean component architecture.
- **Security**: Input validation, rate limiting, secure smart contract design, and fixed ABI mismatches and signature validation.
- **User Experience**: Intuitive navigation, clear messaging, visually appealing glassmorphism dark theme, standardized UI consistency, and professional loading fallbacks for improved deployment stability.
- **Health Monitoring**: Production-ready health checks validate database connectivity, smart contract services, user systems, reward systems, treasury configuration, and performance metrics.

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