# Smart Contract Deployment Guide

## Overview
This guide will help you deploy the `BasicTreasuryPool` smart contract to the Base network for handling KILT token reward distribution.

## Prerequisites
1. MetaMask wallet with Base network configured
2. ETH for gas fees (approximately 0.01 ETH for deployment)
3. KILT tokens for treasury funding

## Deployment Steps

### Step 1: Prepare Contract for Compilation
1. Copy the contract source from `contracts/BasicTreasuryPool.sol`
2. The contract is already optimized for deployment without external dependencies

### Step 2: Deploy Using Remix IDE (Recommended)
1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create a new file called `BasicTreasuryPool.sol`
3. Paste the contract code from `contracts/BasicTreasuryPool.sol`
4. Compile with Solidity version 0.8.19
5. Go to Deploy & Run tab
6. Select "Injected Web3" environment (MetaMask)
7. Ensure you're connected to Base network
8. Set constructor parameter: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8` (KILT token address)
9. Deploy the contract

### Step 3: Post-Deployment Configuration
After successful deployment, you'll receive a contract address. Update the following files:

1. **Update Contract Address**:
   ```javascript
   // In shared/contracts/BasicTreasuryPool.json
   {
     "address": "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE",
     "abi": [...]
   }
   ```

2. **Update Hook Configuration**:
   ```typescript
   // In client/src/hooks/use-reward-claiming.ts
   const TREASURY_CONTRACT_ADDRESS = 'YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE';
   ```

### Step 4: Fund the Treasury
1. Approve KILT tokens for the contract
2. Call `depositToTreasury(amount)` with desired funding amount
3. Verify treasury balance with `getContractBalance()`

### Step 5: Test the System
1. Connect wallet to the application
2. Try claiming rewards to test the integration
3. Monitor transaction success and gas costs

## Contract Functions

### Owner Functions
- `depositToTreasury(uint256 amount)` - Fund the treasury with KILT tokens
- `distributeReward(address user, uint256 amount)` - Distribute rewards to users
- `emergencyWithdraw(uint256 amount)` - Emergency withdrawal of funds

### User Functions
- `claimRewards()` - Claim all available rewards
- `getClaimableRewards(address user)` - Check claimable reward amount
- `getUserRewards(address user)` - Get user's reward history

### View Functions
- `totalTreasuryBalance()` - Check treasury balance
- `getContractBalance()` - Check actual contract token balance

## Network Configuration

### Base Network Details
- **RPC URL**: `https://api.developer.coinbase.com/rpc/v1/base/FtQSiNzg6tfPcB1Hmirpy4T9SGDGFveA`
- **Chain ID**: 8453
- **Currency**: ETH
- **Block Explorer**: https://basescan.org

### KILT Token on Base
- **Address**: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8`
- **Decimals**: 18
- **Symbol**: KILT

## Expected Gas Costs
- **Deployment**: ~0.005 ETH ($15-20)
- **Treasury Deposit**: ~0.0001 ETH ($0.30)
- **Reward Distribution**: ~0.0001 ETH ($0.30)
- **Claim Rewards**: ~0.0001 ETH ($0.30)

## Security Considerations
1. The contract owner has full control over reward distribution
2. Emergency withdrawal function allows owner to recover funds
3. No time locks are implemented in this basic version
4. Users can claim rewards immediately after distribution

## Troubleshooting

### Common Issues
1. **"Insufficient funds"** - Ensure enough ETH for gas
2. **"Transfer failed"** - Check KILT token approval
3. **"Only owner"** - Ensure deployer address is calling owner functions

### Verification
After deployment, verify the contract on BaseScan for transparency:
1. Go to BaseScan
2. Search for your contract address
3. Upload source code for verification

## Next Steps
1. Deploy the contract following this guide
2. Update the application configuration
3. Test with small amounts first
4. Scale up treasury funding as needed
5. Monitor gas costs and optimize as necessary

For support, check the transaction logs and ensure all prerequisites are met.