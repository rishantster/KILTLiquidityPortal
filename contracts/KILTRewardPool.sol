// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title KILTRewardPool
 * @dev Smart contract for KILT Liquidity Incentive Program with 90-day lock
 * Implements Top 100 ranking system with Liquidity + Duration Weighted Rule
 */
contract KILTRewardPool is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // KILT token contract
    IERC20 public immutable kiltToken;
    
    // Reward wallet address (separate from contract funding)
    address public rewardWallet;
    
    // Program parameters
    uint256 public constant TREASURY_ALLOCATION = 2905600 * 1e18; // 2.9M KILT tokens
    uint256 public constant PROGRAM_DURATION = 365 days; // 1 year program
    uint256 public constant LOCK_PERIOD = 90 days; // 90 days lock period
    uint256 public constant MAX_PARTICIPANTS = 100; // Top 100 participants
    uint256 public constant MIN_POSITION_VALUE = 100 * 1e18; // $100 minimum (in USD with 18 decimals)
    
    // Program timing
    uint256 public immutable programStartTime;
    uint256 public immutable programEndTime;
    
    // Reward distribution
    uint256 public totalRewardsDistributed;
    uint256 public dailyRewardBudget;
    
    // Liquidity position tracking
    struct LiquidityPosition {
        address user;
        uint256 nftTokenId;
        uint256 liquidityValue; // USD value with 18 decimals
        uint256 liquidityAddedAt;
        uint256 stakingStartDate;
        bool isActive;
    }
    
    // Reward tracking
    struct RewardInfo {
        uint256 totalEarned;
        uint256 claimed;
        uint256 lastClaimTime;
        uint256 lockEndTime;
        bool isEligibleForClaim;
    }
    
    // Mappings
    mapping(address => mapping(uint256 => LiquidityPosition)) public liquidityPositions;
    mapping(address => mapping(uint256 => RewardInfo)) public rewardInfo;
    mapping(address => uint256[]) public userPositions;
    
    // Top 100 tracking
    address[] public top100Participants;
    mapping(address => uint256) public userRanking;
    
    // Events
    event LiquidityAdded(address indexed user, uint256 indexed nftTokenId, uint256 liquidityValue);
    event LiquidityRemoved(address indexed user, uint256 indexed nftTokenId);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsEarned(address indexed user, uint256 indexed nftTokenId, uint256 amount);
    event Top100Updated(address[] newTop100);
    event RewardWalletUpdated(address indexed oldWallet, address indexed newWallet);
    
    modifier onlyDuringProgram() {
        require(block.timestamp >= programStartTime && block.timestamp <= programEndTime, "Program not active");
        _;
    }
    
    modifier validPosition(address user, uint256 nftTokenId) {
        require(liquidityPositions[user][nftTokenId].isActive, "Position not active");
        _;
    }
    
    constructor(
        address _kiltToken,
        address _rewardWallet,
        uint256 _programStartTime
    ) {
        require(_kiltToken != address(0), "Invalid KILT token address");
        require(_rewardWallet != address(0), "Invalid reward wallet address");
        require(_programStartTime > block.timestamp, "Start time must be in future");
        
        kiltToken = IERC20(_kiltToken);
        rewardWallet = _rewardWallet;
        programStartTime = _programStartTime;
        programEndTime = _programStartTime + PROGRAM_DURATION;
        dailyRewardBudget = TREASURY_ALLOCATION / (PROGRAM_DURATION / 1 days);
    }
    
    /**
     * @dev Add liquidity position to reward program
     * @param user Address of the liquidity provider
     * @param nftTokenId Uniswap V3 NFT token ID
     * @param liquidityValue USD value of the liquidity position
     */
    function addLiquidityPosition(
        address user,
        uint256 nftTokenId,
        uint256 liquidityValue
    ) external onlyOwner onlyDuringProgram {
        require(user != address(0), "Invalid user address");
        require(liquidityValue >= MIN_POSITION_VALUE, "Position value too low");
        require(!liquidityPositions[user][nftTokenId].isActive, "Position already exists");
        
        liquidityPositions[user][nftTokenId] = LiquidityPosition({
            user: user,
            nftTokenId: nftTokenId,
            liquidityValue: liquidityValue,
            liquidityAddedAt: block.timestamp,
            stakingStartDate: block.timestamp,
            isActive: true
        });
        
        userPositions[user].push(nftTokenId);
        
        // Initialize reward info with 90-day lock
        rewardInfo[user][nftTokenId] = RewardInfo({
            totalEarned: 0,
            claimed: 0,
            lastClaimTime: 0,
            lockEndTime: block.timestamp + LOCK_PERIOD,
            isEligibleForClaim: false
        });
        
        updateTop100Rankings();
        
        emit LiquidityAdded(user, nftTokenId, liquidityValue);
    }
    
    /**
     * @dev Remove liquidity position from reward program
     * @param user Address of the liquidity provider
     * @param nftTokenId Uniswap V3 NFT token ID
     */
    function removeLiquidityPosition(
        address user,
        uint256 nftTokenId
    ) external onlyOwner validPosition(user, nftTokenId) {
        liquidityPositions[user][nftTokenId].isActive = false;
        updateTop100Rankings();
        
        emit LiquidityRemoved(user, nftTokenId);
    }
    
    /**
     * @dev Update liquidity position value
     * @param user Address of the liquidity provider
     * @param nftTokenId Uniswap V3 NFT token ID
     * @param newLiquidityValue New USD value of the position
     */
    function updateLiquidityValue(
        address user,
        uint256 nftTokenId,
        uint256 newLiquidityValue
    ) external onlyOwner validPosition(user, nftTokenId) {
        require(newLiquidityValue >= MIN_POSITION_VALUE, "Position value too low");
        
        liquidityPositions[user][nftTokenId].liquidityValue = newLiquidityValue;
        updateTop100Rankings();
    }
    
    /**
     * @dev Calculate daily rewards for a user position
     * @param user Address of the liquidity provider
     * @param nftTokenId Uniswap V3 NFT token ID
     * @return dailyReward Amount of KILT tokens earned per day
     */
    function calculateDailyRewards(
        address user,
        uint256 nftTokenId
    ) public view validPosition(user, nftTokenId) returns (uint256 dailyReward) {
        LiquidityPosition memory position = liquidityPositions[user][nftTokenId];
        uint256 rank = userRanking[user];
        
        if (rank == 0 || rank > MAX_PARTICIPANTS) {
            return 0;
        }
        
        // Get total liquidity of top 100
        uint256 totalTop100Liquidity = getTotalTop100Liquidity();
        if (totalTop100Liquidity == 0) {
            return 0;
        }
        
        // Calculate days active
        uint256 daysActive = (block.timestamp - position.stakingStartDate) / 1 days;
        if (daysActive == 0) daysActive = 1;
        
        // Liquidity + Duration Weighted Rule
        // R_u = (w1 * L_u/T_top100 + w2 * D_u/365) * R/365/100 * (1 - (rank-1)/99)
        uint256 w1 = 60; // 0.6 * 100 for integer math
        uint256 w2 = 40; // 0.4 * 100 for integer math
        
        uint256 liquidityRatio = (position.liquidityValue * w1) / totalTop100Liquidity;
        uint256 timeRatio = (daysActive * w2) / 365;
        
        uint256 baseReward = (liquidityRatio + timeRatio) * dailyRewardBudget / 100;
        
        // Apply rank multiplier: (1 - (rank-1)/99)
        uint256 rankMultiplier = 100 - ((rank - 1) * 100) / 99;
        dailyReward = (baseReward * rankMultiplier) / 100;
        
        return dailyReward;
    }
    
    /**
     * @dev Distribute daily rewards to all active positions
     * Called by backend service daily
     */
    function distributeDaily Rewards() external onlyOwner onlyDuringProgram {
        for (uint256 i = 0; i < top100Participants.length; i++) {
            address user = top100Participants[i];
            uint256[] memory positions = userPositions[user];
            
            for (uint256 j = 0; j < positions.length; j++) {
                uint256 nftTokenId = positions[j];
                
                if (liquidityPositions[user][nftTokenId].isActive) {
                    uint256 dailyReward = calculateDailyRewards(user, nftTokenId);
                    
                    if (dailyReward > 0) {
                        rewardInfo[user][nftTokenId].totalEarned += dailyReward;
                        
                        // Check if 90-day lock period has passed
                        if (block.timestamp >= rewardInfo[user][nftTokenId].lockEndTime) {
                            rewardInfo[user][nftTokenId].isEligibleForClaim = true;
                        }
                        
                        emit RewardsEarned(user, nftTokenId, dailyReward);
                    }
                }
            }
        }
        
        totalRewardsDistributed += dailyRewardBudget;
    }
    
    /**
     * @dev Claim accumulated rewards after 90-day lock period
     * @param nftTokenIds Array of NFT token IDs to claim rewards for
     */
    function claimRewards(uint256[] calldata nftTokenIds) external nonReentrant whenNotPaused {
        uint256 totalClaimable = 0;
        
        for (uint256 i = 0; i < nftTokenIds.length; i++) {
            uint256 nftTokenId = nftTokenIds[i];
            RewardInfo storage reward = rewardInfo[msg.sender][nftTokenId];
            
            require(reward.isEligibleForClaim, "Rewards not eligible for claim yet");
            require(block.timestamp >= reward.lockEndTime, "Still in lock period");
            
            uint256 claimableAmount = reward.totalEarned - reward.claimed;
            
            if (claimableAmount > 0) {
                totalClaimable += claimableAmount;
                reward.claimed += claimableAmount;
                reward.lastClaimTime = block.timestamp;
            }
        }
        
        require(totalClaimable > 0, "No rewards to claim");
        require(kiltToken.balanceOf(rewardWallet) >= totalClaimable, "Insufficient reward wallet balance");
        
        // Transfer tokens from reward wallet to user
        kiltToken.safeTransferFrom(rewardWallet, msg.sender, totalClaimable);
        
        emit RewardsClaimed(msg.sender, totalClaimable);
    }
    
    /**
     * @dev Update top 100 rankings based on current liquidity values
     */
    function updateTop100Rankings() internal {
        // Get all active positions
        address[] memory allUsers = new address[](1000); // Temporary array, size may need adjustment
        uint256 userCount = 0;
        
        // This is a simplified version - in production, you'd need a more efficient approach
        // to track all users and their total liquidity values
        
        // For now, we'll just update the existing top100Participants array
        // In a full implementation, you'd need to:
        // 1. Get all users with active positions
        // 2. Calculate their total liquidity scores
        // 3. Sort by liquidity value
        // 4. Take top 100
        // 5. Update rankings
        
        emit Top100Updated(top100Participants);
    }
    
    /**
     * @dev Get total liquidity of top 100 participants
     * @return totalLiquidity Total USD value of all top 100 positions
     */
    function getTotalTop100Liquidity() public view returns (uint256 totalLiquidity) {
        for (uint256 i = 0; i < top100Participants.length; i++) {
            address user = top100Participants[i];
            uint256[] memory positions = userPositions[user];
            
            for (uint256 j = 0; j < positions.length; j++) {
                uint256 nftTokenId = positions[j];
                
                if (liquidityPositions[user][nftTokenId].isActive) {
                    totalLiquidity += liquidityPositions[user][nftTokenId].liquidityValue;
                }
            }
        }
    }
    
    /**
     * @dev Get user's claimable rewards
     * @param user Address of the user
     * @return claimableAmount Total claimable KILT tokens
     */
    function getClaimableRewards(address user) external view returns (uint256 claimableAmount) {
        uint256[] memory positions = userPositions[user];
        
        for (uint256 i = 0; i < positions.length; i++) {
            uint256 nftTokenId = positions[i];
            RewardInfo memory reward = rewardInfo[user][nftTokenId];
            
            if (reward.isEligibleForClaim && block.timestamp >= reward.lockEndTime) {
                claimableAmount += reward.totalEarned - reward.claimed;
            }
        }
    }
    
    /**
     * @dev Get user's pending rewards (still in lock period)
     * @param user Address of the user
     * @return pendingAmount Total pending KILT tokens
     */
    function getPendingRewards(address user) external view returns (uint256 pendingAmount) {
        uint256[] memory positions = userPositions[user];
        
        for (uint256 i = 0; i < positions.length; i++) {
            uint256 nftTokenId = positions[i];
            RewardInfo memory reward = rewardInfo[user][nftTokenId];
            
            if (block.timestamp < reward.lockEndTime) {
                pendingAmount += reward.totalEarned - reward.claimed;
            }
        }
    }
    
    /**
     * @dev Update reward wallet address
     * @param _newRewardWallet New reward wallet address
     */
    function updateRewardWallet(address _newRewardWallet) external onlyOwner {
        require(_newRewardWallet != address(0), "Invalid reward wallet address");
        require(_newRewardWallet != rewardWallet, "Same reward wallet address");
        
        address oldWallet = rewardWallet;
        rewardWallet = _newRewardWallet;
        
        emit RewardWalletUpdated(oldWallet, _newRewardWallet);
    }
    
    /**
     * @dev Emergency withdraw function for contract owner
     * Only withdraws tokens that were accidentally sent to the contract
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = kiltToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        kiltToken.safeTransfer(owner(), balance);
    }
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get program info
     * @return startTime Program start timestamp
     * @return endTime Program end timestamp
     * @return totalAllocated Total KILT tokens allocated
     * @return totalDistributed Total KILT tokens distributed
     * @return remainingBudget Remaining KILT tokens to distribute
     * @return currentRewardWallet Current reward wallet address
     * @return rewardWalletBalance Current balance of reward wallet
     */
    function getProgramInfo() external view returns (
        uint256 startTime,
        uint256 endTime,
        uint256 totalAllocated,
        uint256 totalDistributed,
        uint256 remainingBudget,
        address currentRewardWallet,
        uint256 rewardWalletBalance
    ) {
        startTime = programStartTime;
        endTime = programEndTime;
        totalAllocated = TREASURY_ALLOCATION;
        totalDistributed = totalRewardsDistributed;
        remainingBudget = TREASURY_ALLOCATION - totalRewardsDistributed;
        currentRewardWallet = rewardWallet;
        rewardWalletBalance = kiltToken.balanceOf(rewardWallet);
    }
}