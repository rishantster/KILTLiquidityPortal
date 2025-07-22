# Secure Multi-Token Treasury Pool Deployment Guide

## Architecture Overview

### ✅ Secure Multi-Token Design
- **Contract holds multiple tokens directly** - no external wallet private keys needed
- **Multi-token reward support** - KILT, BTC, ETH, SOL, BNB, DOT, or any ERC20 token
- **Admin-controlled funding** - only authorized addresses can deposit any supported token
- **Emergency controls** - owner can pause/unpause and emergency withdraw any token
- **Individual reward locks** - each reward has its own 7-day countdown regardless of token type
- **Batch claiming** - users can claim multiple rewards of different tokens in one transaction
- **Comprehensive access controls** - multiple admin levels with token-specific permissions

### ❌ Removed Security Risks
- No private keys in environment variables
- No external wallet dependencies  
- No centralized token custody outside contract
- No single-token limitations

## Deployment Steps

### 1. Deploy Contract
```solidity
// Deploy MultiTokenTreasuryPool with:
// _primaryToken: 0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8 (KILT on Base)
// _initialAdmin: Your admin wallet address
```

### 2. Environment Variables (Safe)
```bash
# Only need contract address - no private keys!
MULTI_TOKEN_TREASURY_POOL_ADDRESS=0x... # deployed contract address
KILT_TOKEN_ADDRESS=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8
```

### 3. Add Supported Tokens (Owner Only)
```javascript
// Add supported reward tokens
await treasuryPool.addSupportedToken("0x...", "WBTC");  // Wrapped Bitcoin
await treasuryPool.addSupportedToken("0x...", "WETH");  // Wrapped Ethereum  
await treasuryPool.addSupportedToken("0x...", "SOL");   // Solana (bridged)
await treasuryPool.addSupportedToken("0x...", "BNB");   // Binance Coin
await treasuryPool.addSupportedToken("0x...", "DOT");   // Polkadot (bridged)
```

### 4. Fund Treasury (Any Token)
```javascript
// Admin calls contract.fundTreasury(token, amount)
// Transfers tokens from admin wallet to contract
await treasuryPool.fundTreasury(KILT_ADDRESS, parseUnits("500000", 18)); // 500K KILT
await treasuryPool.fundTreasury(WBTC_ADDRESS, parseUnits("5", 8));       // 5 WBTC
await treasuryPool.fundTreasury(WETH_ADDRESS, parseUnits("100", 18));    // 100 ETH
```

### 5. Backend Integration
```javascript
// Update smart-contract-service.ts to use multi-token treasury contract
const treasuryPool = new Contract(MULTI_TOKEN_TREASURY_POOL_ADDRESS, TREASURY_ABI, signer);

// Register positions (same as before)
await treasuryPool.registerPosition(tokenId, userAddress, liquidityAmount);

// Add rewards in any supported token (backend controlled)
await treasuryPool.addReward(userAddress, KILT_ADDRESS, rewardAmount);  // KILT rewards
await treasuryPool.addReward(userAddress, WBTC_ADDRESS, btcRewardAmount); // BTC rewards
await treasuryPool.addReward(userAddress, WETH_ADDRESS, ethRewardAmount); // ETH rewards

// Users claim multiple token rewards in single transaction
await treasuryPool.claimRewards([rewardIndex1, rewardIndex2, rewardIndex3]);

// Get treasury balances for all tokens
const [tokens, balances] = await treasuryPool.getAllTreasuryBalances();
```

## Key Benefits

### 🔒 Maximum Security
- Contract holds funds, not external wallets
- No private keys in environment variables
- OpenZeppelin security patterns (ReentrancyGuard, Pausable, Ownable)
- Per-token validation and emergency controls

### 💰 Multi-Token Treasury Management
- Admins can refill treasury with any supported token using `fundTreasury(token, amount)`
- Emergency withdraw capability for owner on per-token basis
- Real-time treasury balance monitoring for all supported tokens
- Dynamic token addition/removal (owner only)

### 🎯 Enhanced User Experience  
- Users claim rewards directly from contract in multiple tokens
- Rolling 7-day unlock system per individual reward
- Batch claiming of multiple rewards across different tokens in single transaction
- Support for high-value tokens (BTC, ETH) and ecosystem tokens (SOL, BNB, DOT)

### 📊 Complete Transparency
- All transactions on-chain with token-specific events
- Treasury balance publicly visible for all supported tokens
- Complete audit trail of rewards by token type
- Public view functions for supported tokens list

## Migration from Current System

1. **Deploy new treasury contract**
2. **Update backend to use treasury contract methods**
3. **Migrate reward data** (existing rewards can be added to contract)
4. **Fund treasury** with initial KILT allocation
5. **Test claim functionality** with small amounts first

## Contract Functions

### Admin Functions
- `fundTreasury(token, amount)` - Add any supported token to treasury
- `registerPosition()` - Register Uniswap positions
- `addReward(user, token, amount)` - Add rewards in any supported token
- `emergencyWithdraw(token, amount, recipient)` - Emergency withdrawal (owner only)

### Owner Functions  
- `addSupportedToken(token, symbol)` - Add new reward token
- `removeSupportedToken(token)` - Remove token (emergency only)
- `authorizeAdmin()` / `revokeAdmin()` - Manage admin permissions
- `updateLockPeriod()` - Change reward lock duration

### User Functions
- `claimRewards(indexes)` - Claim unlocked rewards (multi-token support)
- `getClaimableRewards()` - View claimable amounts by token
- `getUserRewards()` - View all user rewards with token types
- `getUserPositions()` - View registered positions

### View Functions
- `getTreasuryBalance(token)` - Balance for specific token
- `getAllTreasuryBalances()` - All token balances  
- `getSupportedTokens()` - List of supported reward tokens
- All position and reward data publicly readable

## Example Multi-Token Reward Scenarios

### Scenario 1: Performance-Based Rewards
```javascript
// Top performers get BTC rewards
await addReward(topUser, WBTC_ADDRESS, parseUnits("0.1", 8)); // 0.1 BTC

// Regular participants get KILT
await addReward(regularUser, KILT_ADDRESS, parseUnits("1000", 18)); // 1000 KILT
```

### Scenario 2: Milestone Rewards
```javascript
// TVL milestone reached - distribute ETH rewards
await addReward(user1, WETH_ADDRESS, parseUnits("2", 18)); // 2 ETH
await addReward(user2, WETH_ADDRESS, parseUnits("1", 18)); // 1 ETH
```

### Scenario 3: Ecosystem Integration
```javascript
// Partner protocol launches - SOL rewards
await addReward(earlyAdopter, SOL_ADDRESS, parseUnits("50", 9)); // 50 SOL
```

This architecture eliminates all private key security risks while maintaining full functionality and admin control over the reward system.