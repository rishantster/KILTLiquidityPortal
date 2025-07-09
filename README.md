# KILT Liquidity Incentive Portal

A comprehensive DeFi liquidity provisioning portal for the KILT token on Base network, featuring Uniswap V3 integration, treasury rewards, and advanced analytics.

## 🌟 Key Features

- **🔗 Multi-Wallet Support**: MetaMask, Trust Wallet, Coinbase Wallet, Rainbow with mobile deep links
- **💧 Liquidity Management**: Full Uniswap V3 NFT position lifecycle (mint, increase, decrease, collect, burn)
- **🎁 Smart Contract Rewards**: 47.2% base APR with 90-day token locking and secure treasury distribution
- **📊 Advanced Analytics**: Historical position tracking, performance metrics, and fee analysis
- **📱 Mobile Optimized**: Responsive design with mobile wallet compatibility
- **⚡ Real-time Data**: Live KILT token data via CoinGecko API integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL database (optional - uses in-memory storage by default)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd kilt-liquidity-portal

# Install dependencies
npm install

# Set up environment variables (optional)
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development builds
- **Shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** with custom KILT branding
- **TanStack Query** for server state management
- **Viem** for Ethereum interactions

### Backend Stack
- **Express.js** with TypeScript
- **Drizzle ORM** for database operations
- **Zod** for validation
- **PostgreSQL** (optional, defaults to in-memory)
- **Smart Contract Integration** for secure reward distribution

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and Web3 integration
│   │   └── contexts/      # React contexts
├── server/                # Backend Express application
│   ├── analytics.ts       # Analytics service
│   ├── reward-service.ts  # Reward calculation and management
│   ├── smart-contract-service.ts # Smart contract integration
│   ├── routes.ts          # API routes
│   └── storage.ts         # Data storage abstraction
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema and types
└── contracts/             # Smart contracts for reward distribution
    ├── KILTRewardPool.sol # Main reward contract
    └── deploy.js          # Deployment scripts
```

## 🔧 Configuration

### Environment Variables

```env
# Database (optional - uses in-memory storage if not provided)
DATABASE_URL=postgresql://username:password@localhost:5432/kilt_lp

# Smart Contract Configuration
KILT_REWARD_POOL_ADDRESS=0x... # Deployed reward pool contract address
REWARD_WALLET_ADDRESS=0x... # Treasury wallet address for rewards
REWARD_WALLET_PRIVATE_KEY=0x... # Private key for reward wallet
BASE_RPC_URL=https://mainnet.base.org # Base network RPC endpoint

# Development
NODE_ENV=development
```

### Database Setup

The application supports both in-memory storage (default) and PostgreSQL:

```bash
# For PostgreSQL setup
npm run db:push
```

## 📊 API Endpoints

### Core Endpoints
- `GET /api/users/:address` - Get user data
- `POST /api/users` - Create new user
- `GET /api/users/:userId/positions` - Get user positions
- `POST /api/positions` - Create new position
- `GET /api/users/:userId/rewards` - Get user rewards
- `POST /api/rewards/claim` - Claim rewards

### Data Endpoints
- `GET /api/kilt-data` - Live KILT token data
- `GET /api/pool-stats` - Pool metrics
- `GET /api/analytics/*` - Analytics data

## 🎯 Component Guide

### Main Dashboard
Central hub with 6 tabs:
- **Overview**: KILT data and welcome interface
- **Add Liquidity**: Position creation with sliders
- **Positions**: LP position management
- **Rewards**: Treasury reward tracking
- **Analytics**: Performance metrics
- **Integration**: Technical features

### Wallet Integration
- Automatic wallet detection
- Mobile wallet deep link support
- Base network configuration
- Connection state management

### Liquidity Management
- Uniswap V3 position creation
- Price range configuration
- Position size sliders
- Fee tier selection

## 🏆 Reward System

### Base Rewards
- **Base APR**: 47.2%
- **Treasury Allocation**: 2,905,600 KILT (1% of total supply)
- **Minimum Position**: $100 USD value
- **Lock Period**: 90 days from liquidity addition

### Multipliers
- **Time Multiplier**: 1.0x to 2.0x based on staking duration
- **Size Multiplier**: 1.0x to 1.8x based on position value

### Reward Calculation
```typescript
effectiveAPR = baseAPR * timeMultiplier * sizeMultiplier
dailyRewards = (positionValue * effectiveAPR) / 365
```

## 📱 Mobile Support

### Supported Wallets
- MetaMask Mobile
- Trust Wallet
- Coinbase Wallet
- Rainbow Wallet

### Mobile Features
- Responsive design
- Touch-optimized interface
- Deep link integration
- Mobile-first navigation

## 🔐 Security

- Type-safe database operations
- Input validation with Zod
- Secure wallet connections
- Error boundary implementation
- SQL injection prevention

## 🚀 Deployment

### Vercel Deployment
```bash
# Build the application
npm run build

# Deploy to Vercel
vercel --prod
```

### Environment Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Deploy frontend and backend

## 📈 Analytics

### Tracked Metrics
- Position snapshots over time
- Fee earning events
- Performance calculations
- User portfolio analytics
- Pool metrics history

### Data Visualization
- Historical charts
- Performance dashboards
- Reward tracking
- Portfolio analytics

## 🛠️ Development

### Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push database schema
npm run db:studio    # Open database studio
```

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Husky for git hooks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information

---

Built with ❤️ for the KILT ecosystem