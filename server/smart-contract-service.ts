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

// Smart contract configuration from database - Single Source of Truth
import { blockchainConfigService } from './blockchain-config-service';
import { treasuryConfig } from '@shared/schema';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// Helper function to get smart contract address from database
async function getSmartContractAddress(): Promise<string> {
  try {
    const [config] = await db.select().from(treasuryConfig).limit(1);
    if (!config?.smartContractAddress) {
      throw new Error('Smart contract address not configured in database');
    }
    if (!ethers.isAddress(config.smartContractAddress)) {
      throw new Error('Invalid smart contract address format in database');
    }
    return config.smartContractAddress;
  } catch (error) {
    console.error('Failed to get smart contract address from database:', error);
    throw error;
  }
}

// BasicTreasuryPool contract ABI - matches deployed contract
const REWARD_POOL_ABI = [
  'function depositToTreasury(uint256 amount) external',
  'function distributeReward(address user, uint256 amount) external',
  'function claimRewards() external',
  'function getClaimableRewards(address user) external view returns (uint256)',
  'function getUserRewards(address user) external view returns (tuple(uint256 amount, uint256 lockTimestamp, bool claimed)[])',
  'function emergencyWithdraw(uint256 amount) external',
  'function totalTreasuryBalance() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function kiltToken() external view returns (address)',
  'event RewardDistributed(address indexed user, uint256 amount, uint256 lockTimestamp)',
  'event RewardClaimed(address indexed user, uint256 amount)',
  'event TreasuryDeposit(uint256 amount)'
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

export interface RewardDistributionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  amount: number;
  userAddress: string;
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
    
    // Initialize contracts dynamically using database configuration
    this.initializeContracts().catch(error => {
      console.error('Failed to initialize contracts:', error);
      this.isContractDeployed = false;
    });
  }

  /**
   * Initialize contracts using database configuration
   */
  private async initializeContracts(): Promise<void> {
    try {
      const contractAddress = await getSmartContractAddress();
      const privateKey = process.env.REWARD_WALLET_PRIVATE_KEY;
      
      if (contractAddress && privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.rewardPoolContract = new ethers.Contract(
          contractAddress,
          REWARD_POOL_ABI,
          this.wallet
        );
        await this.initializeKiltContract();
        this.isContractDeployed = true;
      } else {
        this.isContractDeployed = false;
      }
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
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
    try {
      // Check if contract is deployed first
      const contractAddress = await getSmartContractAddress();
      
      // Validate that contract is actually deployed on blockchain
      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      const code = await provider.getCode(contractAddress);
      
      console.log(`🔍 Contract verification for ${contractAddress}: code length = ${code.length}`);
      
      if (code === '0x' || code.length < 10) {
        return {
          success: false,
          error: 'Treasury contract not yet deployed. Smart contract deployment required to enable reward claiming.',
          amount: 0,
          recipient: userAddress
        };
      }
      
      console.log(`✅ Contract verified: BasicTreasuryPool deployed at ${contractAddress}`);

      // Create contract instance
      const contract = new ethers.Contract(contractAddress, REWARD_POOL_ABI, provider);
      
      // Get claimable amount from the smart contract
      const claimableAmount = await contract.getClaimableRewards(userAddress);
      
      if (claimableAmount === 0n) {
        return {
          success: false,
          error: 'No rewards available for claiming at this time. Continue providing liquidity to earn rewards.',
          amount: 0,
          recipient: userAddress
        };
      }

      // Smart contract is ready for claiming - return success with claim amount
      // Frontend will handle the actual wallet transaction via wagmi
      return {
        success: true,
        error: undefined,
        amount: Number(ethers.formatUnits(claimableAmount, 18)),
        recipient: userAddress
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Contract verification failed',
        amount: 0,
        recipient: userAddress
      };
    }
  }

  /**
   * Get claimable rewards for a user
   */
  async getClaimableRewards(userAddress: string): Promise<number> {
    try {
      const contractAddress = await getSmartContractAddress();
      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      
      // Check if contract is deployed
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        return 0;
      }
      
      const contract = new ethers.Contract(contractAddress, REWARD_POOL_ABI, provider);
      const claimableAmount = await contract.getClaimableRewards(userAddress);
      return Number(ethers.formatUnits(claimableAmount, 18));
    } catch (error: unknown) {
      return 0;
    }
  }

  /**
   * Distribute calculated rewards to smart contract for a user
   * This function ensures the smart contract has the rewards available for claiming
   */
  async distributeRewardsToContract(userAddress: string, amount: number): Promise<{ success: boolean; error?: string }> {
    try {
      // This would require admin wallet with proper permissions
      // For now, we'll return a helpful message
      return {
        success: false,
        error: 'Reward distribution to smart contract requires admin wallet setup. Contact system administrator.'
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to distribute rewards to contract'
      };
    }
  }

  /**
   * Get treasury balance for display
   */
  async getTreasuryBalance(): Promise<number> {
    try {
      const contractAddress = await getSmartContractAddress();  
      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      
      // Check if contract is deployed
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        return 0;
      }
      
      const contract = new ethers.Contract(contractAddress, REWARD_POOL_ABI, provider);
      const balance = await contract.totalTreasuryBalance();
      return Number(ethers.formatUnits(balance, 18));
    } catch (error: unknown) {
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
    try {
      const contractAddress = await getSmartContractAddress();
      const balance = await this.getKiltTokenBalance(contractAddress);
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
      const contractAddress = await getSmartContractAddress().catch(() => '0x0000000000000000000000000000000000000000');
      return {
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
        totalAllocated: 2905600,
        totalDistributed: 0,
        remainingBudget: 2905600,
        currentRewardWallet: contractAddress,
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
      const contractAddress = await getSmartContractAddress().catch(() => '0x0000000000000000000000000000000000000000');
      return {
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
        totalAllocated: 2905600,
        totalDistributed: 0,
        remainingBudget: 2905600,
        currentRewardWallet: contractAddress,
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

  /**
   * Distribute rewards to smart contract (admin operation for user claiming)
   */
  async distributeRewardsToContract(userAddress: string, amount: number): Promise<RewardDistributionResult> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed',
        amount,
        userAddress
      };
    }

    try {
      // Convert amount to wei (KILT has 18 decimals)
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      
      console.log(`Distributing ${amount} KILT (${amountWei.toString()} wei) to ${userAddress}...`);
      
      // Call distributeReward function with admin privileges
      const tx = await this.rewardPoolContract.distributeReward(userAddress, amountWei);
      const receipt = await tx.wait();
      
      console.log(`✅ Reward distribution successful. Transaction: ${receipt.hash}`);
      
      return {
        success: true,
        transactionHash: receipt.hash,
        amount,
        userAddress
      };
      
    } catch (error: unknown) {
      console.error('Reward distribution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error) || 'Reward distribution failed',
        amount,
        userAddress
      };
    }
  }
}

// Export singleton instance
export const smartContractService = new SmartContractService();