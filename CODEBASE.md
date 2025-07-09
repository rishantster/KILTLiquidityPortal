# KILT Liquidity Incentive Portal - Codebase Overview

## Architecture Summary

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript, Vite build system
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with glassmorphism dark theme
- **State Management**: TanStack Query for server state
- **Web3 Integration**: Viem for Ethereum interactions
- **Routing**: Wouter for client-side routing

### Backend (Express.js + TypeScript)
- **Framework**: Express.js with TypeScript and ESM modules
- **Database**: PostgreSQL with Drizzle ORM (fallback to in-memory)
- **Smart Contract**: Ethers.js integration for reward distribution
- **API Design**: RESTful endpoints with Zod validation
- **Real-time Data**: CoinGecko API for KILT token data

### Smart Contract System
- **KILTRewardPool**: Solidity contract with 90-day token locking
- **Security**: OpenZeppelin patterns (ReentrancyGuard, Pausable, Ownable)
- **Reward Wallet**: Configurable treasury wallet for token distribution
- **Network**: Deployed on Base (Ethereum L2)

## Key Components

### Dashboard Structure (6 Tabs)
1. **Overview**: Key metrics, KILT price, quick actions
2. **Liquidity**: Add/manage Uniswap V3 positions
3. **Positions**: View/manage existing LP positions
4. **Rewards**: Track and claim KILT rewards
5. **Analytics**: Historical performance data
6. **Rebalance**: Automated position optimization

### Core Services

#### Frontend Services
- **WalletContext**: Web3 wallet connection management
- **useUnifiedDashboard**: Centralized data flow hook
- **Position Management**: Uniswap V3 NFT position handling
- **Gas Estimation**: Real-time transaction cost calculation

#### Backend Services
- **RewardService**: Complex reward calculation with Top 100 ranking
- **SmartContractService**: Blockchain interaction for secure rewards
- **AnalyticsService**: Historical data tracking and metrics
- **KiltDataService**: Real-time token data integration

### Database Schema
- **users**: Wallet addresses and user preferences
- **lpPositions**: Uniswap V3 NFT positions with metadata
- **rewards**: KILT treasury reward tracking (synced with smart contract)
- **dailyRewards**: Daily reward distribution history
- **Analytics tables**: Position snapshots, performance metrics, fee events

## Reward System Architecture

### Top 100 Ranking System
- **Eligibility**: Only top 100 participants by liquidity value
- **Formula**: `R_u = (w1 * L_u/T_top100 + w2 * D_u/365) * R/365/100 * (1 - (rank-1)/99)`
- **Weights**: 60% liquidity, 40% time
- **APR Range**: 66% (rank 1) to 0.66% (rank 100)

### Smart Contract Integration
- **90-Day Lock**: Immutable token locking period
- **Reward Wallet**: Separate treasury wallet for distribution
- **Claim Process**: On-chain verification and token transfer
- **Security**: OpenZeppelin security patterns

### Treasury Management
- **Allocation**: 2,905,600 KILT tokens (1% of total supply)
- **Duration**: 365-day program
- **Daily Budget**: ~7,960 KILT tokens per day
- **Distribution**: Automated daily reward calculation

## Key Features

### Wallet Integration
- **Multi-Wallet Support**: MetaMask, Trust Wallet, Coinbase Wallet, Rainbow
- **Mobile Compatibility**: Deep link support for mobile wallets
- **Network Detection**: Automatic Base network detection
- **Connection State**: Persistent wallet connection management

### Liquidity Management
- **Uniswap V3 Integration**: Full NFT position lifecycle
- **Position Types**: Support for all KILT-containing pools
- **Range Visualization**: Panoptic-style curved range displays
- **One-Click Actions**: Simplified liquidity addition

### Analytics System
- **Position Tracking**: Historical position performance
- **Fee Analysis**: Complete fee earning history
- **Performance Metrics**: Impermanent loss and ROI calculations
- **Pool Metrics**: Real-time TVL, volume, and price data

