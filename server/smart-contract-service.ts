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

// Removed crypto-utils - using ethers validation instead

// Smart contract configuration with validation
const KILT_REWARD_POOL_ADDRESS = process.env.KILT_REWARD_POOL_ADDRESS || '';
const REWARD_WALLET_ADDRESS = process.env.REWARD_WALLET_ADDRESS || '';
import { blockchainConfigService } from './blockchain-config-service';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// Validate contract addresses at startup using ethers
if (KILT_REWARD_POOL_ADDRESS && !ethers.isAddress(KILT_REWARD_POOL_ADDRESS)) {
  throw new Error('Invalid KILT_REWARD_POOL_ADDRESS format');
}
if (REWARD_WALLET_ADDRESS && !ethers.isAddress(REWARD_WALLET_ADDRESS)) {
  throw new Error('Invalid REWARD_WALLET_ADDRESS format');
}
// Token address validation now handled by blockchain configuration service

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
  private isContractDeployed: boolean = false; // Production: Deploy contracts before enabling

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
        // Initialize KILT token contract lazily when needed
        // this.kiltTokenContract will be set in initializeKiltContract method
        this.isContractDeployed = true;
        // Smart contracts initialized successfully
      } catch (error: unknown) {
        console.error('Failed to initialize smart contracts:', error instanceof Error ? error.message : 'Unknown error');
        this.isContractDeployed = false;
      }
    } else {
      // Smart contracts not deployed - using simulation mode
      this.isContractDeployed = false;
    }
  }

  /**
   * Initialize KILT token contract
   */
  private async initializeKiltContract(): Promise<void> {
    if (!this.kiltTokenContract && this.wallet) {
      const kilt = await blockchainConfigService.getKiltTokenAddress();
      this.kiltTokenContract = new ethers.Contract(
        kilt,
        KILT_TOKEN_ABI,
        this.wallet
      );
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

    await this.initializeKiltContract();

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
    } catch (error: unknown) {
      // Failed to add liquidity position to contract
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Transaction failed'
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
    } catch (error: unknown) {
      // Failed to remove liquidity position from contract
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Transaction failed'
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
    } catch (error: unknown) {
      // Failed to update liquidity value in contract
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Transaction failed'
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
    } catch (error: unknown) {
      // Failed to distribute daily rewards
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Transaction failed'
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
    } catch (error: unknown) {
      // Failed to process reward claim
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Claim transaction failed',
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
    } catch (error: unknown) {
      // Failed to get claimable rewards
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
    } catch (error: unknown) {
      // Failed to get pending rewards
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
    } catch (error: unknown) {
      // Failed to get smart contract stats
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
    } catch (error: unknown) {
      // Failed to update program config
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Transaction failed'
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
    } catch (error: unknown) {
      // Failed to update reward wallet
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Transaction failed'
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
    } catch (error: unknown) {
      // Failed to get KILT token balance
      return 0;
    }
  }

  /**
   * Check reward wallet balance and sufficiency
   */
  async checkRewardWalletBalance(): Promise<{ balance: number; sufficient: boolean }> {
    if (!REWARD_WALLET_ADDRESS) {
      return { balance: 0, sufficient: false };
    }

    try {
      const balance = await this.getKiltTokenBalance(REWARD_WALLET_ADDRESS);
      const sufficient = balance >= 100000; // Consider sufficient if >= 100k KILT
      
      return { balance, sufficient };
    } catch (error: unknown) {
      // Failed to check reward wallet balance
      return { balance: 0, sufficient: false };
    }
  }

  /**
   * Get program info in legacy format for compatibility
   */
  async getProgramInfo(): Promise<{
    startTime: number;
    endTime: number;
    totalAllocated: number;
    totalDistributed: number;
    remainingBudget: number;
    currentRewardWallet: string;
    rewardWalletBalance: number;
    dailyRewardBudget: number;
    programDuration: number;
    lockPeriod: number;
    isActive: boolean;
  }> {
    if (!this.isContractDeployed) {
      // Return fallback data when contract not deployed
      return {
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
        totalAllocated: 2905600,
        totalDistributed: 0,
        remainingBudget: 2905600,
        currentRewardWallet: REWARD_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000',
        rewardWalletBalance: 0,
        dailyRewardBudget: 7960,
        programDuration: 365,
        lockPeriod: 7,
        isActive: true
      };
    }

    try {
      const stats = await this.getSmartContractStats();
      return {
        startTime: stats.programInfo.startTime,
        endTime: stats.programInfo.endTime,
        totalAllocated: stats.programInfo.totalAllocated,
        totalDistributed: stats.programInfo.totalDistributed,
        remainingBudget: stats.programInfo.remainingBudget,
        currentRewardWallet: stats.programInfo.currentRewardWallet,
        rewardWalletBalance: stats.programInfo.rewardWalletBalance,
        dailyRewardBudget: stats.programInfo.totalAllocated / 365,
        programDuration: 365,
        lockPeriod: 7,
        isActive: true
      };
    } catch (error: unknown) {
      // Failed to get program info
      return {
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
        totalAllocated: 2905600,
        totalDistributed: 0,
        remainingBudget: 2905600,
        currentRewardWallet: REWARD_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000',
        rewardWalletBalance: 0,
        dailyRewardBudget: 7960,
        programDuration: 365,
        lockPeriod: 7,
        isActive: true
      };
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
    } catch (error: unknown) {
      // Failed to pause contract
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Transaction failed'
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
    } catch (error: unknown) {
      // Failed to unpause contract
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Transaction failed'
      };
    }
  }
}

// Export singleton instance
export const smartContractService = new SmartContractService();