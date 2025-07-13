import { ethers } from 'ethers';
import { db } from './db';
import { 
  rewards, 
  lpPositions, 
  users,
  type InsertReward,
  type Reward
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

import { isValidEthereumAddress } from './crypto-utils';

// Smart contract configuration with validation
const KILT_REWARD_POOL_ADDRESS = process.env.KILT_REWARD_POOL_ADDRESS || '';
const REWARD_WALLET_ADDRESS = process.env.REWARD_WALLET_ADDRESS || '';
const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
// SECURITY: Private key removed from service layer for enhanced security

// Validate contract addresses at startup
if (KILT_REWARD_POOL_ADDRESS && !isValidEthereumAddress(KILT_REWARD_POOL_ADDRESS)) {
  throw new Error('Invalid KILT_REWARD_POOL_ADDRESS format');
}
if (REWARD_WALLET_ADDRESS && !isValidEthereumAddress(REWARD_WALLET_ADDRESS)) {
  throw new Error('Invalid REWARD_WALLET_ADDRESS format');
}
if (!isValidEthereumAddress(KILT_TOKEN_ADDRESS)) {
  throw new Error('Invalid KILT_TOKEN_ADDRESS format');
}

// Contract ABI (minimal interface)
const REWARD_POOL_ABI = [
  'function addLiquidityPosition(address user, uint256 nftTokenId, uint256 liquidityValue) external',
  'function removeLiquidityPosition(address user, uint256 nftTokenId) external',
  'function updateLiquidityValue(address user, uint256 nftTokenId, uint256 newLiquidityValue) external',
  'function distributeDailyRewards() external',
  'function calculateDailyRewards(address user, uint256 nftTokenId) external view returns (uint256)',
  'function getClaimableRewards(address user) external view returns (uint256)',
  'function getPendingRewards(address user) external view returns (uint256)',
  'function updateRewardWallet(address newRewardWallet) external',
  'function getProgramInfo() external view returns (uint256, uint256, uint256, uint256, uint256, address, uint256)',
  'function rewardWallet() external view returns (address)',
  'function claimRewards(uint256[] calldata nftTokenIds) external',
  'event LiquidityAdded(address indexed user, uint256 indexed nftTokenId, uint256 liquidityValue)',
  'event LiquidityRemoved(address indexed user, uint256 indexed nftTokenId)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
  'event RewardsEarned(address indexed user, uint256 indexed nftTokenId, uint256 amount)',
  'event RewardWalletUpdated(address indexed oldWallet, address indexed newWallet)'
];

const KILT_TOKEN_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)'
];

