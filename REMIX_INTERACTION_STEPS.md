# Step-by-Step Remix Interaction Guide

## Step 1: Connect to Your Deployed Contract

1. **Open Remix IDE**: https://remix.ethereum.org
2. **Copy your contract code** from `contracts/BasicTreasuryPool.sol`
3. **Create new file**: `BasicTreasuryPool.sol` in Remix
4. **Paste the contract code**
5. **Compile**: Ctrl+S or click compile button

### Connect to Deployed Contract:
1. **Go to "Deploy & Run Transactions"** tab (Ethereum logo)
2. **Environment**: Select "Injected Provider - MetaMask"
3. **Account**: Your wallet address should appear
4. **Contract**: Select "BasicTreasuryPool"
5. **At Address**: Enter `0x3ee2361272EaDc5ADc91418530722728E7DCe526`
6. **Click "At Address"** button

## Step 2: Check Current Contract Status

**Available Read Functions** (free to call):
- `owner()` - Shows your wallet address
- `getContractBalance()` - Shows total KILT tokens in contract
- `totalTreasuryBalance` - Shows tracked treasury amount
- `getClaimableRewards(address)` - Check user's claimable rewards

## Step 3: Funding the Contract

### Method 1: Buy KILT First
1. **Go to Uniswap**: https://app.uniswap.org
2. **Connect to Base network**
3. **Swap ETH → KILT**
4. **KILT Address**: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8`

### Method 2: Fund Contract
**Option A - Direct Transfer (Simplest):**
- Send KILT tokens directly to: `0x3ee2361272EaDc5ADc91418530722728E7DCe526`

**Option B - Using Contract Function (Better tracking):**
1. **Approve KILT spending**:
   - Go to KILT token on Remix: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8`
   - Call `approve(0x3ee2361272EaDc5ADc91418530722728E7DCe526, amount)`
   
2. **Deposit to treasury**:
   - In your BasicTreasuryPool contract
   - Call `depositToTreasury(amount)`
   - Amount in wei: 1000 KILT = `1000000000000000000000`

## Step 4: Emergency Withdrawal

**Function**: `emergencyWithdraw(uint256 amount)`

### Examples:
```
Withdraw 500 KILT:
emergencyWithdraw(500000000000000000000)

Withdraw 1000 KILT:
emergencyWithdraw(1000000000000000000000)

Withdraw all (first check getContractBalance()):
emergencyWithdraw([result from getContractBalance])
```

## Step 5: Distribute Rewards to Users

**Function**: `distributeReward(address user, uint256 amount)`

### Example:
```
Give 100 KILT to user 0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e:
distributeReward(0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e, 100000000000000000000)
```

## Amount Conversion Reference

| KILT Amount | Wei Amount (18 decimals) |
|-------------|-------------------------|
| 1 KILT      | 1000000000000000000     |
| 10 KILT     | 10000000000000000000    |
| 100 KILT    | 100000000000000000000   |
| 1000 KILT   | 1000000000000000000000  |

## Security Notes

✅ **Only you can call**: `depositToTreasury`, `emergencyWithdraw`, `distributeReward`  
✅ **Anyone can call**: `claimRewards`, `getClaimableRewards`, `getContractBalance`  
✅ **Emergency safe**: You can always withdraw all funds as contract owner  
✅ **No lock periods**: Users can claim rewards immediately after distribution  

## Quick Test Scenario

1. **Fund with 100 KILT** (~$1.84)
2. **Give 10 KILT reward** to test user
3. **User claims via app** or Remix
4. **Emergency withdraw remaining** 90 KILT

Your contract is ready for production use!