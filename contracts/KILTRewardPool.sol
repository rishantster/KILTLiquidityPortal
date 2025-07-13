// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title KILTRewardPool
 * @dev Smart contract for KILT Liquidity Incentive Program with 7-day rolling claims
 * Implements unlimited participant proportional reward system
 */
contract KILTRewardPool is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // KILT token contract
    IERC20 public immutable kiltToken;
    
    // Reward wallet address (separate from contract funding)
    address public rewardWallet;
    
    // Program parameters (configurable by admin)
    uint256 public treasuryAllocation;
    uint256 public programDuration;
    uint256 public constant LOCK_PERIOD = 7 days; // 7 days rolling lock period
    uint256 public constant MIN_POSITION_VALUE = 0; // No minimum position value
    
    // Program timing
    uint256 public programStartTime;
    uint256 public programEndTime;
    
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
    
    // Individual daily reward tracking for rolling 7-day claims
    struct DailyReward {
        uint256 amount;
        uint256 createdAt;
        uint256 lockEndTime;
        bool claimed;
    }
    
    // Reward tracking
    struct RewardInfo {
        uint256 totalEarned;
        uint256 totalClaimed;
        uint256 lastClaimTime;
        DailyReward[] dailyRewards;
    }
    
    // Mappings
    mapping(address => mapping(uint256 => LiquidityPosition)) public liquidityPositions;
    mapping(address => mapping(uint256 => RewardInfo)) public rewardInfo;
    mapping(address => uint256[]) public userPositions;
    
    // All participants tracking (unlimited)
    address[] public allParticipants;
    mapping(address => bool) public isParticipant;
    
    // Events
    event LiquidityAdded(address indexed user, uint256 indexed nftTokenId, uint256 liquidityValue);
    event LiquidityRemoved(address indexed user, uint256 indexed nftTokenId);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsEarned(address indexed user, uint256 indexed nftTokenId, uint256 amount);
    event ParticipantAdded(address indexed participant);
    event RewardWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event ProgramConfigUpdated(uint256 treasuryAllocation, uint256 programDuration, uint256 dailyBudget);
    
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
        uint256 _treasuryAllocation,
        uint256 _programDuration,
        uint256 _programStartTime
    ) {
        require(_kiltToken != address(0), "Invalid KILT token address");
        require(_rewardWallet != address(0), "Invalid reward wallet address");
        require(_programStartTime > block.timestamp, "Start time must be in future");
        require(_treasuryAllocation > 0, "Treasury allocation must be positive");
        require(_programDuration > 0, "Program duration must be positive");
        
        kiltToken = IERC20(_kiltToken);
        rewardWallet = _rewardWallet;
        treasuryAllocation = _treasuryAllocation;
        programDuration = _programDuration;
        programStartTime = _programStartTime;
        programEndTime = _programStartTime + _programDuration;
        dailyRewardBudget = _treasuryAllocation / (_programDuration / 1 days);
    }
    
    /**
     * @dev Update program configuration (admin only)
     */
    function updateProgramConfig(
        uint256 _treasuryAllocation,
        uint256 _programDuration,
        uint256 _programStartTime
    ) external onlyOwner {
        require(_programStartTime > block.timestamp, "Start time must be in future");
        require(_treasuryAllocation > 0, "Treasury allocation must be positive");
        require(_programDuration > 0, "Program duration must be positive");
        
        treasuryAllocation = _treasuryAllocation;
        programDuration = _programDuration;
        programStartTime = _programStartTime;
        programEndTime = _programStartTime + _programDuration;
        dailyRewardBudget = _treasuryAllocation / (_programDuration / 1 days);
        
        emit ProgramConfigUpdated(_treasuryAllocation, _programDuration, dailyRewardBudget);
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
        require(liquidityValue > MIN_POSITION_VALUE, "Position value too low");
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
        
        // Initialize reward info
        rewardInfo[user][nftTokenId].totalEarned = 0;
        rewardInfo[user][nftTokenId].totalClaimed = 0;
        rewardInfo[user][nftTokenId].lastClaimTime = 0;
        
        // Add to participants if not already added
        if (!isParticipant[user]) {
            allParticipants.push(user);
            isParticipant[user] = true;
            emit ParticipantAdded(user);
        }
        
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
        require(newLiquidityValue > MIN_POSITION_VALUE, "Position value too low");
        liquidityPositions[user][nftTokenId].liquidityValue = newLiquidityValue;
    }
    
    /**
     * @dev Calculate daily rewards for a user position (proportional system)
     * @param user Address of the liquidity provider
     * @param nftTokenId Uniswap V3 NFT token ID
     * @return dailyReward Amount of KILT tokens earned per day
     */
    function calculateDailyRewards(
        address user,
        uint256 nftTokenId
    ) public view validPosition(user, nftTokenId) returns (uint256 dailyReward) {
        LiquidityPosition memory position = liquidityPositions[user][nftTokenId];
        
        // Get total liquidity across all participants
        uint256 totalLiquidity = getTotalActiveLiquidity();
        if (totalLiquidity == 0) {
            return 0;
        }
        
        // Calculate days active
        uint256 daysActive = (block.timestamp - position.stakingStartDate) / 1 days;
        if (daysActive == 0) daysActive = 1;
        
        // Proportional reward formula: R_u = (w1 * L_u/T_total + w2 * D_u/365) * R/365 * inRangeMultiplier
        uint256 w1 = 60; // 0.6 * 100 for integer math
        uint256 w2 = 40; // 0.4 * 100 for integer math
        
        uint256 liquidityRatio = (position.liquidityValue * w1) / totalLiquidity;
        uint256 timeRatio = (daysActive * w2) / 365;
        
        dailyReward = (liquidityRatio + timeRatio) * dailyRewardBudget / 100;
        
        return dailyReward;
    }
    
    /**
     * @dev Distribute daily rewards to all active positions
     * Called by backend service daily
     */
    function distributeDailyRewards() external onlyOwner onlyDuringProgram {
        for (uint256 i = 0; i < allParticipants.length; i++) {
            address user = allParticipants[i];
            uint256[] memory positions = userPositions[user];
            
            for (uint256 j = 0; j < positions.length; j++) {
                uint256 nftTokenId = positions[j];
                
                if (liquidityPositions[user][nftTokenId].isActive) {
                    uint256 dailyReward = calculateDailyRewards(user, nftTokenId);
                    
                    if (dailyReward > 0) {
                        // Add daily reward with 7-day lock period
                        rewardInfo[user][nftTokenId].dailyRewards.push(DailyReward({
                            amount: dailyReward,
                            createdAt: block.timestamp,
                            lockEndTime: block.timestamp + LOCK_PERIOD,
                            claimed: false
                        }));
                        
                        rewardInfo[user][nftTokenId].totalEarned += dailyReward;
                        emit RewardsEarned(user, nftTokenId, dailyReward);
                    }
                }
            }
        }
        
        totalRewardsDistributed += dailyRewardBudget;
    }
    
    /**
     * @dev Claim accumulated rewards after 7-day rolling lock period
     * @param nftTokenIds Array of NFT token IDs to claim rewards for
     */
    function claimRewards(uint256[] calldata nftTokenIds) external nonReentrant whenNotPaused {
        uint256 totalClaimable = 0;
        
        for (uint256 i = 0; i < nftTokenIds.length; i++) {
            uint256 nftTokenId = nftTokenIds[i];
            RewardInfo storage reward = rewardInfo[msg.sender][nftTokenId];
            
            // Check each daily reward for claimability
            for (uint256 j = 0; j < reward.dailyRewards.length; j++) {
                DailyReward storage dailyReward = reward.dailyRewards[j];
                
                // If reward is not claimed and lock period has expired
                if (!dailyReward.claimed && block.timestamp >= dailyReward.lockEndTime) {
                    totalClaimable += dailyReward.amount;
                    dailyReward.claimed = true;
                    reward.totalClaimed += dailyReward.amount;
                }
            }
            
            reward.lastClaimTime = block.timestamp;
        }
        
        require(totalClaimable > 0, "No rewards available to claim");
        
        // Transfer tokens from reward wallet to user
        require(kiltToken.transferFrom(rewardWallet, msg.sender, totalClaimable), "Transfer failed");
        
        emit RewardsClaimed(msg.sender, totalClaimable);
    }
    
    /**
     * @dev Get claimable rewards for a user
     * @param user Address to check
     * @return claimable Total amount of KILT tokens ready to claim
     */
    function getClaimableRewards(address user) external view returns (uint256 claimable) {
        uint256[] memory positions = userPositions[user];
        
        for (uint256 i = 0; i < positions.length; i++) {
            uint256 nftTokenId = positions[i];
            RewardInfo memory reward = rewardInfo[user][nftTokenId];
            
            for (uint256 j = 0; j < reward.dailyRewards.length; j++) {
                DailyReward memory dailyReward = reward.dailyRewards[j];
                
                if (!dailyReward.claimed && block.timestamp >= dailyReward.lockEndTime) {
                    claimable += dailyReward.amount;
                }
            }
        }
        
        return claimable;
    }
    
    /**
     * @dev Get pending rewards for a user (still locked)
     * @param user Address to check
     * @return pending Total amount of KILT tokens still locked
     */
    function getPendingRewards(address user) external view returns (uint256 pending) {
        uint256[] memory positions = userPositions[user];
        
        for (uint256 i = 0; i < positions.length; i++) {
            uint256 nftTokenId = positions[i];
            RewardInfo memory reward = rewardInfo[user][nftTokenId];
            
            for (uint256 j = 0; j < reward.dailyRewards.length; j++) {
                DailyReward memory dailyReward = reward.dailyRewards[j];
                
                if (!dailyReward.claimed && block.timestamp < dailyReward.lockEndTime) {
                    pending += dailyReward.amount;
                }
            }
        }
        
        return pending;
    }
    
    /**
     * @dev Get total active liquidity across all participants
     * @return totalLiquidity Total USD value of all active positions
     */
    function getTotalActiveLiquidity() public view returns (uint256 totalLiquidity) {
        for (uint256 i = 0; i < allParticipants.length; i++) {
            address user = allParticipants[i];
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
     * @dev Get program information
     * @return startTime Program start timestamp
     * @return endTime Program end timestamp
     * @return totalAllocated Total treasury allocation
     * @return totalDistributed Total rewards distributed
     * @return remainingBudget Remaining budget
     * @return currentRewardWallet Current reward wallet address
     * @return rewardWalletBalance Current reward wallet balance
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
        return (
            programStartTime,
            programEndTime,
            treasuryAllocation,
            totalRewardsDistributed,
            treasuryAllocation - totalRewardsDistributed,
            rewardWallet,
            kiltToken.balanceOf(rewardWallet)
        );
    }
    
    /**
     * @dev Update reward wallet address
     * @param newRewardWallet New reward wallet address
     */
    function updateRewardWallet(address newRewardWallet) external onlyOwner {
        require(newRewardWallet != address(0), "Invalid reward wallet address");
        address oldWallet = rewardWallet;
        rewardWallet = newRewardWallet;
        emit RewardWalletUpdated(oldWallet, newRewardWallet);
    }
    
    /**
     * @dev Emergency pause function
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Emergency unpause function
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get participant count
     * @return count Total number of participants
     */
    function getParticipantCount() external view returns (uint256 count) {
        return allParticipants.length;
    }
}