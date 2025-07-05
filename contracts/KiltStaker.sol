// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title KiltStaker
 * @notice Smart contract for KILT liquidity mining rewards on Uniswap V3
 */
contract KiltStaker {
    // Token addresses
    address public constant KILT_TOKEN = 0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8;
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    
    // Program parameters
    uint256 public constant BASE_APR = 4720; // 47.20% (in basis points)
    uint256 public constant TREASURY_ALLOCATION = 2905600 * 1e18; // 1% of total supply
    uint256 public constant PROGRAM_DURATION = 30 days;
    
    // State variables
    address public owner;
    bool public programActive;
    uint256 public programStartTime;
    uint256 public totalRewardsDistributed;
    uint256 public totalPositionsStaked;
    
    // Position tracking
    struct StakeInfo {
        address owner;
        uint256 liquidity;
        uint256 stakedAt;
        uint256 lastClaimTime;
        bool active;
    }
    
    mapping(uint256 => StakeInfo) public stakes; // tokenId => StakeInfo
    mapping(address => uint256[]) public userStakes; // user => tokenIds
    mapping(address => uint256) public pendingRewards; // user => amount
    
    // Events
    event ProgramStarted(uint256 timestamp);
    event PositionStaked(address indexed user, uint256 indexed tokenId, uint256 liquidity);
    event PositionUnstaked(address indexed user, uint256 indexed tokenId);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsCalculated(uint256 indexed tokenId, uint256 baseAPR, uint256 timeMultiplier, uint256 sizeMultiplier, uint256 dailyRewards);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier programIsActive() {
        require(programActive && block.timestamp < programStartTime + PROGRAM_DURATION, "Program not active");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @notice Start the incentive program
     */
    function startProgram() external onlyOwner {
        require(!programActive, "Program already started");
        programActive = true;
        programStartTime = block.timestamp;
        emit ProgramStarted(block.timestamp);
    }
    
    /**
     * @notice Stake a Uniswap V3 NFT position
     * @param tokenId The NFT token ID
     * @param liquidity The liquidity amount in the position
     */
    function stakePosition(uint256 tokenId, uint256 liquidity) external programIsActive {
        require(liquidity > 0, "No liquidity");
        require(!stakes[tokenId].active, "Already staked");
        
        stakes[tokenId] = StakeInfo({
            owner: msg.sender,
            liquidity: liquidity,
            stakedAt: block.timestamp,
            lastClaimTime: block.timestamp,
            active: true
        });
        
        userStakes[msg.sender].push(tokenId);
        totalPositionsStaked++;
        
        emit PositionStaked(msg.sender, tokenId, liquidity);
    }
    
    /**
     * @notice Unstake a position and claim rewards
     * @param tokenId The NFT token ID to unstake
     */
    function unstakePosition(uint256 tokenId) external {
        StakeInfo storage stake = stakes[tokenId];
        require(stake.active, "Position not staked");
        require(stake.owner == msg.sender, "Not your position");
        
        // Calculate pending rewards
        uint256 rewards = calculateRewards(tokenId);
        pendingRewards[msg.sender] += rewards;
        
        // Mark as inactive
        stake.active = false;
        totalPositionsStaked--;
        
        // Remove from user stakes array
        _removeFromUserStakes(msg.sender, tokenId);
        
        emit PositionUnstaked(msg.sender, tokenId);
    }
    
    /**
     * @notice Claim all pending rewards
     */
    function claimRewards() external {
        // Update rewards for all active positions
        uint256[] memory userTokenIds = userStakes[msg.sender];
        for (uint256 i = 0; i < userTokenIds.length; i++) {
            if (stakes[userTokenIds[i]].active) {
                uint256 rewards = calculateRewards(userTokenIds[i]);
                pendingRewards[msg.sender] += rewards;
                stakes[userTokenIds[i]].lastClaimTime = block.timestamp;
            }
        }
        
        uint256 totalRewards = pendingRewards[msg.sender];
        require(totalRewards > 0, "No rewards to claim");
        
        pendingRewards[msg.sender] = 0;
        totalRewardsDistributed += totalRewards;
        
        // In a real implementation, transfer KILT tokens here
        // IERC20(KILT_TOKEN).transfer(msg.sender, totalRewards);
        
        emit RewardsClaimed(msg.sender, totalRewards);
    }
    
    /**
     * @notice Calculate current rewards for a staked position
     * @param tokenId The NFT token ID
     * @return rewards The calculated reward amount
     */
    function calculateRewards(uint256 tokenId) public view returns (uint256 rewards) {
        StakeInfo memory stake = stakes[tokenId];
        if (!stake.active) return 0;
        
        // Calculate time-based multiplier (1x to 2x over 30 days)
        uint256 daysStaked = (block.timestamp - stake.stakedAt) / 1 days;
        uint256 timeMultiplier = 1e18 + (daysStaked * 1e18) / 30; // Linear progression to 2x
        if (timeMultiplier > 2e18) timeMultiplier = 2e18;
        
        // Calculate size-based multiplier (1x to 1.5x for large positions)
        uint256 sizeMultiplier = 1e18;
        if (stake.liquidity >= 100000e18) { // $100k+ positions get max multiplier
            sizeMultiplier = 15e17; // 1.5x
        } else {
            sizeMultiplier += (stake.liquidity * 5e17) / 100000e18; // Linear progression
        }
        
        // Calculate effective APR
        uint256 effectiveAPR = (BASE_APR * timeMultiplier * sizeMultiplier) / (1e18 * 1e18);
        
        // Calculate time since last claim
        uint256 timeStaked = block.timestamp - stake.lastClaimTime;
        
        // Calculate daily rewards: (liquidity * effectiveAPR) / (365 * 10000)
        uint256 dailyRewards = (stake.liquidity * effectiveAPR) / (365 * 10000);
        
        // Calculate rewards for time period
        rewards = (dailyRewards * timeStaked) / 1 days;
        
        // Emit calculation event for frontend
        if (rewards > 0) {
            // Note: This is a view function, so events won't actually be emitted
            // but we include this for clarity of what would happen in a state-changing version
        }
    }
    
    /**
     * @notice Get all staked positions for a user
     * @param user The user address
     * @return tokenIds Array of staked token IDs
     */
    function getUserStakes(address user) external view returns (uint256[] memory) {
        return userStakes[user];
    }
    
    /**
     * @notice Get stake information for a position
     * @param tokenId The NFT token ID
     * @return stake The stake information
     */
    function getStakeInfo(uint256 tokenId) external view returns (StakeInfo memory) {
        return stakes[tokenId];
    }
    
    /**
     * @notice Get total pending rewards for a user
     * @param user The user address
     * @return total Total pending rewards
     */
    function getTotalPendingRewards(address user) external view returns (uint256 total) {
        total = pendingRewards[user];
        
        // Add rewards from active positions
        uint256[] memory userTokenIds = userStakes[user];
        for (uint256 i = 0; i < userTokenIds.length; i++) {
            if (stakes[userTokenIds[i]].active) {
                total += calculateRewards(userTokenIds[i]);
            }
        }
    }
    
    /**
     * @notice Get program statistics
     * @return programActive_ Whether program is active
     * @return timeRemaining Time remaining in seconds
     * @return totalStaked Total positions staked
     * @return totalDistributed Total rewards distributed
     */
    function getProgramStats() external view returns (
        bool programActive_,
        uint256 timeRemaining,
        uint256 totalStaked,
        uint256 totalDistributed
    ) {
        programActive_ = programActive;
        
        if (programActive && block.timestamp < programStartTime + PROGRAM_DURATION) {
            timeRemaining = programStartTime + PROGRAM_DURATION - block.timestamp;
        } else {
            timeRemaining = 0;
        }
        
        totalStaked = totalPositionsStaked;
        totalDistributed = totalRewardsDistributed;
    }
    
    // Internal functions
    
    function _removeFromUserStakes(address user, uint256 tokenId) internal {
        uint256[] storage userTokenIds = userStakes[user];
        for (uint256 i = 0; i < userTokenIds.length; i++) {
            if (userTokenIds[i] == tokenId) {
                userTokenIds[i] = userTokenIds[userTokenIds.length - 1];
                userTokenIds.pop();
                break;
            }
        }
    }
    
    // Admin functions
    
    function endProgram() external onlyOwner {
        programActive = false;
    }
    
    function updateOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}