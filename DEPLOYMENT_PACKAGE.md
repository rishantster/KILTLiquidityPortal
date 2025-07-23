# MultiTokenTreasuryPool Smart Contract Deployment Package

## 📦 Complete Contract Code

### Main Contract: MultiTokenTreasuryPool.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MultiTokenTreasuryPool
 * @dev Advanced treasury-based reward distribution contract supporting multiple tokens
 * Features:
 * - Multi-token support (KILT, BTC, ETH, SOL, BNB, DOT, or any ERC20)
 * - Single active reward token distribution at a time
 * - Contract holds funds directly (no private keys needed)
 * - Individual 7-day reward locks per reward
 * - Daily distribution caps with automatic enforcement
 * - Admin-controlled token switching
 * - Emergency controls and security features
 */
contract MultiTokenTreasuryPool is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    
    // Constants
    uint256 public constant SECONDS_PER_DAY = 86400;
    
    // State variables
    address public primaryToken;
    address public activeRewardToken;
    string public activeRewardTokenSymbol;
    uint256 public lockPeriodDays;
    uint256 public dailyDistributionCap;
    
    // Storage mappings
    mapping(address => bool) public authorizedAdmins;
    mapping(address => bool) public supportedTokens;
    mapping(address => string) public tokenSymbols;
    mapping(address => mapping(uint256 => uint256)) public userRewards; // user -> rewardId -> amount
    mapping(address => mapping(uint256 => uint256)) public rewardLockTimestamp; // user -> rewardId -> timestamp
    mapping(address => uint256) public userRewardCount;
    mapping(uint256 => uint256) public dailyDistributedAmount; // day -> amount distributed
    
    address[] private supportedTokensList;
    uint256 private nextRewardId = 1;
    
    // Events
    event RewardAdded(address indexed user, uint256 indexed rewardId, uint256 amount, uint256 lockUntil);
    event RewardClaimed(address indexed user, uint256 indexed rewardId, uint256 amount);
    event TokenAdded(address indexed token, string symbol);
    event TokenRemoved(address indexed token);
    event ActiveTokenChanged(address indexed newToken, string symbol);
    event AdminAuthorized(address indexed admin);
    event AdminRevoked(address indexed admin);
    event LockPeriodUpdated(uint256 newLockPeriodDays);
    event DailyDistributionCapUpdated(uint256 newCap);
    event EmergencyWithdrawal(address indexed token, uint256 amount);
    
    // Modifiers
    modifier onlyAuthorizedAdmin() {
        require(authorizedAdmins[msg.sender], "Not authorized admin");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _primaryToken Address of the primary token (usually KILT)
     * @param _initialAdmin Address of the initial admin
     * @param _initialDailyCap Initial daily distribution cap
     */
    constructor(
        address _primaryToken,
        address _initialAdmin,
        uint256 _initialDailyCap
    ) {
        require(_primaryToken != address(0), "Invalid primary token address");
        require(_initialAdmin != address(0), "Invalid admin address");
        require(_initialDailyCap > 0, "Daily cap must be greater than 0");
        
        primaryToken = _primaryToken;
        activeRewardToken = _primaryToken;
        lockPeriodDays = 7; // Default 7-day lock period
        dailyDistributionCap = _initialDailyCap;
        
        // Authorize initial admin
        authorizedAdmins[_initialAdmin] = true;
        
        // Add primary token as supported
        supportedTokens[_primaryToken] = true;
        supportedTokensList.push(_primaryToken);
        
        emit AdminAuthorized(_initialAdmin);
        emit TokenAdded(_primaryToken, "PRIMARY");
        emit ActiveTokenChanged(_primaryToken, "PRIMARY");
        emit DailyDistributionCapUpdated(_initialDailyCap);
    }
    
    /**
     * @dev Add reward for user with individual lock period
     * @param user Address of the user receiving the reward
     * @param amount Amount of active reward token to distribute
     */
    function addReward(address user, uint256 amount) external onlyAuthorizedAdmin nonReentrant whenNotPaused {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        require(activeRewardToken != address(0), "No active reward token set");
        
        // Check daily distribution cap
        uint256 currentDay = block.timestamp / SECONDS_PER_DAY;
        require(
            dailyDistributedAmount[currentDay] + amount <= dailyDistributionCap,
            "Daily distribution cap exceeded"
        );
        
        // Check contract has sufficient balance of active token
        uint256 contractBalance = IERC20(activeRewardToken).balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient active token balance");
        
        uint256 rewardId = nextRewardId++;
        uint256 lockUntil = block.timestamp + (lockPeriodDays * SECONDS_PER_DAY);
        
        userRewards[user][rewardId] = amount;
        rewardLockTimestamp[user][rewardId] = lockUntil;
        userRewardCount[user]++;
        
        // Update daily distribution tracking
        dailyDistributedAmount[currentDay] += amount;
        
        emit RewardAdded(user, rewardId, amount, lockUntil);
    }
    
    /**
     * @dev Claim multiple unlocked rewards in batch
     * @param rewardIds Array of reward IDs to claim
     */
    function claimRewards(uint256[] calldata rewardIds) external nonReentrant whenNotPaused {
        require(rewardIds.length > 0, "No reward IDs provided");
        require(activeRewardToken != address(0), "No active reward token set");
        
        uint256 totalAmount = 0;
        
        for (uint256 i = 0; i < rewardIds.length; i++) {
            uint256 rewardId = rewardIds[i];
            uint256 amount = userRewards[msg.sender][rewardId];
            uint256 lockUntil = rewardLockTimestamp[msg.sender][rewardId];
            
            require(amount > 0, "Invalid or already claimed reward");
            require(block.timestamp >= lockUntil, "Reward still locked");
            
            userRewards[msg.sender][rewardId] = 0;
            rewardLockTimestamp[msg.sender][rewardId] = 0;
            totalAmount += amount;
            
            emit RewardClaimed(msg.sender, rewardId, amount);
        }
        
        require(totalAmount > 0, "No claimable amount");
        IERC20(activeRewardToken).safeTransfer(msg.sender, totalAmount);
    }
    
    /**
     * @dev Add supported token (owner only)
     * @param token Address of the token to add
     * @param symbol Symbol of the token
     */
    function addSupportedToken(address token, string calldata symbol) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        tokenSymbols[token] = symbol;
        supportedTokensList.push(token);
        
        emit TokenAdded(token, symbol);
    }
    
    /**
     * @dev Remove supported token (owner only)
     * @param token Address of the token to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Token not supported");
        require(token != primaryToken, "Cannot remove primary token");
        require(token != activeRewardToken, "Cannot remove active reward token");
        
        supportedTokens[token] = false;
        delete tokenSymbols[token];
        
        // Remove from array
        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == token) {
                supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
                supportedTokensList.pop();
                break;
            }
        }
        
        emit TokenRemoved(token);
    }
    
    /**
     * @dev Set active reward token (admin only)
     * @param token Address of the token to set as active
     * @param symbol Symbol of the active token
     */
    function setActiveRewardToken(address token, string calldata symbol) external onlyAuthorizedAdmin {
        require(supportedTokens[token], "Token not supported");
        
        activeRewardToken = token;
        activeRewardTokenSymbol = symbol;
        
        emit ActiveTokenChanged(token, symbol);
    }
    
    /**
     * @dev Fund treasury with any supported token (admin only)
     * @param token Address of the token to fund with
     * @param amount Amount of tokens to fund
     */
    function fundTreasury(address token, uint256 amount) external onlyAuthorizedAdmin {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Amount must be greater than 0");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @dev Emergency withdrawal (owner only)
     * @param token Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance >= amount, "Insufficient balance");
        
        IERC20(token).safeTransfer(owner(), amount);
        emit EmergencyWithdrawal(token, amount);
    }
    
    // View functions
    function getUserReward(address user, uint256 rewardId) external view returns (uint256 amount, uint256 lockUntil) {
        return (userRewards[user][rewardId], rewardLockTimestamp[user][rewardId]);
    }
    
    function getUserClaimableRewards(address user) external view returns (uint256[] memory claimableIds, uint256 totalAmount) {
        uint256 rewardCount = userRewardCount[user];
        uint256[] memory tempIds = new uint256[](rewardCount);
        uint256 claimableCount = 0;
        uint256 total = 0;
        
        for (uint256 i = 1; i < nextRewardId; i++) {
            if (userRewards[user][i] > 0 && block.timestamp >= rewardLockTimestamp[user][i]) {
                tempIds[claimableCount] = i;
                total += userRewards[user][i];
                claimableCount++;
            }
        }
        
        claimableIds = new uint256[](claimableCount);
        for (uint256 i = 0; i < claimableCount; i++) {
            claimableIds[i] = tempIds[i];
        }
        
        return (claimableIds, total);
    }
    
    function getSupportedTokens() external view returns (address[] memory) {
        return supportedTokensList;
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    function getActiveRewardToken() external view returns (address) {
        return activeRewardToken;
    }
    
    function getActiveRewardTokenBalance() external view returns (uint256) {
        require(activeRewardToken != address(0), "No active reward token set");
        return IERC20(activeRewardToken).balanceOf(address(this));
    }
    
    function authorizeAdmin(address admin) external onlyOwner {
        require(admin != address(0), "Invalid admin address");
        authorizedAdmins[admin] = true;
        emit AdminAuthorized(admin);
    }
    
    function revokeAdmin(address admin) external onlyOwner {
        authorizedAdmins[admin] = false;
        emit AdminRevoked(admin);
    }
    
    function updateLockPeriod(uint256 newLockPeriodDays) external onlyOwner {
        require(newLockPeriodDays <= 365, "Lock period too long");
        lockPeriodDays = newLockPeriodDays;
        emit LockPeriodUpdated(newLockPeriodDays);
    }
    
    function updateDailyDistributionCap(uint256 newDailyCap) external onlyOwner {
        require(newDailyCap > 0, "Daily cap must be greater than 0");
        dailyDistributionCap = newDailyCap;
        emit DailyDistributionCapUpdated(newDailyCap);
    }
    
    function getDailyDistributionStatus(uint256 day) external view returns (
        uint256 distributed,
        uint256 cap,
        uint256 remaining
    ) {
        distributed = dailyDistributedAmount[day];
        cap = dailyDistributionCap;
        remaining = cap > distributed ? cap - distributed : 0;
    }
    
    function getCurrentDayDistributionStatus() external view returns (
        uint256 distributed,
        uint256 cap,
        uint256 remaining
    ) {
        uint256 currentDay = block.timestamp / SECONDS_PER_DAY;
        return this.getDailyDistributionStatus(currentDay);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}
```

## 🚀 Deployment Instructions

### Prerequisites

1. **Install Dependencies**
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
```

2. **Create hardhat.config.js**
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    base: {
      url: "https://mainnet.base.org", // or your preferred RPC
      accounts: ["YOUR_PRIVATE_KEY_HERE"],
      chainId: 8453
    }
  },
  etherscan: {
    apiKey: {
      base: "YOUR_BASESCAN_API_KEY_HERE"
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  }
};
```

### Deployment Script

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  // Deployment parameters
  const KILT_TOKEN_ADDRESS = "0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8"; // KILT on Base
  const INITIAL_ADMIN = "YOUR_ADMIN_WALLET_ADDRESS"; // Replace with your admin address
  const INITIAL_DAILY_CAP = hre.ethers.parseUnits("10000", 18); // 10K KILT daily cap
  
  console.log("🚀 Deploying MultiTokenTreasuryPool to Base mainnet...");
  console.log("Parameters:");
  console.log("• Primary Token (KILT):", KILT_TOKEN_ADDRESS);
  console.log("• Initial Admin:", INITIAL_ADMIN);
  console.log("• Daily Cap:", hre.ethers.formatUnits(INITIAL_DAILY_CAP, 18), "KILT");
  
  // Deploy contract
  const MultiTokenTreasuryPool = await hre.ethers.getContractFactory("MultiTokenTreasuryPool");
  const treasuryPool = await MultiTokenTreasuryPool.deploy(
    KILT_TOKEN_ADDRESS,
    INITIAL_ADMIN,
    INITIAL_DAILY_CAP
  );
  
  await treasuryPool.waitForDeployment();
  const contractAddress = await treasuryPool.getAddress();
  
  console.log("✅ Contract deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("🔗 Base Network:", "https://basescan.org/address/" + contractAddress);
  
  // Wait for block confirmations before verification
  console.log("⏳ Waiting for block confirmations...");
  await treasuryPool.deploymentTransaction().wait(5);
  
  // Verify contract
  try {
    console.log("🔍 Verifying contract on BaseScan...");
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        KILT_TOKEN_ADDRESS,
        INITIAL_ADMIN,
        INITIAL_DAILY_CAP
      ],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    console.log("❌ Verification failed:", error.message);
  }
  
  // Display contract details
  console.log("\n📋 CONTRACT DETAILS:");
  console.log("====================================");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Base (Chain ID: 8453)");
  console.log("Primary Token: KILT (" + KILT_TOKEN_ADDRESS + ")");
  console.log("Initial Admin:", INITIAL_ADMIN);
  console.log("Daily Distribution Cap:", hre.ethers.formatUnits(INITIAL_DAILY_CAP, 18), "KILT");
  console.log("Lock Period: 7 days");
  console.log("BaseScan URL: https://basescan.org/address/" + contractAddress);
  console.log("====================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Deploy Commands

1. **Compile Contract**
```bash
npx hardhat compile
```

2. **Deploy to Base Mainnet**
```bash
npx hardhat run scripts/deploy.js --network base
```

3. **Verify Contract (if not done automatically)**
```bash
npx hardhat verify --network base CONTRACT_ADDRESS "0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8" "YOUR_ADMIN_ADDRESS" "10000000000000000000000"
```

## 🔧 Key Features

- **Multi-Token Support**: Holds KILT, BTC, ETH, SOL, BNB, DOT, or any ERC20 token
- **Single Active Token**: Only one token distributed as rewards at a time
- **Contract Security**: Funds held directly in contract (no private keys needed)
- **Daily Distribution Caps**: Automatic enforcement prevents excessive distributions
- **Individual Reward Locks**: Each reward has its own 7-day lock period
- **Admin Controls**: Authorized admins can switch tokens and distribute rewards
- **Emergency Features**: Owner can pause/unpause and emergency withdraw

## 🛡️ Security Features

- ReentrancyGuard protection
- Pausable contract operations
- Owner-only emergency controls
- Input validation on all functions
- SafeERC20 for secure token transfers
- Individual reward lock timestamps

## 📞 Integration with Your App

After deployment, update your app's configuration with:
- Contract address
- Network: Base (8453)
- ABI (generated after compilation)

The contract is ready for immediate use with your KILT liquidity incentive program!