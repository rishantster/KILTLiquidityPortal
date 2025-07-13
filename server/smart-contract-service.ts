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

// Updated contract ABI for rolling claims system
const REWARD_POOL_ABI = [
  'function addLiquidityPosition(address user, uint256 nftTokenId, uint256 liquidityValue) external',
  'function removeLiquidityPosition(address user, uint256 nftTokenId) external',
  'function updateLiquidityValue(address user, uint256 nftTokenId, uint256 newLiquidityValue) external',
  'function distributeDailyRewards() external',
  'function calculateDailyRewards(address user, uint256 nftTokenId) external view returns (uint256)',
  'function getClaimableRewards(address user) external view returns (uint256)',
  'function getPendingRewards(address user) external view returns (uint256)',
  'function updateRewardWallet(address newRewardWallet) external',
  'function updateProgramConfig(uint256 treasuryAllocation, uint256 programDuration, uint256 programStartTime) external',
  'function getProgramInfo() external view returns (uint256, uint256, uint256, uint256, uint256, address, uint256)',
  'function getTotalActiveLiquidity() external view returns (uint256)',
  'function getParticipantCount() external view returns (uint256)',
  'function rewardWallet() external view returns (address)',
  'function claimRewards(uint256[] calldata nftTokenIds) external',
  'function pause() external',
  'function unpause() external',
  'event LiquidityAdded(address indexed user, uint256 indexed nftTokenId, uint256 liquidityValue)',
  'event LiquidityRemoved(address indexed user, uint256 indexed nftTokenId)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
  'event RewardsEarned(address indexed user, uint256 indexed nftTokenId, uint256 amount)',
  'event RewardWalletUpdated(address indexed oldWallet, address indexed newWallet)',
  'event ProgramConfigUpdated(uint256 treasuryAllocation, uint256 programDuration, uint256 dailyBudget)',
  'event ParticipantAdded(address indexed participant)'
];

const KILT_TOKEN_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)'
];

export interface ClaimResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  amount: number;
  recipient: string;
  gasUsed?: number;
}

export interface SmartContractProgramInfo {
  startTime: number;
  endTime: number;
  totalAllocated: number;
  totalDistributed: number;
  remainingBudget: number;
  currentRewardWallet: string;
  rewardWalletBalance: number;
}

export interface SmartContractStats {
  totalActiveLiquidity: number;
  totalParticipants: number;
  programInfo: SmartContractProgramInfo;
}

