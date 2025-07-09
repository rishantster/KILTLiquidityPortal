# KILT Reward System Implementation

## Smart Contract-Based Reward System

### Overview
The KILT Liquidity Incentive Program now uses a smart contract-based reward system with proper 90-day token locking mechanism.

### Key Components

#### 1. Smart Contract (`KILTRewardPool.sol`)
- **Contract Address**: To be deployed on Base network
- **KILT Token**: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8`
- **Reward Wallet**: Configurable address for token distribution
- **90-Day Lock**: Smart contract enforces 90-day lock period from liquidity addition
- **Top 100 System**: Only top 100 participants by liquidity value earn rewards

#### 2. Reward Distribution
- **Treasury Allocation**: 2,905,600 KILT tokens (1% of total supply)
- **Program Duration**: 365 days
- **Daily Budget**: ~7,960 KILT tokens per day
- **Distribution Formula**: 
  ```
  R_u = (w1 * L_u/T_top100 + w2 * D_u/365) * R/365/100 * (1 - (rank-1)/99)
  ```
  - w1 = 0.6 (liquidity weight)
  - w2 = 0.4 (time weight)
  - L_u = user's liquidity value
  - T_top100 = total top 100 liquidity
  - D_u = days active
  - R = daily reward budget
  - rank = user's ranking position

#### 3. Reward Wallet Configuration
- **Separate Wallet**: Rewards come from a dedicated wallet address (not the contract)
- **Configurable**: Wallet address can be updated by contract owner
- **Token Approval**: Reward wallet must approve contract to transfer KILT tokens
- **Balance Monitoring**: System monitors reward wallet balance

### Security Features

#### 1. Smart Contract Security
- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Contract can be paused in emergencies
- **Ownable**: Only contract owner can manage positions
- **SafeERC20**: Uses OpenZeppelin's safe token transfer library

#### 2. 90-Day Lock Mechanism
- **Lock Period**: 90 days from liquidity addition timestamp
- **Immutable**: Cannot be bypassed or modified
- **Automatic**: Lock status checked on-chain during claim
- **Transparent**: Users can see exact lock end time

#### 3. Access Control
- **Owner Only**: Only contract owner can add/remove positions
- **User Claims**: Only users can claim their own rewards
- **Allowance System**: Reward wallet must approve contract before distribution

### Implementation Details

#### 1. Contract Functions
- `addLiquidityPosition()`: Add new liquidity position
- `removeLiquidityPosition()`: Remove liquidity position
- `updateLiquidityValue()`: Update position value
- `distributeDailyRewards()`: Daily reward distribution
- `claimRewards()`: User reward claiming
- `updateRewardWallet()`: Update reward wallet address

#### 2. Backend Integration
- **Smart Contract Service**: Handles all contract interactions
- **Reward Service**: Integrates with smart contract for claiming
- **Database Sync**: Keeps database in sync with contract state
- **Fallback System**: Falls back to database if contract unavailable

#### 3. Frontend Integration
- **Claim Interface**: Users can claim rewards through UI
- **Lock Status**: Shows remaining lock time
- **Balance Display**: Shows claimable vs pending rewards
- **Transaction History**: Complete claim transaction history

### Environment Variables Required

```env
KILT_REWARD_POOL_ADDRESS=0x... # Deployed contract address
REWARD_WALLET_ADDRESS=0x... # Reward wallet address
REWARD_WALLET_PRIVATE_KEY=0x... # Private key for reward wallet
BASE_RPC_URL=https://mainnet.base.org # Base network RPC
```

### Deployment Steps

1. **Deploy Contract**:
   ```bash
   npx hardhat run contracts/deploy.js --network base
   ```

2. **Set Reward Wallet**:
   - Update `REWARD_WALLET_ADDRESS` in environment
   - Call `updateRewardWallet()` if needed

3. **Fund Reward Wallet**:
   - Transfer KILT tokens to reward wallet
   - Approve contract to spend tokens

4. **Start Program**:
   - Begin adding liquidity positions
   - Run daily reward distribution

### Current Status

✅ **Completed**:
- Smart contract implementation
- 90-day lock mechanism
- Reward wallet configuration
- Backend integration
- Claim functionality

⏳ **Pending**:
- Contract deployment
- Reward wallet setup
- Production environment configuration

### Next Steps

1. **Deploy Contract**: Deploy to Base network with proper parameters
2. **Configure Wallet**: Set up reward wallet with KILT tokens
3. **Test System**: Test with real liquidity positions
4. **Launch Program**: Begin accepting liquidity providers

### Benefits

- **Real Security**: Actual smart contract token locking
- **Transparency**: All operations on-chain and verifiable
- **Flexibility**: Configurable reward wallet for treasury management
- **Reliability**: Proven OpenZeppelin security patterns
- **Scalability**: Efficient gas usage and batch operations