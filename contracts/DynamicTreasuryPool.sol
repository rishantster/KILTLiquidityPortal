// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title DynamicTreasuryPool
 * @dev Smart contract for dynamic KILT reward distribution where rewards are calculated
 * in real-time based on liquidity positions and can be claimed instantly without
 * requiring backend private keys.
 */
contract DynamicTreasuryPool is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable kiltToken;
    
    // Authorized calculators (your backend services)
    mapping(address => bool) public authorizedCalculators;
    
    // User address => total amount already claimed (in wei) - matches app's claimedAmount
    mapping(address => uint256) public claimedAmount;
    
    // Track last claim timestamp to prevent spam  
    mapping(address => uint256) public lastClaimTime;
    
    // Minimum time between claims (reduced for high-throughput)
    uint256 public constant MIN_CLAIM_INTERVAL = 5 minutes;
    
    // Gas optimization: Track total claims for analytics
    uint256 public totalClaimsProcessed;
    uint256 public totalAmountClaimed;
    
    // Events - matches app terminology & optimized for indexing
    event RewardClaimed(address indexed user, uint256 amount, uint256 claimedAmount, uint256 timestamp);
    event CalculatorAuthorized(address indexed calculator, bool authorized);
    event TreasuryDeposit(uint256 amount);
    event TreasuryWithdraw(uint256 amount);
    
    constructor(
        address _kiltToken,
        address _owner
    ) {
        require(_kiltToken != address(0), "Invalid token address");
        require(_owner != address(0), "Invalid owner address");
        
        kiltToken = IERC20(_kiltToken);
        _transferOwnership(_owner);
    }

    /**
     * @dev Authorize/deauthorize reward calculators (owner only)
     * @param calculator Address of the calculator service
     * @param authorized Whether to authorize or revoke
     */
    function setCalculatorAuthorization(address calculator, bool authorized) external onlyOwner {
        require(calculator != address(0), "Invalid calculator address");
        authorizedCalculators[calculator] = authorized;
        emit CalculatorAuthorized(calculator, authorized);
    }
    


    /**
     * @dev Claim dynamically calculated rewards
     * @param amount Amount to claim (calculated by authorized backend)
     * @param signature Signature from authorized calculator validating the claim
     */
    function claimRewards(
        uint256 amount,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(
            block.timestamp >= lastClaimTime[msg.sender] + MIN_CLAIM_INTERVAL,
            "Claim too soon after last claim"
        );
        
        // Verify signature from authorized calculator (gas optimized)
        bytes32 messageHash = _createMessageHash(msg.sender, amount);
        address signer = _recoverSignerOptimized(messageHash, signature);
        require(authorizedCalculators[signer], "Invalid calculator signature");
        
        // Check contract balance
        uint256 contractBalance = kiltToken.balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient contract balance");
        
        // Update state before transfer (CEI pattern) - gas optimized
        unchecked {
            claimedAmount[msg.sender] += amount;
            totalClaimsProcessed += 1;
            totalAmountClaimed += amount;
        }
        lastClaimTime[msg.sender] = block.timestamp;
        
        // Transfer KILT tokens to user
        require(kiltToken.transfer(msg.sender, amount), "Token transfer failed");
        
        emit RewardClaimed(msg.sender, amount, claimedAmount[msg.sender], block.timestamp);
    }
    
    /**
     * @dev Emergency claim function for owner to process claims manually
     * @param user User address
     * @param amount Amount to claim
     */
    function emergencyClaim(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 contractBalance = kiltToken.balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient contract balance");
        
        // Update state before transfer
        unchecked {
            claimedAmount[user] += amount;
            totalClaimsProcessed += 1;
            totalAmountClaimed += amount;
        }
        
        // Transfer KILT tokens to user
        require(kiltToken.transfer(user, amount), "Token transfer failed");
        
        emit RewardClaimed(user, amount, claimedAmount[user], block.timestamp);
    }

    /**
     * Get user claim statistics - matches app's getUserStats pattern
     * @param user Address of the user
     * @return claimed Total amount claimed by user
     * @return lastClaim Timestamp of last claim
     * @return canClaimAt Next timestamp when user can claim
     */
    function getUserStats(address user) external view returns (
        uint256 claimed,
        uint256 lastClaim,
        uint256 canClaimAt
    ) {
        claimed = claimedAmount[user];
        lastClaim = lastClaimTime[user];
        canClaimAt = lastClaim + MIN_CLAIM_INTERVAL;
    }
    
    /**
     * Get total claimed amount for a user - matches app's getClaimedAmount pattern
     * @param user Address of the user
     * @return claimed Amount already claimed by the user
     */
    function getClaimedAmount(address user) external view returns (uint256) {
        return claimedAmount[user];
    }
    
    /**
     * @dev Check if user can claim now
     * @param user Address to check
     * @return canClaim Whether user can claim now
     */
    function canUserClaim(address user) external view returns (bool) {
        return block.timestamp >= lastClaimTime[user] + MIN_CLAIM_INTERVAL;
    }
    
    /**
     * @dev Deposit KILT tokens to the treasury (owner only)
     * @param amount Amount of KILT tokens to deposit
     */
    function depositTreasury(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        
        bool success = kiltToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        
        emit TreasuryDeposit(amount);
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     * @param amount Amount to withdraw (0 = withdraw all)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        uint256 balance = kiltToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        
        uint256 withdrawAmount = amount == 0 ? balance : amount;
        require(withdrawAmount <= balance, "Insufficient balance");
        
        bool success = kiltToken.transfer(owner(), withdrawAmount);
        require(success, "Transfer failed");
        
        emit TreasuryWithdraw(withdrawAmount);
    }
    
    /**
     * @dev Get contract's KILT token balance
     * @return balance Current KILT token balance of the contract
     */
    function getContractBalance() external view returns (uint256) {
        return kiltToken.balanceOf(address(this));
    }
    
    /**
     * @dev Emergency pause/unpause functions
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }


    
    /**
     * @dev Get contract statistics for monitoring
     */
    function getContractStats() external view returns (
        uint256 balance,
        uint256 totalClaims,
        uint256 totalAmount
    ) {
        balance = kiltToken.balanceOf(address(this));
        totalClaims = totalClaimsProcessed;
        totalAmount = totalAmountClaimed;
    }
    
    /**
     * @dev Create message hash for signature verification (gas optimized)
     */
    function _createMessageHash(address user, uint256 amount) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked(
                user,
                amount,
                block.timestamp / MIN_CLAIM_INTERVAL // Time window for replay protection
            ))
        ));
    }
    
    /**
     * @dev Optimized signature recovery
     */
    function _recoverSignerOptimized(bytes32 hash, bytes calldata signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 0x20))
            v := byte(0, calldataload(add(signature.offset, 0x40)))
        }
        
        return ecrecover(hash, v, r, s);
    }
}