# KILT Liquidity Incentive Portal

## Overview

This is a comprehensive decentralized finance (DeFi) liquidity provisioning portal built specifically for the KILT token on the Base network. The application enables users to connect their wallets, create and manage concentrated liquidity positions in the existing KILT/ETH Uniswap V3 pool, and earn rewards from the KILT treasury allocation. The system is designed as a full-stack TypeScript application with a React frontend and Express.js backend, featuring real-time data integration, advanced analytics, and mobile-first responsive design.

## Key Features

### Core Functionality
- **Wallet Integration**: MetaMask and mobile wallet support with deep link integration
- **Liquidity Management**: Full Uniswap V3 NFT position management (mint, increase, decrease, collect, burn)
- **Reward System**: KILT treasury rewards with time and size multipliers (47.2% base APR)
- **Real-time Analytics**: Live KILT token data integration via CoinGecko API
- **Mobile Optimization**: Responsive design with mobile wallet compatibility

### Advanced Features
- **Historical Analytics**: Position snapshots, performance metrics, and fee tracking
- **Pool Metrics**: Real-time TVL, volume, and price data
- **User Analytics**: Portfolio-wide performance dashboards
- **Reward Calculator**: Comprehensive reward calculation with multipliers
- **Position Tracking**: Complete LP position lifecycle management

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom KILT brand colors and glassmorphism dark theme
- **State Management**: TanStack Query v5 for server state with optimistic updates
- **Routing**: Wouter for lightweight client-side routing
- **Web3 Integration**: Viem for type-safe Ethereum interactions on Base network
- **Mobile Support**: Responsive design with mobile wallet deep link integration

### Backend Stack
- **Framework**: Express.js with TypeScript and ESM modules
- **Runtime**: Node.js with hot reloading via Vite middleware
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Design**: RESTful endpoints with Zod validation and JSON responses
- **Real-time Data**: CoinGecko API integration for live KILT token data

### Database Schema
- **Users**: Wallet addresses, creation timestamps, and user preferences
- **LP Positions**: Uniswap V3 NFT positions with token amounts, price ranges, and metadata
- **Rewards**: KILT treasury reward tracking with time/size multipliers and claim status
- **Pool Stats**: Real-time pool metrics (TVL, volume, APR, current price)
- **Analytics Tables**: Position snapshots, performance metrics, fee events, and user analytics

## Component Architecture

### Core Components
- **MainDashboard**: Central hub with 6-tab interface (Overview, Add Liquidity, Positions, Rewards, Analytics, Integration)
- **WalletConnect**: Multi-wallet support with mobile deep links (MetaMask, Trust Wallet, Coinbase Wallet, Rainbow)
- **LiquidityMint**: Comprehensive Uniswap V3 position creation with sliders and presets
- **UserPositions**: Complete LP position management with real-time data and actions
- **RewardsTracking**: KILT treasury reward calculation, tracking, and claiming
- **AnalyticsDashboard**: Advanced analytics with historical data and performance metrics
- **IntegrationDashboard**: Technical Uniswap V3 features and smart contract interactions

### Data Models
- **User**: Wallet address identification with creation timestamps
- **LP Position**: Uniswap V3 NFT positions with token amounts, price ranges, fee tiers
- **Reward System**: KILT treasury rewards with time/size multipliers and 90-day lock
- **Pool Statistics**: Real-time TVL, volume, price, and APR metrics
- **Analytics**: Position snapshots, performance metrics, fee events, user analytics

### Backend Services
- **Storage Layer**: Abstract interface with in-memory implementation (configurable for PostgreSQL)
- **API Routes**: RESTful endpoints with Zod validation and error handling
- **Reward Service**: Complex reward calculation with multipliers and claim management
- **Analytics Service**: Historical data tracking and performance calculations
- **KILT Data Service**: Real-time token data integration with CoinGecko API

## Data Flow

1. **User Authentication**: Wallet connection via MetaMask on Base network
2. **Position Creation**: User submits liquidity with token amounts and price ranges
3. **Data Persistence**: Position data stored in PostgreSQL via Drizzle ORM
4. **Reward Calculation**: Backend calculates rewards based on position size, duration, and multipliers
5. **Real-time Updates**: Frontend polls for position and reward updates
6. **Reward Distribution**: Users can claim accumulated rewards through the interface

