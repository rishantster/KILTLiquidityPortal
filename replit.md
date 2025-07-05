# KILT LP Portal

## Overview

This is a decentralized finance (DeFi) liquidity provisioning portal built for the KILT token on the Base network. The application enables users to create and manage liquidity positions, track rewards, and participate in an incentivized liquidity mining program. The system is designed as a full-stack TypeScript application with a React frontend and Express.js backend.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom KILT brand colors and dark theme
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Web3 Integration**: Viem for Ethereum interactions on Base network

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Style**: RESTful endpoints with JSON responses
- **Development**: Hot reloading with Vite middleware integration

### Database Schema
- **Users**: Stores wallet addresses and creation timestamps
- **LP Positions**: Manages NFT-based liquidity positions with price ranges
- **Rewards**: Tracks earned and claimed rewards per user/position
- **Pool Stats**: Maintains pool metrics (TVL, volume, APR, current price)

## Key Components

### Data Models
- **User**: Wallet address identification system
- **LP Position**: Uniswap V3 style concentrated liquidity positions
- **Reward System**: Token-based incentive tracking with claim functionality
- **Pool Statistics**: Real-time pool metrics for user interface

### Frontend Components
- **Wallet Connection**: MetaMask integration for Base network
- **Liquidity Provision**: Form for creating new LP positions
- **Position Management**: Dashboard for viewing and managing positions
- **Rewards Tracking**: Real-time reward calculation and claiming
- **Pool Overview**: Statistics dashboard with TVL, volume, and APR metrics

### Backend Services
- **Storage Layer**: Abstract interface with in-memory implementation
- **API Routes**: RESTful endpoints for CRUD operations
- **Validation**: Zod schema validation for all data inputs
- **Error Handling**: Centralized error handling with proper HTTP status codes

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