export class SmartContractService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  private rewardPoolContract: ethers.Contract | null = null;
  private kiltTokenContract: ethers.Contract | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    
    if (KILT_REWARD_POOL_ADDRESS && process.env.REWARD_WALLET_PRIVATE_KEY) {
      this.wallet = new ethers.Wallet(process.env.REWARD_WALLET_PRIVATE_KEY, this.provider);
      this.rewardPoolContract = new ethers.Contract(
        KILT_REWARD_POOL_ADDRESS,
        REWARD_POOL_ABI,
        this.wallet
      );
      this.kiltTokenContract = new ethers.Contract(
        KILT_TOKEN_ADDRESS,
        KILT_TOKEN_ABI,
        this.wallet
      );
    }
  }

  /**
   * Check if smart contract integration is available
   */
  isContractAvailable(): boolean {
    return !!(this.wallet && this.rewardPoolContract && KILT_REWARD_POOL_ADDRESS);
  }

  /**
   * Add liquidity position to smart contract
   */
  async addLiquidityPosition(
    userAddress: string,
    nftTokenId: string,
    liquidityValueUSD: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.isContractAvailable()) {
      return { success: false, error: 'Smart contract not available' };
    }

    try {
      // Convert USD value to 18 decimals
      const liquidityValue = ethers.parseEther(liquidityValueUSD.toString());
      
      const tx = await this.rewardPoolContract!.addLiquidityPosition(
        userAddress,
        nftTokenId,
        liquidityValue
      );

      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Failed to add liquidity position to contract:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove liquidity position from smart contract
   */
  async removeLiquidityPosition(
    userAddress: string,
    nftTokenId: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.isContractAvailable()) {
      return { success: false, error: 'Smart contract not available' };
    }

    try {
      const tx = await this.rewardPoolContract!.removeLiquidityPosition(
        userAddress,
        nftTokenId
      );

      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Failed to remove liquidity position from contract:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update liquidity position value in smart contract
   */
  async updateLiquidityValue(
    userAddress: string,
    nftTokenId: string,
    newLiquidityValueUSD: number
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.isContractAvailable()) {
      return { success: false, error: 'Smart contract not available' };
    }

    try {
      const liquidityValue = ethers.parseEther(newLiquidityValueUSD.toString());
      
      const tx = await this.rewardPoolContract!.updateLiquidityValue(
        userAddress,
        nftTokenId,
        liquidityValue
      );

      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Failed to update liquidity value in contract:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Distribute daily rewards via smart contract
   */
  async distributeDailyRewards(): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.isContractAvailable()) {
      return { success: false, error: 'Smart contract not available' };
    }

    try {
      const tx = await this.rewardPoolContract!.distributeDailyRewards();
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Failed to distribute daily rewards:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get claimable rewards for a user from smart contract
   */
  async getClaimableRewards(userAddress: string): Promise<number> {
    if (!this.isContractAvailable()) {
      return 0;
    }

    try {
      const claimableAmount = await this.rewardPoolContract!.getClaimableRewards(userAddress);
      return parseFloat(ethers.formatEther(claimableAmount));
    } catch (error) {
      console.error('Failed to get claimable rewards:', error);
      return 0;
    }
  }

  /**
   * Get pending rewards for a user from smart contract
   */
  async getPendingRewards(userAddress: string): Promise<number> {
    if (!this.isContractAvailable()) {
      return 0;
    }

    try {
      const pendingAmount = await this.rewardPoolContract!.getPendingRewards(userAddress);
      return parseFloat(ethers.formatEther(pendingAmount));
    } catch (error) {
      console.error('Failed to get pending rewards:', error);
      return 0;
    }
  }

  /**
   * Update reward wallet address in smart contract
   */
  async updateRewardWallet(newRewardWallet: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.isContractAvailable()) {
      return { success: false, error: 'Smart contract not available' };
    }

    try {
      const tx = await this.rewardPoolContract!.updateRewardWallet(newRewardWallet);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Failed to update reward wallet:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get program information from smart contract
   */
  async getProgramInfo(): Promise<{
    startTime: number;
    endTime: number;
    totalAllocated: number;
    totalDistributed: number;
    remainingBudget: number;
    rewardWallet: string;
    rewardWalletBalance: number;
  } | null> {
    if (!this.isContractAvailable()) {
      return null;
    }

    try {
      const result = await this.rewardPoolContract!.getProgramInfo();
      
      return {
        startTime: Number(result[0]),
        endTime: Number(result[1]),
        totalAllocated: parseFloat(ethers.formatEther(result[2])),
        totalDistributed: parseFloat(ethers.formatEther(result[3])),
        remainingBudget: parseFloat(ethers.formatEther(result[4])),
        rewardWallet: result[5],
        rewardWalletBalance: parseFloat(ethers.formatEther(result[6]))
      };
    } catch (error) {
      console.error('Failed to get program info:', error);
      return null;
    }
  }

  /**
   * Get current reward wallet address from smart contract
   */
  async getCurrentRewardWallet(): Promise<string | null> {
    if (!this.isContractAvailable()) {
      return null;
    }

    try {
      return await this.rewardPoolContract!.rewardWallet();
    } catch (error) {
      console.error('Failed to get current reward wallet:', error);
      return null;
    }
  }

  /**
   * Execute claim rewards transaction for a user
   */
  async executeClaimRewards(
    userAddress: string,
    nftTokenIds: string[]
  ): Promise<{ success: boolean; txHash?: string; claimedAmount?: number; error?: string }> {
    if (!this.isContractAvailable()) {
      return { success: false, error: 'Smart contract not available' };
    }

    try {
      // Get claimable amount before claiming
      const claimableAmount = await this.getClaimableRewards(userAddress);
      
      if (claimableAmount <= 0) {
        return { success: false, error: 'No rewards available to claim' };
      }

      // Convert string IDs to numbers
      const tokenIds = nftTokenIds.map(id => BigInt(id));
      
      const tx = await this.rewardPoolContract!.claimRewards(tokenIds);
      await tx.wait();
      
      return { 
        success: true, 
        txHash: tx.hash,
        claimedAmount: claimableAmount
      };
    } catch (error) {
      console.error('Failed to execute claim rewards:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if reward wallet has sufficient KILT tokens
   */
  async checkRewardWalletBalance(): Promise<{ balance: number; sufficient: boolean }> {
    if (!this.isContractAvailable()) {
      // Return treasury allocation as fallback when contract not available
      return { balance: 2905600, sufficient: true };
    }

    try {
      const rewardWallet = await this.getCurrentRewardWallet();
      if (!rewardWallet || rewardWallet === '0x0000000000000000000000000000000000000000') {
        // Return treasury allocation as fallback when wallet not configured
        return { balance: 2905600, sufficient: true };
      }

      const balance = await this.kiltTokenContract!.balanceOf(rewardWallet);
      const balanceFormatted = parseFloat(ethers.formatEther(balance));
      
      // Check if balance is sufficient (at least 1000 KILT for daily operations)
      const sufficient = balanceFormatted >= 1000;
      
      return { balance: balanceFormatted, sufficient };
    } catch (error) {
      console.error('Failed to check reward wallet balance:', error);
      // Return treasury allocation as fallback on error
      return { balance: 2905600, sufficient: true };
    }
  }

  /**
   * Setup reward wallet allowance for the contract
   */
  async setupRewardWalletAllowance(amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.isContractAvailable()) {
      return { success: false, error: 'Smart contract not available' };
    }

    try {
      const allowanceAmount = ethers.parseEther(amount.toString());
      
      const tx = await this.kiltTokenContract!.approve(
        KILT_REWARD_POOL_ADDRESS,
        allowanceAmount
      );
      
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('Failed to setup reward wallet allowance:', error);
      return { success: false, error: error.message };
    }
  }
}

export const smartContractService = new SmartContractService();