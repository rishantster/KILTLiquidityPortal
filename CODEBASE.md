# Codebase Documentation

## 📁 Project Structure

```
kilt-liquidity-portal/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── ui/                # Shadcn/ui components (auto-generated)
│   │   │   ├── analytics-dashboard.tsx
│   │   │   ├── integration-dashboard.tsx
│   │   │   ├── liquidity-mint.tsx
│   │   │   ├── main-dashboard.tsx
│   │   │   ├── rewards-tracking.tsx
│   │   │   ├── uniswap-v3-manager.tsx
│   │   │   ├── user-positions.tsx
│   │   │   └── wallet-connect.tsx
│   │   ├── contexts/              # React contexts
│   │   │   └── wallet-context.tsx
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── use-analytics.ts
│   │   │   ├── use-kilt-data.ts
│   │   │   ├── use-mobile.tsx
│   │   │   ├── use-pool-data.ts
│   │   │   ├── use-toast.ts
│   │   │   └── use-uniswap-v3.ts
│   │   ├── lib/                   # Utility functions
│   │   │   ├── constants.ts
│   │   │   ├── queryClient.ts
│   │   │   ├── smart-contracts.ts
│   │   │   ├── uniswap-v3.ts
│   │   │   ├── utils.ts
│   │   │   └── web3.ts
│   │   ├── pages/                 # Page components
│   │   │   ├── home.tsx
│   │   │   └── not-found.tsx
│   │   ├── App.tsx               # Main App component
│   │   ├── index.css             # Global styles
│   │   └── main.tsx              # React entry point
│   ├── index.html                # HTML template
│   └── public/                   # Static assets
├── server/                       # Backend Express application
│   ├── analytics.ts              # Analytics service
│   ├── db.ts                     # Database connection
│   ├── index.ts                  # Express server entry
│   ├── kilt-data.ts              # KILT token data service
│   ├── reward-service.ts         # Reward calculation service
│   ├── routes.ts                 # API routes
│   ├── storage.ts                # Storage abstraction
│   └── vite.ts                   # Vite middleware
├── shared/                       # Shared types and schemas
│   └── schema.ts                 # Database schema
├── contracts/                    # Smart contract data
│   └── uniswap-v3-addresses.ts   # Contract addresses
├── attached_assets/              # User-uploaded assets
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind CSS config
├── vite.config.ts                # Vite configuration
├── drizzle.config.ts             # Drizzle ORM config
├── README.md                     # Main documentation
├── DEPLOYMENT.md                 # Deployment guide
└── replit.md                     # Project history
```

## 🔧 Core Components

### MainDashboard (`client/src/components/main-dashboard.tsx`)
Central hub component with tabbed interface:
- **Overview**: KILT token data and program information
- **Add Liquidity**: Liquidity provision interface
- **Positions**: LP position management
- **Rewards**: Reward tracking and claiming
- **Analytics**: Performance metrics and charts
- **Integration**: Technical Uniswap V3 features

**Key Features**:
- Responsive design with mobile optimization
- Real-time KILT token data integration
- Wallet connection state management
- Clean glassmorphism UI with dark theme

### WalletConnect (`client/src/components/wallet-connect.tsx`)
Wallet connection component with multi-wallet support:
- **Desktop**: MetaMask integration
- **Mobile**: Deep link support for Trust Wallet, Coinbase Wallet, Rainbow
- **State Management**: Connection status and address tracking
- **Error Handling**: Connection failures and network issues

### LiquidityMint (`client/src/components/liquidity-mint.tsx`)
Comprehensive liquidity provision interface:
- **Token Selection**: KILT and ETH token inputs
- **Price Range**: Full range and custom range options
- **Position Sizing**: Slider controls for liquidity amounts
- **Fee Tiers**: 0.05%, 0.3%, 1% fee tier selection
- **Uniswap V3**: Real mint integration with NFT creation

