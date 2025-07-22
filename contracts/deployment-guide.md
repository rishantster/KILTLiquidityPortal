# Secure KILT Treasury Pool Deployment Guide

## Architecture Overview

### ✅ Secure Design
- **Contract holds KILT tokens directly** - no external wallet private keys
- **Admin-controlled funding** - only authorized addresses can deposit
- **Emergency controls** - owner can pause/unpause and emergency withdraw
- **Individual reward locks** - each reward has its own 7-day countdown
- **Comprehensive access controls** - multiple admin levels

### ❌ Removed Security Risks
- No private keys in environment variables
- No external wallet dependencies
- No centralized token custody outside contract

## Deployment Steps

### 1. Deploy Contract
```solidity
// Deploy KILTTreasuryPool with:
// _kiltToken: 0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8 (KILT on Base)
// _initialAdmin: Your admin wallet address
```

### 2. Environment Variables (Safe)
```bash
# Only need contract address - no private keys!
KILT_TREASURY_POOL_ADDRESS=0x... # deployed contract address
KILT_TOKEN_ADDRESS=0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8
```

### 3. Fund Treasury
```javascript
// Admin calls contract.fundTreasury(amount)
// Transfers KILT from admin wallet to contract
await treasuryPool.fundTreasury(parseUnits("500000", 18)); // 500K KILT
```

### 4. Backend Integration
```javascript
// Update smart-contract-service.ts to use treasury contract
const treasuryPool = new Contract(TREASURY_POOL_ADDRESS, TREASURY_ABI, signer);

// Register positions
await treasuryPool.registerPosition(tokenId, userAddress, liquidityAmount);

// Add rewards (backend controlled)
await treasuryPool.addReward(userAddress, rewardAmount);

// Users claim directly from contract
await treasuryPool.claimRewards([rewardIndex1, rewardIndex2]);
```

## Key Benefits

### 🔒 Maximum Security
- Contract holds funds, not external wallets
- No private keys in environment variables
- OpenZeppelin security patterns (ReentrancyGuard, Pausable, Ownable)

### 💰 Treasury Management
- Admins can refill treasury anytime with `fundTreasury()`
- Emergency withdraw capability for owner
- Real-time treasury balance monitoring

### 🎯 User Experience
- Users claim rewards directly from contract
- Rolling 7-day unlock system
- Batch claiming of multiple rewards

### 📊 Transparency
- All transactions on-chain
- Treasury balance publicly visible
- Complete audit trail of rewards

## Migration from Current System

1. **Deploy new treasury contract**
2. **Update backend to use treasury contract methods**
3. **Migrate reward data** (existing rewards can be added to contract)
4. **Fund treasury** with initial KILT allocation
5. **Test claim functionality** with small amounts first

## Contract Functions

### Admin Functions
- `fundTreasury()` - Add KILT tokens to treasury
- `registerPosition()` - Register Uniswap positions
- `addReward()` - Add rewards for users
- `emergencyWithdraw()` - Emergency treasury withdrawal (owner only)

### User Functions
- `claimRewards()` - Claim unlocked rewards
- `getClaimableRewards()` - View claimable amounts
- `getUserRewards()` - View all user rewards
- `getUserPositions()` - View registered positions

### View Functions
- `getTreasuryBalance()` - Current treasury balance
- All position and reward data publicly readable

This architecture eliminates all private key security risks while maintaining full functionality and admin control over the reward system.