# KILT Liquidity Incentive Portal - Updated Documentation

## Overview

The KILT Liquidity Incentive Portal is a comprehensive DeFi application that enables users to provide liquidity to KILT/ETH Uniswap V3 pools on the Base network and earn rewards from the KILT treasury allocation. The system implements a Top 100 ranking mechanism with sophisticated reward calculations.

## Latest Updates (July 2025)

### Recent Improvements
- **Enhanced Logo Integration**: Comprehensive logo sizing and alignment fixes across all components
- **Improved Landing Page**: Clean design with official KILT Protocol social media links
- **Code Organization**: Systematic codebase cleanup with proper import organization
- **Visual Enhancements**: Better contrast and visibility for pink KILT logo
- **Social Media Integration**: Official links to X, GitHub, Discord, Telegram, and Medium

### Key Features Implemented
1. **Real-time KILT Data**: Live token price and market data integration via CoinGecko API
2. **Top 100 Ranking System**: Sophisticated reward calculation using Liquidity + Duration Weighted Rule
3. **Mobile Wallet Support**: Deep link integration for MetaMask, Trust Wallet, Coinbase Wallet, and Rainbow
4. **Advanced Analytics**: Position snapshots, performance metrics, and fee tracking
5. **Comprehensive UI/UX**: Glassmorphism design with smooth animations and responsive layout

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **UI Components**: Shadcn/ui built on Radix UI
- **Styling**: Tailwind CSS with custom KILT branding
- **State Management**: TanStack Query v5 for server state
- **Web3 Integration**: Viem for type-safe Ethereum interactions

### Backend Stack
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful endpoints with Zod validation
- **Real-time Data**: CoinGecko API for live token data
- **Reward System**: Complex calculation engine with Top 100 ranking

### Database Schema
```sql
-- Core Tables
users: User wallet addresses and metadata
lp_positions: Uniswap V3 NFT positions with ranges and liquidity
rewards: KILT treasury reward tracking with Top 100 system
pool_stats: Real-time pool metrics and statistics

-- Analytics Tables
position_snapshots: Historical position data
pool_metrics_history: Time-series pool data
user_analytics: Portfolio performance tracking
fee_events: Complete fee earning history
performance_metrics: ROI and IL calculations
daily_rewards: Day-by-day reward accumulation
```

## Component Architecture

### Core Components
- **MainDashboard**: Central hub with 5-tab interface
- **LiquidityMint**: Uniswap V3 position creation
- **UserPositions**: Complete LP position management
- **RewardsTracking**: KILT treasury reward system
- **AnalyticsDashboard**: Advanced performance analytics
- **WalletConnect**: Multi-wallet integration

### Key Services
- **RewardService**: Top 100 ranking calculations
- **AnalyticsService**: Historical data tracking
- **KiltDataService**: Real-time token data
- **UniswapV3Service**: Pool interaction management

## Reward System Details

### Top 100 Ranking Formula
```
R_u = (w1 * L_u/T_top100 + w2 * D_u/365) * R/365/100 * (1 - (rank-1)/99)

Where:
- w1 = 0.6 (liquidity weight)
- w2 = 0.4 (time weight)
- L_u = User's liquidity amount
- T_top100 = Total liquidity of top 100 participants
- D_u = Days active
- R = Daily reward budget (7,960 KILT/day)
- rank = User's ranking position (1-100)
```

### Key Parameters
- **Treasury Allocation**: 2,905,600 KILT (1% of total supply)
- **Program Duration**: 365 days
- **Daily Budget**: ~7,960 KILT/day
- **Lock Period**: 90 days from liquidity addition
- **Participant Limit**: Top 100 by liquidity value

## Deployment Information

### Environment Requirements
- Node.js 18+
- PostgreSQL database
- Base network RPC access
- CoinGecko API (no key required)

### Build Commands
```bash
# Development
npm run dev

# Production build
npm run build

# Database migration
npm run db:push

# Database studio
npm run db:studio
```

### Environment Variables
```env
DATABASE_URL=postgresql://...
NODE_ENV=development|production
VITE_WALLETCONNECT_PROJECT_ID=...
```

## API Endpoints

### Core Endpoints
- `GET /api/kilt-data` - Real-time KILT token data
- `GET /api/rewards/user-apr/:address` - User's personal APR
- `GET /api/rewards/top100-analytics` - Ranking system analytics
- `GET /api/users/:address` - User profile data
- `POST /api/rewards/claim` - Claim accumulated rewards

### Analytics Endpoints
- `GET /api/analytics/position-snapshots/:id` - Position history
- `GET /api/analytics/pool-metrics/:address` - Pool performance
- `GET /api/analytics/user-dashboard/:address` - User analytics

## Security Features

### Smart Contract Integration
- **Uniswap V3 Contracts**: Direct integration with official contracts
- **Position Management**: Secure NFT position handling
- **Reward Distribution**: Automated KILT token transfers
- **Access Control**: User address verification

### Data Validation
- **Zod Schemas**: Type-safe API validation
- **Input Sanitization**: Protection against malicious inputs
- **Rate Limiting**: API endpoint protection
- **Error Handling**: Comprehensive error management

## Performance Optimizations

### Frontend Optimizations
- **Code Splitting**: Lazy loading for better performance
- **Image Optimization**: Optimized KILT logo assets
- **Caching**: Efficient query caching with TanStack Query
- **Bundle Size**: Minimized JavaScript bundles

### Backend Optimizations
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Response Caching**: Cached API responses
- **Logging**: Comprehensive request logging

## Mobile Compatibility

### Mobile Wallet Integration
- **Deep Links**: Direct wallet app connections
- **Responsive Design**: Mobile-optimized interface
- **Touch Optimization**: Touch-friendly interactions
- **Wallet Detection**: Automatic wallet app detection

### Supported Wallets
- MetaMask Mobile
- Trust Wallet
- Coinbase Wallet
- Rainbow Wallet
- WalletConnect compatible wallets

## Future Enhancements

### Planned Features
- **Advanced Charting**: More sophisticated analytics charts
- **Notification System**: Real-time reward notifications
- **Social Features**: Community leaderboards
- **Portfolio Tracking**: Cross-platform position tracking

### Technical Improvements
- **WebSocket Integration**: Real-time data streaming
- **Graph Protocol**: Decentralized data indexing
- **Layer 2 Optimization**: Gas cost reduction
- **Smart Contract Upgrades**: Enhanced reward mechanisms

## Troubleshooting

### Common Issues
- **Wallet Connection**: Ensure Base network is added to wallet
- **Transaction Failures**: Check gas limits and network congestion
- **Data Loading**: Verify API endpoints and database connections
- **Reward Calculations**: Confirm position eligibility and timing

### Support Resources
- **Documentation**: Comprehensive API and component docs
- **Community**: Discord and Telegram support channels
- **GitHub Issues**: Bug reports and feature requests
- **Developer Resources**: Technical integration guides

## Conclusion

The KILT Liquidity Incentive Portal represents a sophisticated DeFi application that successfully combines advanced reward mechanics with intuitive user experience. The Top 100 ranking system provides fair and transparent reward distribution while encouraging long-term liquidity provision.

The application demonstrates best practices in modern web development, blockchain integration, and user interface design, making it a comprehensive solution for decentralized liquidity incentives.

---

*Last updated: July 9, 2025*
*Version: 2.0.0*
*Author: KILT Protocol Team*