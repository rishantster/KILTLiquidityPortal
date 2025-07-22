// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title KILTTreasuryPool
 * @dev Secure treasury-based reward distribution contract for KILT tokens
 * 
 * Key Security Features:
 * - Contract holds KILT tokens directly (no external wallets)
 * - Admin-controlled funding and withdrawals
 * - Rolling 7-day claim system with individual locks
 * - Comprehensive access controls and emergency stops
 * - Automatic position registration and reward tracking
 */
contract KILTTreasuryPool is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    // KILT token contract
    IERC20 public immutable kiltToken;
    
    // Reward configuration
    uint256 public lockPeriodDays = 7;
    uint256 public constant SECONDS_PER_DAY = 86400;
    
    // Treasury management
    mapping(address => bool) public authorizedAdmins;
    uint256 public totalRewardsDistributed;
    uint256 public totalPositionsRegistered;
    
    // Position tracking
    struct Position {
        uint256 tokenId;
        address owner;
        uint256 registeredAt;
        uint256 liquidityAmount;
        bool isActive;
    }
    
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public userPositions;
    
    // Reward tracking with individual locks
    struct Reward {
        uint256 amount;
        uint256 createdAt;
        uint256 unlockTime;
        bool claimed;
    }
    
    mapping(address => Reward[]) public userRewards;
    
    // Events
    event PositionRegistered(uint256 indexed tokenId, address indexed owner, uint256 liquidityAmount);
    event RewardAdded(address indexed user, uint256 amount, uint256 unlockTime);
    event RewardClaimed(address indexed user, uint256 amount, uint256 rewardIndex);
    event TreasuryFunded(address indexed funder, uint256 amount);
    event TreasuryWithdrawn(address indexed admin, uint256 amount);
    event AdminAuthorized(address indexed admin);
    event AdminRevoked(address indexed admin);
    event LockPeriodUpdated(uint256 newLockPeriodDays);
    
    modifier onlyAuthorizedAdmin() {
        require(authorizedAdmins[msg.sender] || msg.sender == owner(), "Not authorized admin");
        _;
    }
    
    constructor(address _kiltToken, address _initialAdmin) {
        require(_kiltToken != address(0), "Invalid KILT token address");
        require(_initialAdmin != address(0), "Invalid admin address");
        
        kiltToken = IERC20(_kiltToken);
        authorizedAdmins[_initialAdmin] = true;
        
        emit AdminAuthorized(_initialAdmin);
    }
    
    /**
     * @dev Fund the treasury with KILT tokens
     * @param amount Amount of KILT tokens to deposit
     */
    function fundTreasury(uint256 amount) external onlyAuthorizedAdmin whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        
        kiltToken.safeTransferFrom(msg.sender, address(this), amount);
        emit TreasuryFunded(msg.sender, amount);
    }
    
    /**
     * @dev Emergency withdraw from treasury (admin only)
     * @param amount Amount of KILT tokens to withdraw
     * @param recipient Address to receive the tokens
     */
    function emergencyWithdraw(uint256 amount, address recipient) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        require(kiltToken.balanceOf(address(this)) >= amount, "Insufficient treasury balance");
        
        kiltToken.safeTransfer(recipient, amount);
        emit TreasuryWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Register a Uniswap V3 position for rewards
     * @param tokenId NFT token ID of the position
     * @param owner Address of the position owner
     * @param liquidityAmount Amount of liquidity in the position
     */
    function registerPosition(
        uint256 tokenId,
        address owner,
        uint256 liquidityAmount
    ) external onlyAuthorizedAdmin whenNotPaused {
        require(owner != address(0), "Invalid owner address");
        require(liquidityAmount > 0, "Liquidity amount must be greater than 0");
        require(positions[tokenId].tokenId == 0, "Position already registered");
        
        positions[tokenId] = Position({
            tokenId: tokenId,
            owner: owner,
            registeredAt: block.timestamp,
            liquidityAmount: liquidityAmount,
            isActive: true
        });
        
        userPositions[owner].push(tokenId);
        totalPositionsRegistered++;
        
        emit PositionRegistered(tokenId, owner, liquidityAmount);
    }
    
    /**
     * @dev Add reward for user with 7-day lock
     * @param user Address of the user
     * @param amount Amount of KILT tokens to reward
     */
    function addReward(address user, uint256 amount) external onlyAuthorizedAdmin whenNotPaused {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        require(kiltToken.balanceOf(address(this)) >= amount, "Insufficient treasury balance");
        
        uint256 unlockTime = block.timestamp + (lockPeriodDays * SECONDS_PER_DAY);
        
        userRewards[user].push(Reward({
            amount: amount,
            createdAt: block.timestamp,
            unlockTime: unlockTime,
            claimed: false
        }));
        
        emit RewardAdded(user, amount, unlockTime);
    }
    
    /**
     * @dev Claim unlocked rewards
     * @param rewardIndexes Array of reward indexes to claim
     */
    function claimRewards(uint256[] calldata rewardIndexes) external nonReentrant whenNotPaused {
        require(rewardIndexes.length > 0, "No rewards specified");
        
        uint256 totalClaimAmount = 0;
        Reward[] storage rewards = userRewards[msg.sender];
        
        for (uint256 i = 0; i < rewardIndexes.length; i++) {
            uint256 index = rewardIndexes[i];
            require(index < rewards.length, "Invalid reward index");
            
            Reward storage reward = rewards[index];
            require(!reward.claimed, "Reward already claimed");
            require(block.timestamp >= reward.unlockTime, "Reward still locked");
            
            reward.claimed = true;
            totalClaimAmount += reward.amount;
            
            emit RewardClaimed(msg.sender, reward.amount, index);
        }
        
        require(totalClaimAmount > 0, "No claimable rewards");
        require(kiltToken.balanceOf(address(this)) >= totalClaimAmount, "Insufficient treasury balance");
        
        totalRewardsDistributed += totalClaimAmount;
        kiltToken.safeTransfer(msg.sender, totalClaimAmount);
    }
    
    /**
     * @dev Get claimable rewards for user
     * @param user Address of the user
     * @return claimableIndexes Array of claimable reward indexes
     * @return claimableAmounts Array of claimable amounts
     * @return totalClaimable Total claimable amount
     */
    function getClaimableRewards(address user) external view returns (
        uint256[] memory claimableIndexes,
        uint256[] memory claimableAmounts,
        uint256 totalClaimable
    ) {
        Reward[] storage rewards = userRewards[user];
        uint256 claimableCount = 0;
        
        // Count claimable rewards
        for (uint256 i = 0; i < rewards.length; i++) {
            if (!rewards[i].claimed && block.timestamp >= rewards[i].unlockTime) {
                claimableCount++;
            }
        }
        
        // Build arrays
        claimableIndexes = new uint256[](claimableCount);
        claimableAmounts = new uint256[](claimableCount);
        
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < rewards.length; i++) {
            if (!rewards[i].claimed && block.timestamp >= rewards[i].unlockTime) {
                claimableIndexes[currentIndex] = i;
                claimableAmounts[currentIndex] = rewards[i].amount;
                totalClaimable += rewards[i].amount;
                currentIndex++;
            }
        }
    }
    
    /**
     * @dev Get all rewards for user
     * @param user Address of the user
     * @return amounts Array of reward amounts
     * @return unlockTimes Array of unlock timestamps
     * @return claimedStatus Array of claimed status
     */
    function getUserRewards(address user) external view returns (
        uint256[] memory amounts,
        uint256[] memory unlockTimes,
        bool[] memory claimedStatus
    ) {
        Reward[] storage rewards = userRewards[user];
        uint256 length = rewards.length;
        
        amounts = new uint256[](length);
        unlockTimes = new uint256[](length);
        claimedStatus = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            amounts[i] = rewards[i].amount;
            unlockTimes[i] = rewards[i].unlockTime;
            claimedStatus[i] = rewards[i].claimed;
        }
    }
    
    /**
     * @dev Get user's registered positions
     * @param user Address of the user
     * @return tokenIds Array of registered position token IDs
     */
    function getUserPositions(address user) external view returns (uint256[] memory tokenIds) {
        return userPositions[user];
    }
    
    /**
     * @dev Get treasury balance
     * @return Current KILT token balance in the contract
     */
    function getTreasuryBalance() external view returns (uint256) {
        return kiltToken.balanceOf(address(this));
    }
    
    /**
     * @dev Authorize admin address
     * @param admin Address to authorize
     */
    function authorizeAdmin(address admin) external onlyOwner {
        require(admin != address(0), "Invalid admin address");
        authorizedAdmins[admin] = true;
        emit AdminAuthorized(admin);
    }
    
    /**
     * @dev Revoke admin authorization
     * @param admin Address to revoke
     */
    function revokeAdmin(address admin) external onlyOwner {
        authorizedAdmins[admin] = false;
        emit AdminRevoked(admin);
    }
    
    /**
     * @dev Update lock period
     * @param newLockPeriodDays New lock period in days
     */
    function updateLockPeriod(uint256 newLockPeriodDays) external onlyOwner {
        require(newLockPeriodDays <= 365, "Lock period too long");
        lockPeriodDays = newLockPeriodDays;
        emit LockPeriodUpdated(newLockPeriodDays);
    }
    
    /**
     * @dev Pause contract operations
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}