## External Dependencies

### Blockchain Integration
- **Base Network**: Ethereum L2 for reduced gas costs
- **Viem**: Modern Ethereum library for wallet interactions
- **MetaMask**: Primary wallet provider for user authentication

### Database and Storage
- **Neon Database**: Serverless PostgreSQL for production
- **Drizzle ORM**: Type-safe database operations
- **In-memory Storage**: Development and testing fallback

### UI and Styling
- **Shadcn/ui**: Accessible component library
- **Radix UI**: Primitive components for complex UI patterns
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography

## Deployment Strategy

### Development Environment
- **Hot Reloading**: Vite middleware integration with Express
- **TypeScript**: Full-stack type safety with shared schema definitions
- **Environment Variables**: Database URL and configuration management

### Production Build
- **Frontend**: Vite builds static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations for schema updates
- **Static Serving**: Express serves built frontend assets

### Database Management
- **Schema Definition**: Centralized in `shared/schema.ts`
- **Migrations**: Generated and applied via Drizzle Kit
- **Type Safety**: Automatic TypeScript types from schema

## Component Architecture (New Tabbed Interface)

### Main Dashboard Structure
- **MainDashboard**: Central hub with 6-tab interface organizing all features
- **Overview Tab**: Key metrics, KILT price, market data, welcome interface
- **Liquidity Tab**: LiquidityProvision component for pool management
- **Positions Tab**: UserPositions component for LP tracking
- **Rewards Tab**: RewardsTracking component for incentive management
- **Analytics Tab**: AnalyticsDashboard with comprehensive performance data
- **Integration Tab**: IntegrationDashboard for technical Uniswap V3 features

### Advanced Analytics Features
- **Position Snapshots**: Historical liquidity position tracking
- **Performance Metrics**: Impermanent loss calculations and ROI analysis
- **Fee Events**: Complete fee earning history and analytics
- **Pool Metrics**: Price and TVL historical data with charts
- **User Analytics**: Portfolio-wide performance dashboards

### Removed/Consolidated Components
- **SmartContractDemo**: Functionality moved to IntegrationDashboard
- **LiquidityMint**: Consolidated into LiquidityProvision
- **PoolOverview**: Integrated into MainDashboard overview tab
- **UniswapV3Manager**: Advanced features moved to Integration tab

### Benefits
- Clean navigation with logical feature separation
- Responsive design optimized for mobile and desktop
- Consistent Cluely.com aesthetic throughout all tabs
- Reduced code duplication and improved maintainability
- Better user experience with intuitive tab organization

## Mobile Wallet Compatibility

### Mobile Detection and Optimization
- **Responsive Tabbed Interface**: Mobile-optimized tabs with shorter labels and compact layout
- **Device Detection**: Automatic detection of mobile devices and screen sizes
- **Viewport Management**: Dynamic responsive behavior based on screen dimensions

### Mobile Wallet Support
- **Deep Link Integration**: Direct connection to popular mobile wallets:
  - MetaMask Mobile (metamask.app.link)
  - Trust Wallet (link.trustwallet.com)
  - Coinbase Wallet (go.cb-w.com)
  - Rainbow Wallet (rainbow.me)
- **Wallet Detection**: Automatic detection of installed wallet apps
- **Installation Prompts**: Direct links to wallet app downloads
- **Connection Instructions**: Step-by-step guidance for mobile users

### Mobile UX Features
- **Modal Interface**: Clean mobile wallet selection modal
- **Touch-Optimized**: All interactions designed for touch interfaces
- **Responsive Cards**: Adaptive card layouts for mobile screens
- **Compact Navigation**: Space-efficient tab design with icons and short labels

## User Preferences

Preferred communication style: Simple, everyday language.
Design inspiration: Cluely.com aesthetic with Inter font and minimal design.

## Changelog