export class SmartContractService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  private rewardPoolContract: ethers.Contract | null = null;
  private kiltTokenContract: ethers.Contract | null = null;
  private isContractDeployed: boolean = false;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    
    // Only initialize contracts if both address and private key are available
    if (KILT_REWARD_POOL_ADDRESS && process.env.REWARD_WALLET_PRIVATE_KEY) {
      try {
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
        this.isContractDeployed = true;
        console.log('✅ Smart contracts initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize smart contracts:', error);
        this.isContractDeployed = false;
      }
    } else {
      console.warn('⚠️ Smart contracts not deployed - using simulation mode');
      this.isContractDeployed = false;
    }
  }

  /**
   * Check if smart contracts are deployed and accessible
   */
  public isDeployed(): boolean {
    return this.isContractDeployed;
  }

  /**
   * Add liquidity position to smart contract
   */
  async addLiquidityPosition(
    userAddress: string,
    nftTokenId: string,
    liquidityValue: number
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      const tx = await this.rewardPoolContract.addLiquidityPosition(
        userAddress,
        nftTokenId,
        ethers.parseEther(liquidityValue.toString())
      );
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to add liquidity position to contract:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  /**
   * Remove liquidity position from smart contract
   */
  async removeLiquidityPosition(
    userAddress: string,
    nftTokenId: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      const tx = await this.rewardPoolContract.removeLiquidityPosition(
        userAddress,
        nftTokenId
      );
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to remove liquidity position from contract:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  /**
   * Update liquidity position value in smart contract
   */
  async updateLiquidityValue(
    userAddress: string,
    nftTokenId: string,
    newLiquidityValue: number
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      const tx = await this.rewardPoolContract.updateLiquidityValue(
        userAddress,
        nftTokenId,
        ethers.parseEther(newLiquidityValue.toString())
      );
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to update liquidity value in contract:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  /**
   * Distribute daily rewards through smart contract
   */
  async distributeDailyRewards(): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      const tx = await this.rewardPoolContract.distributeDailyRewards();
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to distribute daily rewards:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  /**
   * Process reward claims through smart contract
   */
  async processRewardClaim(
    userAddress: string,
    nftTokenIds: string[]
  ): Promise<ClaimResult> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed',
        amount: 0,
        recipient: userAddress
      };
    }

    try {
      // Get claimable amount before transaction
      const claimableAmount = await this.rewardPoolContract.getClaimableRewards(userAddress);
      
      if (claimableAmount === 0n) {
        return {
          success: false,
          error: 'No rewards available to claim',
          amount: 0,
          recipient: userAddress
        };
      }

      // Execute claim transaction
      const tx = await this.rewardPoolContract.claimRewards(nftTokenIds);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash,
        amount: Number(ethers.formatEther(claimableAmount)),
        recipient: userAddress,
        gasUsed: receipt.gasUsed ? Number(receipt.gasUsed) : undefined
      };
    } catch (error: any) {
      console.error('Failed to process reward claim:', error);
      return {
        success: false,
        error: error.message || 'Claim transaction failed',
        amount: 0,
        recipient: userAddress
      };
    }
  }

  /**
   * Get claimable rewards for a user
   */
  async getClaimableRewards(userAddress: string): Promise<number> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return 0;
    }

    try {
      const claimableAmount = await this.rewardPoolContract.getClaimableRewards(userAddress);
      return Number(ethers.formatEther(claimableAmount));
    } catch (error: any) {
      console.error('Failed to get claimable rewards:', error);
      return 0;
    }
  }

  /**
   * Get pending rewards for a user (still locked)
   */
  async getPendingRewards(userAddress: string): Promise<number> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return 0;
    }

    try {
      const pendingAmount = await this.rewardPoolContract.getPendingRewards(userAddress);
      return Number(ethers.formatEther(pendingAmount));
    } catch (error: any) {
      console.error('Failed to get pending rewards:', error);
      return 0;
    }
  }

  /**
   * Get smart contract statistics
   */
  async getSmartContractStats(): Promise<SmartContractStats> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        totalActiveLiquidity: 0,
        totalParticipants: 0,
        programInfo: {
          startTime: 0,
          endTime: 0,
          totalAllocated: 0,
          totalDistributed: 0,
          remainingBudget: 0,
          currentRewardWallet: '',
          rewardWalletBalance: 0
        }
      };
    }

    try {
      const [totalLiquidity, participantCount, programInfo] = await Promise.all([
        this.rewardPoolContract.getTotalActiveLiquidity(),
        this.rewardPoolContract.getParticipantCount(),
        this.rewardPoolContract.getProgramInfo()
      ]);

      return {
        totalActiveLiquidity: Number(ethers.formatEther(totalLiquidity)),
        totalParticipants: Number(participantCount),
        programInfo: {
          startTime: Number(programInfo[0]),
          endTime: Number(programInfo[1]),
          totalAllocated: Number(ethers.formatEther(programInfo[2])),
          totalDistributed: Number(ethers.formatEther(programInfo[3])),
          remainingBudget: Number(ethers.formatEther(programInfo[4])),
          currentRewardWallet: programInfo[5],
          rewardWalletBalance: Number(ethers.formatEther(programInfo[6]))
        }
      };
    } catch (error: any) {
      console.error('Failed to get smart contract stats:', error);
      return {
        totalActiveLiquidity: 0,
        totalParticipants: 0,
        programInfo: {
          startTime: 0,
          endTime: 0,
          totalAllocated: 0,
          totalDistributed: 0,
          remainingBudget: 0,
          currentRewardWallet: '',
          rewardWalletBalance: 0
        }
      };
    }
  }

  /**
   * Update program configuration
   */
  async updateProgramConfig(
    treasuryAllocation: number,
    programDuration: number,
    programStartTime: number
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      const tx = await this.rewardPoolContract.updateProgramConfig(
        ethers.parseEther(treasuryAllocation.toString()),
        programDuration,
        programStartTime
      );
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to update program config:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  /**
   * Update reward wallet address
   */
  async updateRewardWallet(newRewardWallet: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      const tx = await this.rewardPoolContract.updateRewardWallet(newRewardWallet);
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to update reward wallet:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  /**
   * Get KILT token balance for an address
   */
  async getKiltTokenBalance(address: string): Promise<number> {
    if (!this.kiltTokenContract) {
      return 0;
    }

    try {
      const balance = await this.kiltTokenContract.balanceOf(address);
      return Number(ethers.formatEther(balance));
    } catch (error: any) {
      console.error('Failed to get KILT token balance:', error);
      return 0;
    }
  }

  /**
   * Emergency pause contract
   */
  async pauseContract(): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      const tx = await this.rewardPoolContract.pause();
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to pause contract:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }

  /**
   * Emergency unpause contract
   */
  async unpauseContract(): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      const tx = await this.rewardPoolContract.unpause();
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to unpause contract:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  }
}

// Export singleton instance
export const smartContractService = new SmartContractService();