### Rebalancing Assistant
- **Strategies**: Conservative, Balanced, Aggressive, Custom
- **Efficiency Analysis**: Position health scoring
- **Automation**: Batch rebalancing execution
- **Gas Optimization**: Cost-effective rebalancing

## Security Features

### Smart Contract Security
- **Immutable Logic**: On-chain reward distribution rules
- **Access Control**: Owner-only position management
- **Emergency Controls**: Pause and emergency withdrawal
- **Token Safety**: SafeERC20 for secure transfers

### Frontend Security
- **Input Validation**: Zod schema validation
- **Transaction Verification**: Gas estimation and confirmation
- **Error Handling**: Comprehensive error states
- **User Feedback**: Clear transaction status

### Backend Security
- **Database Validation**: Drizzle ORM with TypeScript
- **API Security**: Request validation and rate limiting
- **Environment Variables**: Secure configuration management
- **Error Logging**: Comprehensive error tracking

## Technical Implementation

### Data Flow
1. **User Authentication**: Wallet connection via MetaMask
2. **Position Creation**: Uniswap V3 NFT minting
3. **Smart Contract Registration**: Position registered in KILTRewardPool
4. **Reward Calculation**: Daily reward distribution
5. **Token Locking**: 90-day lock period enforcement
6. **Claim Process**: On-chain reward claiming

### Performance Optimizations
- **Query Optimization**: TanStack Query caching
- **Bundle Optimization**: Vite code splitting
- **Database Indexing**: Optimized queries
- **Smart Contract Efficiency**: Gas-optimized operations

### Mobile Optimization
- **Responsive Design**: Tailwind CSS breakpoints
- **Touch Interactions**: Mobile-friendly controls
- **Wallet Deep Links**: Direct wallet app integration
- **Compact Interface**: Space-efficient layouts

## Development Workflow

### Build Process
- **Frontend**: Vite builds to `dist/public`
- **Backend**: TSX compilation with hot reloading
- **Smart Contract**: Hardhat compilation and deployment
- **Database**: Drizzle migrations

### Testing Strategy
- **Unit Tests**: Component and service testing
- **Integration Tests**: API endpoint testing
- **Smart Contract Tests**: Hardhat testing framework
- **E2E Tests**: Full user flow testing

### Deployment
- **Frontend**: Static asset serving
- **Backend**: Express.js server
- **Database**: PostgreSQL with connection pooling
- **Smart Contract**: Base network deployment

## Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://...

# Smart Contract
KILT_REWARD_POOL_ADDRESS=0x...
REWARD_WALLET_ADDRESS=0x...
REWARD_WALLET_PRIVATE_KEY=0x...
BASE_RPC_URL=https://mainnet.base.org

# Application
NODE_ENV=production
PORT=5000
```

### API Endpoints
- **Users**: `/api/users/:address`
- **Positions**: `/api/positions`
- **Rewards**: `/api/rewards`
- **Analytics**: `/api/analytics`
- **KILT Data**: `/api/kilt-data`

## Future Enhancements

### Governance Integration
- **Community Voting**: Parameter governance
- **Transparent Updates**: On-chain proposals
- **Decentralized Management**: Community control

### Advanced Features
- **Compound Rewards**: Automatic reinvestment
- **Flexible Lock Periods**: User-configurable locks
- **Cross-Chain Support**: Multi-network expansion

### Analytics Improvements
- **Real-time Dashboards**: Live contract analytics
- **Performance Metrics**: Detailed statistics
- **Health Monitoring**: Automated checks

## Maintenance

### Daily Operations
- **Reward Distribution**: Automated daily calculations
- **Wallet Balance**: Treasury monitoring
- **System Health**: Performance monitoring

### Regular Tasks
- **Database Maintenance**: Query optimization
- **Smart Contract Monitoring**: Event tracking
- **Security Updates**: Dependency updates

This codebase represents a comprehensive, production-ready DeFi liquidity incentive platform with advanced features, robust security, and excellent user experience.