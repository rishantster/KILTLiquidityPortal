// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title AutoDistributeTreasuryPool
 * @dev Smart contract that allows users to claim KILT rewards automatically
 * without requiring the owner's private key on the frontend.
 * Uses EIP-712 signatures for secure, gasless authorization.
 */
contract AutoDistributeTreasuryPool is Ownable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;

    IERC20 public immutable kiltToken;
    
    // User address => total claimable amount (in wei)
    mapping(address => uint256) public claimableRewards;
    
    // User address => amount already claimed (in wei)
    mapping(address => uint256) public claimedRewards;
    
    // Nonce for each user to prevent replay attacks
    mapping(address => uint256) public nonces;
    
    // Events
    event RewardAuthorized(address indexed user, uint256 amount, uint256 nonce);
    event RewardClaimed(address indexed user, uint256 amount);
    event TreasuryDeposit(uint256 amount);
    event TreasuryWithdraw(uint256 amount);
    
    // EIP-712 type hash for reward authorization
    bytes32 private constant REWARD_TYPEHASH = keccak256(
        "RewardAuthorization(address user,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    constructor(
        address _kiltToken,
        address _owner
    ) EIP712("KILTTreasuryPool", "1") {
        kiltToken = IERC20(_kiltToken);
        _transferOwnership(_owner);
    }

    /**
     * @dev Authorize rewards for a user using EIP-712 signature
     * This allows the backend to authorize rewards without exposing private keys
     * @param user Address of the user to authorize rewards for
     * @param amount Amount of KILT tokens to authorize (in wei)
     * @param deadline Timestamp after which the authorization expires
     * @param signature EIP-712 signature from the owner
     */
    function authorizeReward(
        address user,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "Authorization expired");
        require(amount > 0, "Amount must be greater than 0");
        
        uint256 nonce = nonces[user];
        
        // Construct the EIP-712 hash
        bytes32 structHash = keccak256(
            abi.encode(REWARD_TYPEHASH, user, amount, nonce, deadline)
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        
        // Verify the signature is from the owner
        address signer = hash.recover(signature);
        require(signer == owner(), "Invalid signature");
        
        // Update the user's claimable rewards
        claimableRewards[user] = amount;
        nonces[user] = nonce + 1;
        
        emit RewardAuthorized(user, amount, nonce);
    }

    /**
     * @dev Claim authorized rewards - users pay gas, no private key needed
     * @param amount Amount to claim (must not exceed claimable amount)
     */
    function claimRewards(uint256 amount) external nonReentrant {
        address user = msg.sender;
        uint256 claimableAmount = getClaimableAmount(user);
        
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= claimableAmount, "Insufficient claimable rewards");
        require(kiltToken.balanceOf(address(this)) >= amount, "Insufficient contract balance");
        
        // Update claimed amount
        claimedRewards[user] += amount;
        
        // Transfer KILT tokens to user
        require(kiltToken.transfer(user, amount), "Token transfer failed");
        
        emit RewardClaimed(user, amount);
    }

    /**
     * @dev Claim all available rewards for the caller
     */
    function claimAllRewards() external {
        uint256 claimableAmount = getClaimableAmount(msg.sender);
        require(claimableAmount > 0, "No rewards to claim");
        
        claimRewards(claimableAmount);
    }

    /**
     * @dev Get the amount of rewards a user can claim
     * @param user Address of the user
     * @return claimable Amount of KILT tokens the user can claim (in wei)
     */
    function getClaimableAmount(address user) public view returns (uint256) {
        uint256 totalClaimable = claimableRewards[user];
        uint256 alreadyClaimed = claimedRewards[user];
        
        if (totalClaimable <= alreadyClaimed) {
            return 0;
        }
        
        return totalClaimable - alreadyClaimed;
    }

    /**
     * @dev Get total rewards (claimed + claimable) for a user
     * @param user Address of the user
     * @return total Total rewards authorized for the user
     */
    function getTotalRewards(address user) external view returns (uint256) {
        return claimableRewards[user];
    }

    /**
     * @dev Get amount already claimed by a user
     * @param user Address of the user
     * @return claimed Amount already claimed by the user
     */
    function getClaimedAmount(address user) external view returns (uint256) {
        return claimedRewards[user];
    }

    /**
     * @dev Deposit KILT tokens to the treasury (owner only)
     * @param amount Amount of KILT tokens to deposit
     */
    function depositTreasury(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(kiltToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
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
        require(kiltToken.transfer(owner(), withdrawAmount), "Transfer failed");
        
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
     * @dev Get the domain separator for EIP-712
     * @return separator The domain separator hash
     */
    function getDomainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @dev Generate the hash for reward authorization (for frontend use)
     * @param user Address of the user
     * @param amount Amount of rewards
     * @param nonce Current nonce for the user
     * @param deadline Authorization deadline
     * @return hash The hash to be signed
     */
    function getRewardAuthorizationHash(
        address user,
        uint256 amount,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(REWARD_TYPEHASH, user, amount, nonce, deadline)
        );
        return _hashTypedDataV4(structHash);
    }
}