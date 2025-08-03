# Contract Funding & Emergency Withdrawal Guide

## Your Deployed Contract
**Address**: `0x3ee2361272EaDc5ADc91418530722728E7DCe526`  
**Network**: Base  
**Owner**: Your wallet address (the one that deployed it)

## 1. Funding the Contract (Adding KILT Tokens)

### Method 1: Direct Transfer (Simplest)
1. **Get KILT tokens** in your wallet first
2. **Send KILT directly** to contract address: `0x3ee2361272EaDc5ADc91418530722728E7DCe526`
3. **No approval needed** - just transfer KILT tokens directly

### Method 2: Using Contract Function (Recommended)
1. **Approve KILT spending** first:
   - Go to KILT token contract: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8`
   - Call `approve(0x3ee2361272EaDc5ADc91418530722728E7DCe526, amount)`
   
2. **Deposit to treasury**:
   - Call `depositToTreasury(amount)` on your contract
   - This method tracks treasury balance properly

### Getting KILT Tokens
- **Uniswap V3**: Swap ETH → KILT on Base network
- **Pool Address**: `0x82Da478b1382B951cBaD01Beb9eD459cDB16458E`
- **Current Price**: ~$0.0184 per KILT

## 2. Emergency Withdrawal (Owner Only)

Your contract has built-in emergency withdrawal function:

### Function: `emergencyWithdraw(uint256 amount)`
- **Who can call**: Only the contract owner (you)
- **What it does**: Withdraws KILT tokens back to your wallet
- **Parameters**: Amount in wei (18 decimals)

### Examples:
```solidity
// Withdraw 1000 KILT tokens
emergencyWithdraw(1000000000000000000000)

// Withdraw all tokens (check balance first)
uint256 balance = getContractBalance();
emergencyWithdraw(balance);
```

## 3. Using Remix IDE for Contract Interaction

### Connecting to Your Deployed Contract:
1. **Open Remix IDE**
2. **Go to "Deploy & Run Transactions"** tab
3. **Set Environment**: Injected Provider - MetaMask
4. **Network**: Switch to Base network
5. **At Address**: Paste `0x3ee2361272EaDc5ADc91418530722728E7DCe526`
6. **Contract**: Select "BasicTreasuryPool"
7. **Click "At Address"** button

### Available Functions:
- `depositToTreasury(amount)` - Add KILT to treasury
- `emergencyWithdraw(amount)` - Withdraw KILT (owner only)
- `getContractBalance()` - Check current KILT balance
- `distributeReward(user, amount)` - Give rewards to users
- `claimRewards()` - Users claim their rewards

## 4. Contract Security Features

✅ **Owner-only functions** - Only you can add/withdraw funds  
✅ **Proper token handling** - Uses SafeERC20 patterns  
✅ **Balance tracking** - Maintains accurate treasury records  
✅ **Emergency controls** - Quick withdrawal capability  

## 5. Funding Examples

### Small Test (100 KILT):
1. Buy 100 KILT tokens (~$1.84)
2. Transfer to `0x3ee2361272EaDc5ADc91418530722728E7DCe526`
3. Users can now claim from 100 KILT pool

### Production Funding (10,000 KILT):
1. Buy 10,000 KILT tokens (~$184)
2. Use `depositToTreasury()` function for proper tracking
3. Supports substantial reward distribution

## 6. Monitoring Contract Status

Check these values regularly:
- `getContractBalance()` - Total KILT in contract
- `totalTreasuryBalance` - Tracked treasury amount
- User reward distributions via `getUserRewards(address)`

## Emergency Scenarios

### Immediate Withdrawal Needed:
```javascript
// Get all funds back
const balance = await contract.getContractBalance();
await contract.emergencyWithdraw(balance);
```

### Partial Withdrawal:
```javascript
// Withdraw specific amount (1000 KILT example)
const amount = ethers.parseEther("1000");
await contract.emergencyWithdraw(amount);
```

Your contract is secure and you maintain full control as the owner!