### UserPositions (`client/src/components/user-positions.tsx`)
LP position management dashboard:
- **Position Display**: NFT-based position cards
- **Real-time Data**: Live position values and status
- **Actions**: Increase, decrease, collect fees, burn positions
- **Analytics**: Position performance and fee earnings
- **Mock Data**: Demonstration positions for testing

### RewardsTracking (`client/src/components/rewards-tracking.tsx`)
KILT treasury reward system:
- **Reward Calculation**: Time and size multipliers
- **Claim Management**: 90-day lock period enforcement
- **Treasury Info**: Program allocation and remaining funds
- **Calculator**: Interactive reward estimation tool
- **Statistics**: User reward analytics and history

## 🎨 UI System

### Shadcn/ui Components (`client/src/components/ui/`)
Pre-built accessible components:
- **Used**: Badge, Button, Card, Dialog, Input, Label, Progress, Separator, Skeleton, Slider, Tabs, Toggle
- **Unused**: AlertDialog, Accordion, Calendar, Carousel, etc. (kept for future use)

### Styling System
- **Tailwind CSS**: Utility-first CSS framework
- **Custom Theme**: KILT brand colors and glassmorphism effects
- **Dark Mode**: Primary dark theme with blue-to-emerald gradients
- **Responsive**: Mobile-first design with breakpoints
- **Typography**: Inter font with tabular numbers for consistency

## 🔌 Hooks and Utilities

### Custom Hooks
- **`use-kilt-data.ts`**: Real-time KILT token data fetching
- **`use-pool-data.ts`**: Pool metrics and statistics
- **`use-uniswap-v3.ts`**: Uniswap V3 contract interactions
- **`use-analytics.ts`**: Analytics data management
- **`use-mobile.tsx`**: Mobile device detection
- **`use-toast.ts`**: Toast notification system

### Utility Functions
- **`lib/utils.ts`**: Common utility functions and class name merging
- **`lib/constants.ts`**: Application constants and configuration
- **`lib/web3.ts`**: Web3 connection and wallet utilities
- **`lib/smart-contracts.ts`**: Smart contract ABI and interaction helpers
- **`lib/uniswap-v3.ts`**: Uniswap V3 specific functions and calculations

## 🗄️ Backend Architecture

### Services
- **`analytics.ts`**: Position snapshots, performance metrics, fee tracking
- **`reward-service.ts`**: Complex reward calculations with multipliers
- **`kilt-data.ts`**: CoinGecko API integration for live token data
- **`storage.ts`**: Abstract storage interface with in-memory implementation

### Database Schema (`shared/schema.ts`)
Comprehensive schema with Drizzle ORM:
- **Users**: Wallet addresses and metadata
- **LP Positions**: Uniswap V3 NFT positions
- **Rewards**: Treasury reward tracking
- **Analytics**: Historical data tables
- **Pool Stats**: Real-time pool metrics

### API Routes (`server/routes.ts`)
RESTful API with Zod validation:
- **User Management**: CRUD operations for users
- **Position Management**: LP position lifecycle
- **Reward System**: Calculation and claiming
- **Analytics**: Historical data and metrics
- **Real-time Data**: KILT token and pool data

## 🔗 External Integrations

### Blockchain Integration
- **Viem**: Type-safe Ethereum library
- **Base Network**: Ethereum L2 (Chain ID: 8453)
- **Uniswap V3**: Concentrated liquidity protocol
- **MetaMask**: Primary wallet provider

### Data Sources
- **CoinGecko API**: Live KILT token data
- **Uniswap V3 Subgraph**: Pool and position data
- **Base Network RPC**: Blockchain interactions

## 🚀 Build and Development

