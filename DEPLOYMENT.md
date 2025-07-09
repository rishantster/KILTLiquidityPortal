# KILT Liquidity Incentive Portal - Deployment Guide

## Overview

This guide covers the deployment of the KILT Liquidity Incentive Portal with smart contract integration for secure reward distribution.

## Prerequisites

- Node.js 18+
- PostgreSQL database (production)
- Base network wallet with ETH for gas fees
- KILT tokens for reward distribution

## Smart Contract Deployment

### 1. Deploy KILTRewardPool Contract

```bash
# Install Hardhat dependencies
npm install --save-dev hardhat @openzeppelin/contracts ethers

# Configure Hardhat for Base network
# Edit hardhat.config.js with Base network settings

# Deploy contract
npx hardhat run contracts/deploy.js --network base
```

### 2. Contract Configuration

The deployment script will output:
- Contract address
- Required environment variables
- Setup instructions

### 3. Environment Variables

Set up the following environment variables:

```env
# Database
DATABASE_URL=postgresql://username:password@host:5432/kilt_lp

# Smart Contract
KILT_REWARD_POOL_ADDRESS=0x... # From deployment output
REWARD_WALLET_ADDRESS=0x... # Treasury wallet for rewards
REWARD_WALLET_PRIVATE_KEY=0x... # Private key for reward wallet
BASE_RPC_URL=https://mainnet.base.org

# KILT Token
KILT_TOKEN_ADDRESS=0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8

# Application
NODE_ENV=production
PORT=5000
```

## Application Deployment

### 1. Database Setup

```bash
# Run database migrations
npm run db:push

# Verify database connection
npm run db:check
```

### 2. Build Application

```bash
# Install dependencies
npm install

# Build frontend and backend
npm run build

# Start production server
npm start
```

### 3. Smart Contract Setup

After deployment, complete the following setup:

1. **Fund Reward Wallet**: Transfer KILT tokens to the reward wallet address
2. **Set Allowance**: Approve the contract to spend KILT tokens
3. **Update Reward Wallet**: If needed, update the contract with the correct reward wallet

```bash
# Example: Update reward wallet in contract
npx hardhat run scripts/update-reward-wallet.js --network base
```

## Smart Contract Functions

### Owner Functions (Contract Management)

- `addLiquidityPosition(user, nftTokenId, liquidityValue)` - Add LP position
- `removeLiquidityPosition(user, nftTokenId)` - Remove LP position
- `updateLiquidityValue(user, nftTokenId, newValue)` - Update position value
- `distributeDailyRewards()` - Distribute daily rewards
- `updateRewardWallet(newWallet)` - Update reward wallet address

### User Functions

- `claimRewards(nftTokenIds[])` - Claim accumulated rewards
- `getClaimableRewards(user)` - View claimable rewards
- `getPendingRewards(user)` - View pending rewards (still locked)

### View Functions

- `getProgramInfo()` - Get program details and statistics
- `calculateDailyRewards(user, nftTokenId)` - Calculate daily rewards
- `rewardWallet()` - Get current reward wallet address

## Security Considerations

### 1. Private Key Management

- Store private keys securely (use environment variables)
- Never commit private keys to version control
- Use hardware wallets for production reward wallet

### 2. Contract Security

- The contract implements OpenZeppelin security patterns
- ReentrancyGuard prevents reentrancy attacks
- Pausable allows emergency stops
- Ownable restricts admin functions

### 3. Access Control

- Only contract owner can add/remove positions
- Only users can claim their own rewards
- Reward wallet must approve token spending

## Monitoring and Maintenance

### 1. Daily Operations

```bash
# Check reward wallet balance
curl -X GET "https://your-api.com/api/rewards/wallet-balance"

# Distribute daily rewards (automated)
curl -X POST "https://your-api.com/api/rewards/distribute-daily"
```

### 2. Health Checks

- Monitor contract balance
- Check reward wallet allowance
- Verify database synchronization
- Monitor application logs

### 3. Emergency Procedures

If issues occur:

1. **Pause Contract**: Call `pause()` to stop all operations
2. **Emergency Withdraw**: Use `emergencyWithdraw()` if needed
3. **Update Reward Wallet**: Change reward wallet if compromised

## API Endpoints

### Smart Contract Integration

- `POST /api/rewards/claim` - Claim rewards via smart contract
- `GET /api/rewards/claimable/:address` - Get claimable rewards
- `GET /api/rewards/pending/:address` - Get pending rewards
- `GET /api/contract/program-info` - Get contract program info
- `GET /api/contract/reward-wallet` - Get current reward wallet

### Position Management

- `POST /api/positions` - Add liquidity position
- `PUT /api/positions/:id` - Update position value
- `DELETE /api/positions/:id` - Remove position

## Troubleshooting

### Common Issues

1. **Contract Not Available**
   - Check `KILT_REWARD_POOL_ADDRESS` environment variable
   - Verify contract is deployed on Base network
   - Check private key permissions

2. **Insufficient Reward Wallet Balance**
   - Transfer more KILT tokens to reward wallet
   - Check token allowance for contract

3. **Transaction Failures**
   - Verify gas price settings
   - Check Base network connectivity
   - Ensure wallet has sufficient ETH for gas

### Logs and Debugging

```bash
# View application logs
tail -f logs/application.log

# Check smart contract events
npx hardhat run scripts/check-events.js --network base
```

## Backup and Recovery

### 1. Database Backup

```bash
# Create database backup
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

### 2. Smart Contract Recovery

If contract needs to be replaced:

1. Deploy new contract
2. Update environment variables
3. Migrate position data
4. Update reward wallet approval

## Performance Optimization

### 1. Database Optimization

- Use connection pooling
- Implement query caching
- Regular database maintenance

### 2. Smart Contract Optimization

- Batch operations when possible
- Monitor gas usage
- Optimize reward calculations

## Support and Resources

- [Base Network Documentation](https://docs.base.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs/)
- [KILT Protocol](https://www.kilt.io/)

For technical support, contact the development team with:
- Error logs
- Transaction hashes
- Contract addresses
- Environment details