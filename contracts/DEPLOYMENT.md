# KILT Reward Pool Smart Contract Deployment Guide

## Overview

This guide explains how to deploy the KILTRewardPool smart contract for the KILT Liquidity Incentive Program. The contract implements a rolling 7-day claim system with unlimited participant proportional rewards.

## Prerequisites

### Environment Setup
1. Install Node.js and npm
2. Install Hardhat: `npm install --save-dev hardhat`
3. Install required dependencies:
   ```bash
   npm install --save-dev @openzeppelin/contracts ethers
   ```

### Network Configuration
- **Network**: Base Mainnet (Chain ID: 8453)
- **RPC URL**: https://mainnet.base.org
- **Block Explorer**: https://basescan.org

## Contract Parameters

### Required Environment Variables
```bash
# Smart Contract Deployment
REWARD_WALLET_ADDRESS=0x...    # Treasury wallet address (holds KILT tokens)
REWARD_WALLET_PRIVATE_KEY=0x...  # Private key for reward wallet (for transactions)
KILT_REWARD_POOL_ADDRESS=0x...   # Deployed contract address (set after deployment)
BASE_RPC_URL=https://mainnet.base.org
```

### Contract Constructor Parameters
- **KILT_TOKEN_ADDRESS**: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8` (KILT token on Base)
- **REWARD_WALLET_ADDRESS**: Treasury wallet address (from environment)
- **TREASURY_ALLOCATION**: `2,905,600 KILT` (2.9M tokens with 18 decimals)
- **PROGRAM_DURATION**: `365 days` (31,536,000 seconds)
- **PROGRAM_START_TIME**: Current timestamp + 24 hours

## Deployment Steps

### 1. Configure Environment
```bash
# Set environment variables in .env file
echo "REWARD_WALLET_ADDRESS=0x..." >> .env
echo "REWARD_WALLET_PRIVATE_KEY=0x..." >> .env
echo "BASE_RPC_URL=https://mainnet.base.org" >> .env
```

### 2. Deploy Contract
```bash
cd contracts
npx hardhat run deploy.js --network base
```

### 3. Verify Contract
The deployment script automatically attempts to verify the contract on BaseScan. If verification fails, manually verify:
```bash
npx hardhat verify --network base <CONTRACT_ADDRESS> \
  "0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8" \
  "<REWARD_WALLET_ADDRESS>" \
  "2905600000000000000000000" \
  "31536000" \
  "<PROGRAM_START_TIME>"
```

### 4. Update Application Environment
After successful deployment, update the application's environment variables:
```bash
echo "KILT_REWARD_POOL_ADDRESS=<DEPLOYED_CONTRACT_ADDRESS>" >> .env
```

## Contract Features

### Core Functionality
- **Unlimited Participants**: No limit on number of participants
- **Proportional Rewards**: Rewards distributed based on liquidity share and time commitment
- **Rolling 7-Day Claims**: Each daily reward has individual 7-day lock period
- **Real Token Transfers**: Actual KILT token transfers from reward wallet to users

### Admin Functions
- `addLiquidityPosition()`: Register new LP positions
- `updateLiquidityValue()`: Update position values
- `distributeDailyRewards()`: Distribute daily rewards to all participants
- `updateRewardWallet()`: Change reward wallet address
- `updateProgramConfig()`: Modify program parameters
- `pause()/unpause()`: Emergency controls

### User Functions
- `claimRewards()`: Claim unlocked rewards
- `getClaimableRewards()`: Check claimable amount
- `getPendingRewards()`: Check locked rewards
- `getProgramInfo()`: Get program details

## Security Features

### OpenZeppelin Integrations
- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Access control for admin functions
- **Pausable**: Emergency pause capability
- **SafeERC20**: Safe token transfers

### Validation Checks
- Address validation for all parameters
- Minimum position value enforcement
- Lock period validation
- Program duration constraints

## Post-Deployment Checklist

### 1. Contract Verification
- [ ] Contract deployed successfully
- [ ] Contract verified on BaseScan
- [ ] Environment variables updated
- [ ] Application connects to contract

### 2. Treasury Setup
- [ ] Reward wallet has sufficient KILT tokens
- [ ] Reward wallet approved contract to spend tokens
- [ ] Treasury balance displays correctly in admin panel

### 3. Application Integration
- [ ] Smart contract service initializes correctly
- [ ] Admin panel connects to contract
- [ ] User rewards show proper calculations
- [ ] Claim functionality works with actual token transfers

### 4. Testing
- [ ] Add test liquidity position
- [ ] Verify reward calculations
- [ ] Test claim functionality after 7-day lock
- [ ] Confirm token transfers occur

## Troubleshooting

### Common Issues

#### Contract Not Deployed
- Check environment variables are set correctly
- Verify wallet has sufficient ETH for gas fees
- Ensure Base network configuration is correct

#### Application Shows Simulation Mode
- Verify `KILT_REWARD_POOL_ADDRESS` is set in environment
- Check `REWARD_WALLET_PRIVATE_KEY` is valid
- Restart application after setting environment variables

#### Claims Not Processing
- Verify reward wallet has approved contract to spend KILT tokens
- Check reward wallet has sufficient KILT token balance
- Ensure 7-day lock period has expired for rewards

### Support
For deployment issues, check:
1. Environment variable configuration
2. Network connectivity to Base
3. Wallet permissions and balances
4. Contract verification status

## Security Considerations

### Private Key Management
- Never commit private keys to version control
- Use environment variables for sensitive data
- Consider using hardware wallets for production
- Rotate keys regularly

### Contract Security
- Contract is pausable in emergency situations
- Only owner can perform administrative functions
- All token transfers use SafeERC20 library
- Reentrancy protection on all state-changing functions

## Maintenance

### Regular Tasks
- Monitor treasury balance
- Check reward distribution accuracy
- Verify claim processing
- Update program parameters as needed

### Emergency Procedures
- Pause contract if issues discovered
- Update reward wallet if key compromised
- Adjust program parameters if needed
- Contact users if claiming issues occur

## Contract Addresses

### Mainnet Deployment
- **Network**: Base Mainnet (Chain ID: 8453)
- **KILT Token**: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8`
- **Reward Pool**: `<TO_BE_SET_AFTER_DEPLOYMENT>`

### Verification
After deployment, the contract will be verified on BaseScan and the deployment details will be saved to `deployment.json`.