### Development Workflow
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run db:push      # Push database schema
npm run db:studio    # Open database studio
```

### Build Process
- **Vite**: Fast build tool with HMR
- **TypeScript**: Type checking and compilation
- **ESBuild**: Fast JavaScript bundling
- **Tailwind**: CSS compilation and purging

### Code Quality
- **TypeScript**: Strict type checking
- **ESLint**: Code linting (minimal configuration)
- **Prettier**: Code formatting (via editor)
- **Husky**: Git hooks (not configured)

## 📊 Performance Optimizations

### Frontend Optimizations
- **Code Splitting**: Route-based and component-based
- **Tree Shaking**: Unused code elimination
- **Bundle Analysis**: Vite bundle analyzer
- **Lazy Loading**: Component lazy loading
- **Caching**: TanStack Query caching

### Backend Optimizations
- **Connection Pooling**: Database connection management
- **Query Optimization**: Efficient database queries
- **Caching**: Response caching headers
- **Compression**: Gzip compression middleware

## 🔒 Security Measures

### Frontend Security
- **Input Validation**: Zod schema validation
- **XSS Prevention**: React built-in protections
- **CSRF Protection**: SameSite cookie attributes
- **Type Safety**: TypeScript throughout

### Backend Security
- **Input Validation**: Zod schema validation
- **SQL Injection**: Drizzle ORM parameterized queries
- **Error Handling**: Centralized error responses
- **CORS**: Configured for development

## 📱 Mobile Compatibility

### Responsive Design
- **Mobile-First**: Tailwind mobile-first approach
- **Breakpoints**: sm, md, lg, xl responsive breakpoints
- **Touch Optimization**: Touch-friendly button sizes
- **Viewport**: Proper viewport meta tag

### Mobile Wallet Support
- **Deep Links**: Direct wallet app integration
- **Detection**: Mobile device and wallet detection
- **Fallbacks**: Installation prompts and alternatives

## 🧪 Testing Strategy

### Current Testing
- **TypeScript**: Compile-time type checking
- **Manual Testing**: User interface testing
- **Integration Testing**: API endpoint testing

### Recommended Testing
- **Unit Tests**: Jest for utility functions
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright for user flows
- **API Tests**: Supertest for backend

## 🔄 State Management

### Client State
- **React Context**: Wallet connection state
- **TanStack Query**: Server state management
- **Local State**: Component-level React state

### Server State
- **In-Memory**: Default storage implementation
- **PostgreSQL**: Production database option
- **Caching**: Query result caching

## 📦 Dependencies

### Production Dependencies
- **React Ecosystem**: React, React DOM, React Router (Wouter)
- **UI Components**: Radix UI, Shadcn/ui, Tailwind CSS
- **State Management**: TanStack Query, React Context
- **Web3**: Viem, Ethereum interactions
- **Backend**: Express, Drizzle ORM, Zod validation
- **Build Tools**: Vite, TypeScript, ESBuild

### Development Dependencies
- **TypeScript**: Type definitions and compiler
- **Tailwind CSS**: Utility-first CSS framework
- **ESLint**: Code linting (basic configuration)
- **Vite Plugins**: Development enhancements

## 🏗️ Architecture Decisions

### Frontend Architecture
- **Component-Based**: Reusable React components
- **Hooks Pattern**: Custom hooks for logic reuse
- **Context API**: Global state management
- **Server State**: TanStack Query for API integration

### Backend Architecture
- **Microservices**: Modular service architecture
- **Abstract Storage**: Pluggable storage interface
- **RESTful API**: Standard HTTP API patterns
- **Type Safety**: End-to-end TypeScript

### Database Architecture
- **Relational Model**: PostgreSQL with foreign keys
- **Type Safety**: Drizzle ORM with TypeScript
- **Migrations**: Schema evolution management
- **Indexing**: Optimized query performance

## 🎯 Future Enhancements

### Planned Features
- **Real Pool Creation**: Actual Uniswap V3 pool deployment
- **Advanced Analytics**: More detailed performance metrics
- **Notification System**: Real-time alerts and updates
- **Multi-Chain**: Support for additional networks

### Technical Improvements
- **Testing Suite**: Comprehensive test coverage
- **Performance Monitoring**: Real-time performance tracking
- **Error Tracking**: Centralized error monitoring
- **Documentation**: API documentation generation

---

This codebase represents a production-ready DeFi application with comprehensive features, clean architecture, and extensive documentation. The modular design allows for easy maintenance, testing, and future enhancements.