Changelog:
- July 05, 2025. Initial setup
- July 05, 2025. Updated with real KILT token data (0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8, 290.56M supply)
- July 05, 2025. Redesigned with Cluely.com-inspired aesthetic using Inter font, minimal glass effects, and clean typography
- July 05, 2025. Implemented comprehensive smart contract reward distribution mechanism with time/size multipliers
- July 05, 2025. Added real Uniswap V3 contract integration with LP NFT management on Base network
- July 05, 2025. Implemented comprehensive advanced analytics and historical data tracking system
- July 05, 2025. Implemented tabbed interface for critical components and cleaned codebase organization
- July 05, 2025. Added mobile wallet compatibility with deep link support and responsive design
- July 05, 2025. Enhanced UI with advanced Cluely.com-inspired glassmorphism design featuring sophisticated dark theme, enhanced blur effects, and premium visual hierarchy
- July 05, 2025. Implemented smooth glassmorphism transition animations with advanced micro-interactions, shimmer effects, floating animations, and sophisticated easing curves for premium user experience
- July 05, 2025. Revamped landing page with KILT-focused messaging featuring "KILT Liquidity Incentive Program" headline, treasury allocation details, and program-specific feature descriptions
- July 05, 2025. Enhanced dark theme by removing purple colors and implementing blue-to-emerald gradient scheme with deeper black backgrounds
- July 05, 2025. Fixed critical wallet connection issues by rebuilding the connection system from scratch, resolving React hooks order errors, and ensuring proper state management for seamless MetaMask integration
- July 05, 2025. Completely streamlined liquidity provision interface to match Uniswap's clean design, removing all redundant code and complex nested structures for a focused user experience
- July 05, 2025. Consolidated rewards calculator functionality into a single dedicated tab, eliminating scattered reward interfaces throughout the app and creating a unified rewards experience with comprehensive calculator and treasury information
- July 05, 2025. Replaced all duplicate liquidity provision components with single enhanced LiquidityMint component featuring real Uniswap V3 integration, position size sliders, price range presets, and comprehensive user controls for optimal liquidity management experience
- July 05, 2025. Resolved critical wallet state management issue by implementing manual disconnection flag system to prevent automatic reconnection after user-initiated disconnect, ensuring proper wallet connect/disconnect flow with React Context state management
- July 05, 2025. Completed comprehensive codebase cleanup by removing redundant components (pool-overview, smart-contract-demo, positions-dashboard), unused hooks (use-smart-contract, use-kilt-transfer), documentation files, and broken code sections with TypeScript errors, significantly improving code maintainability and build stability
- July 05, 2025. Fixed critical wallet approve tokens functionality by temporarily setting poolExists to true, enabling users to test token approval process for liquidity provision
- July 05, 2025. Completely redesigned dashboard interface with clean, professional layout featuring simplified header, proper KILT branding with gradient K logo, streamlined navigation tabs, and improved overall user experience removing cluttered elements
- July 05, 2025. Implemented real-time KILT token data integration using CoinGecko API (kilt-protocol endpoint) replacing mock data with live price ($0.0160), volume (426 USDT), and market cap calculations
- July 05, 2025. Completed comprehensive typography standardization across all numerical displays using "font-bold tabular-nums" for consistent formatting throughout rewards tracking, analytics, and dashboard components
- July 05, 2025. Removed "Advanced DeFi liquidity management on Base network" tagline from header per user request for cleaner KILT-focused messaging
- July 05, 2025. Fixed critical market cap calculation error by using correct circulating supply (276.97M KILT) instead of total supply (290.56M), correcting market cap from incorrect $8.4M to accurate $4.4M based on real CoinMarketCap data
- July 05, 2025. Improved mobile wallet deeplink functionality by removing incorrect URL encoding for MetaMask and Rainbow wallets while maintaining proper encoding for Trust Wallet and Coinbase Wallet based on their specific deeplink requirements
- July 05, 2025. Implemented complete Uniswap V3 NFT management integration in Positions component with real-time position data, liquidity management (increase/decrease), fee collection, position burning, and live position value calculations from on-chain Uniswap V3 contracts
- July 05, 2025. Added comprehensive mock demonstration data with 3 realistic LP positions showing different fee tiers (0.3%, 0.05%, 1%) and ranges for testing interface functionality
- July 05, 2025. Fixed button layout overflow issues by optimizing button spacing and text sizing for proper container fit
- July 05, 2025. Verified mobile compatibility with successful wallet connection modal display and responsive design on mobile devices
- July 05, 2025. Implemented comprehensive Panoptic-style position visualization across all components with curved SVG-based range displays, created reusable PositionRangeChart component, enhanced UserPositions with position health indicators, added range preview to LiquidityMint component, and upgraded AnalyticsDashboard with position range analysis sections
- July 08, 2025. Removed all mock position data from UserPositions component and updated to fetch only real positions from connected wallet addresses using Uniswap V3 contracts, including both active and closed positions, with improved user messaging to distinguish between KILT/ETH positions and other Uniswap V3 positions
- July 08, 2025. Added toggle functionality to display closed positions in UserPositions component with position count display (e.g., "1 positions (0 open)"), visual styling differentiation for closed positions (grayed out cards and icons), disabled management actions for closed positions, and smooth toggle animation matching the design aesthetic
- July 08, 2025. Enhanced position detection to show any Uniswap V3 positions containing KILT token (not just KILT/ETH pool), updated UI to display "Your KILT LP Positions" with position type badges (KILT/ETH vs Other Pool), and improved empty state messaging to distinguish between different types of positions found in wallet
- July 08, 2025. Completely removed all mock data throughout the entire application including demo positions, mock balance fallbacks, and temporary testing flags, ensuring all data displayed comes from real blockchain sources and authentic API responses
- July 08, 2025. Implemented comprehensive bonding curve reward system replacing tier-based multipliers with smooth mathematical formula: R_u = (w1 * L_u/T + w2 * D_u/365) * R/365 * k/(N+k), featuring liquidity weight (0.6), time weight (0.4), bonding curve constant (k=50), and real-time analytics display showing total liquidity, active users, estimated APR, and bonding factor
- July 08, 2025. Completely replaced bonding curve system with Top 100 ranking system implementing Liquidity + Duration Weighted Rule: R_u = (w1 * L_u/T_top100 + w2 * D_u/365) * R/365/100 * (1 - (rank-1)/99), featuring fixed 100 participant limit, rank-based APR multipliers (66% at rank 1, 33% at rank 50, 0.66% at rank 100), replacement mechanism based on L_u * D_u scoring, and comprehensive analytics showing participant slots, APR by rank, and treasury status
- July 08, 2025. Fixed critical UI layout issues in position range chart within liquidity provision section by replacing broken SVG elements with clean, properly aligned visualization, improving spacing and visual hierarchy for better user experience
- July 08, 2025. Implemented one-click liquidity addition feature in Overview tab with optimal balanced range strategy (±50%), automatic token approval (KILT & WETH), and seamless liquidity deployment using 1,000 KILT default amount, complete with progress indicators and automatic navigation to positions view upon completion
- July 08, 2025. Enhanced one-click liquidity feature to use actual wallet balances instead of hardcoded defaults, calculating optimal amounts based on 80% of available KILT and WETH balances for balanced liquidity provision, with intelligent fallback display for insufficient balances and real-time wallet balance display in the interface
- July 08, 2025. Implemented comprehensive real-time transaction cost estimation system using Base network gas prices, featuring gas estimation hook with 30-second refresh intervals, detailed cost breakdowns for all operations (approve, mint, increase, decrease, collect, burn), compact and full gas estimation cards, and integration throughout liquidity provision interfaces
- July 08, 2025. Created interactive pool performance visualization with animated charts featuring real-time pool metrics (price, volume, TVL, APR), smooth Framer Motion animations, interactive metric cards with click-to-switch functionality, time range selector (1h, 24h, 7d, 30d), responsive chart types (area/bar), beautiful tooltips, and comprehensive performance summaries integrated into Analytics tab Live Charts section
- July 08, 2025. Redesigned overview section by removing redundant Advanced Program Information card and streamlining to focus on essential key metrics (KILT Price, Market Cap, Treasury APR) with clean, modern card design and improved Quick Add Liquidity interface featuring enhanced visual hierarchy, animated progress bars, and contemporary gradient styling