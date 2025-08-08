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

// Use calculator private key instead of owner private key for signing
const CALCULATOR_PRIVATE_KEY = process.env.CALCULATOR_PRIVATE_KEY || process.env.REWARD_WALLET_PRIVATE_KEY;

console.log('🔐 Environment check:', {
  calculatorKey: CALCULATOR_PRIVATE_KEY ? 'PROVIDED' : 'MISSING',
  rewardKey: process.env.REWARD_WALLET_PRIVATE_KEY ? 'PROVIDED' : 'MISSING'
});

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

// Enhanced DynamicTreasuryPool contract ABI with security improvements
const REWARD_POOL_ABI = [
  // Enhanced authorization management with time delays
  'function setPendingCalculatorAuthorization(address calculator) external',
  'function activatePendingCalculator(address calculator) external',
  'function setCalculatorAuthorization(address calculator, bool authorized) external',
  
  // User claiming with signature verification
  'function claimRewards(address user, uint256 amount, uint256 nonce, bytes calldata signature) external',
  'function emergencyClaim(address user, uint256 totalRewardBalance) external',
  
  // Security view functions
  'function nonces(address user) external view returns (uint256)',
  'function getAbsoluteMaxClaim() external view returns (uint256)',
  'function pendingCalculatorActivation(address) external view returns (uint256)', // timestamp when pending
  
  // Enhanced user functions
  'function getUserStats(address user) external view returns (uint256 claimed, uint256 lastClaim, uint256 canClaimAt, uint256 currentNonce)',
  'function getClaimedAmount(address user) external view returns (uint256)',
  'function canUserClaim(address user, uint256 rewardBalance) external view returns (bool)',
  'function getContractStats() external view returns (uint256 balance, uint256 totalClaims, uint256 totalAmount)',
  
  // Treasury management
  'function depositTreasury(uint256 amount) external',
  'function emergencyWithdraw(uint256 amount) external',
  'function getContractBalance() external view returns (uint256)',
  
  // Contract controls
  'function pause() external',
  'function unpause() external',
  'function owner() external view returns (address)',
  'function kiltToken() external view returns (address)',
  
  // Enhanced Security Functions
  'function getUserNonce(address) external view returns (uint256)',
  'function getAbsoluteMaxClaim() external view returns (uint256)',
  'function revokeCalculatorAuthorization(address) external',
  'function updateAbsoluteMaxClaim(uint256) external',
  'function getPendingCalculatorInfo(address) external view returns (bool isPending, uint256 activationTime, uint256 remainingDelay)',
  
  // Public variables
  'function claimedAmount(address) external view returns (uint256)',
  'function lastClaimTime(address) external view returns (uint256)',
  'function authorizedCalculators(address) external view returns (bool)',
  'function pendingCalculators(address) external view returns (uint256)',
  'function userClaimHistory(address) external view returns (uint256)',
  'function totalClaimsProcessed() external view returns (uint256)',
  'function totalAmountClaimed() external view returns (uint256)',
  
  // Enhanced events
  'event RewardClaimed(address indexed user, uint256 amount, uint256 claimedAmount, uint256 nonce, uint256 timestamp)',
  'event CalculatorAuthorized(address indexed calculator, bool authorized)',
  'event CalculatorPendingAuthorization(address indexed calculator, uint256 activationTime)',
  'event TreasuryDeposit(uint256 amount)',
  'event TreasuryWithdraw(uint256 amount)'
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
      const privateKey = CALCULATOR_PRIVATE_KEY;
      
      if (contractAddress && privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        console.log(`✅ Smart contract service initialized with calculator wallet: ${this.wallet.address}`);
        this.rewardPoolContract = new ethers.Contract(
          contractAddress,
          REWARD_POOL_ABI,
          this.wallet
        );
        await this.initializeKiltContract();
        this.isContractDeployed = true;
      } else {
        console.log(`⚠️ Contract initialization failed - Address: ${contractAddress}, Private Key: ${privateKey ? 'PROVIDED' : 'MISSING'}`);
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
   * Get calculator wallet address for authorization
   */
  public getCalculatorAddress(): string | null {
    return this.wallet?.address || null;
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
   * Get the wallet address for verification
   */
  getWalletAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Generate secure signature for reward claiming with enhanced security
   */
  async generateClaimSignature(
    userAddress: string,
    amount?: number
  ): Promise<{ success: boolean; signature?: string; nonce?: number; totalRewardBalance?: number; error?: string }> {
    console.log('🏁 ============ BACKEND SIGNATURE GENERATION DETAILED LOG ============');
    console.log('🔐 SERVER LOG 1: generateClaimSignature called');
    console.log('🔐 SERVER LOG 2: User address:', userAddress);
    console.log('🔐 SERVER LOG 3: Amount requested:', amount || 'Auto-calculated', 'KILT');
    
    // If amount not provided, calculate user's full claimable amount
    if (!amount) {
      console.log('🔐 SERVER LOG 3.1: Getting user claimable amount from API...');
      try {
        const response = await fetch(`http://localhost:5000/api/rewards/claimability/${userAddress}`);
        const claimability = await response.json();
        amount = claimability.totalClaimable || 0;
        console.log('🔐 SERVER LOG 3.2: Auto-calculated amount:', amount, 'KILT');
      } catch (error) {
        console.error('❌ SERVER LOG 3.3: Failed to get claimable amount:', error);
        return { success: false, error: 'Failed to calculate claimable amount' };
      }
    }
    console.log('🔐 SERVER LOG 4: Contract deployed:', !!this.isContractDeployed);
    console.log('🔐 SERVER LOG 5: Reward pool contract available:', !!this.rewardPoolContract);
    console.log('🔐 SERVER LOG 6: Wallet available:', !!this.wallet);
    
    try {
      if (!this.isContractDeployed || !this.rewardPoolContract || !this.wallet) {
        console.error('❌ SERVER LOG 7: Prerequisites not met');
        return { success: false, error: 'Smart contracts not deployed or wallet not initialized' };
      }

      console.log('🔐 SERVER LOG 8: Getting contract address...');
      const contractAddress = await this.rewardPoolContract.getAddress();
      console.log('🔐 SERVER LOG 9: Contract address:', contractAddress);
      
      console.log('🔐 SERVER LOG 10: Getting user nonce from contract.nonces()...');
      const userNonce = await this.rewardPoolContract.nonces(userAddress);
      console.log('🔐 SERVER LOG 11: User nonce from contract.nonces():', userNonce.toString());
      
      console.log('🔐 SERVER LOG 12: Getting absolute maximum claim limit...');
      const absoluteMaxClaim = await this.rewardPoolContract.getAbsoluteMaxClaim();
      const absoluteMaxFormatted = Number(ethers.formatUnits(absoluteMaxClaim, 18));
      console.log('🔐 SERVER LOG 13: Absolute max claim:', absoluteMaxFormatted, 'KILT');
      
      // Validate amount against absolute claim limit
      if (amount > absoluteMaxFormatted) {
        console.error('❌ SERVER LOG 14: Amount exceeds maximum limit');
        return { 
          success: false,
          error: `Amount ${amount} KILT exceeds absolute maximum of ${absoluteMaxFormatted} KILT per transaction.` 
        };
      }

      console.log('🔐 SERVER LOG 15: Converting amount to wei...');
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      console.log('🔐 SERVER LOG 16: Amount in wei:', amountWei.toString());
      
      console.log('🔐 SERVER LOG 17: Creating message hash to match contract implementation...');
      // Match the contract's _createMessageHash function exactly:
      // keccak256(abi.encodePacked(user, totalRewardBalance, nonce))
      const innerHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'uint256'],
        [userAddress, amountWei, userNonce]
      );
      console.log('🔐 SERVER LOG 18: Inner hash (contract format):', innerHash);
      
      console.log('🔐 SERVER LOG 19: Wallet address:', this.wallet.address);
      console.log('🔐 SERVER LOG 20: Signing with Ethereum signed message format (matching contract)...');
      // The contract applies the Ethereum signed message prefix automatically in _createMessageHash
      const signature = await this.wallet.signMessage(ethers.getBytes(innerHash));
      console.log('🔐 SERVER LOG 21: Generated signature:', signature);
      console.log('🔐 SERVER LOG 22: Signature length:', signature?.length);
      console.log('🔐 SERVER LOG 23: Signature starts with 0x:', signature?.startsWith('0x'));
      
      console.log('🔐 SERVER LOG 24: Checking calculator authorization...');
      const calculatorAddress = this.wallet.address;
      const isAuthorized = await this.rewardPoolContract.authorizedCalculators(calculatorAddress);
      console.log('🔐 SERVER LOG 25: Calculator authorization status:', isAuthorized);
      
      console.log('🔐 SERVER LOG 26: Checking contract balance...');
      let contractBalanceFormatted = 0;
      try {
        const contractBalance = await this.kiltTokenContract?.balanceOf(contractAddress) || 0n;
        contractBalanceFormatted = Number(ethers.formatUnits(contractBalance, 18));
        console.log('🔐 SERVER LOG 33: Contract balance:', contractBalanceFormatted, 'KILT');
      } catch (error) {
        console.error('⚠️ SERVER LOG 34: Error checking contract balance:', error);
      }
      
      console.log('🔐 SERVER LOG 35: Final verification checks...');
      console.log('🔐 SERVER LOG 36: Signature validation successful');
      console.log('🔐 SERVER LOG 37: Final signature:', signature);
      console.log('🔐 SERVER LOG 38: Final nonce:', userNonce.toString());
      console.log('✅ SERVER LOG 39: Signature generation completed successfully');
      console.log('🏁 ============ BACKEND SIGNATURE GENERATION SUCCESS ============');
      
      return {
        success: true,
        signature,
        nonce: Number(userNonce),
        totalRewardBalance: amount
      };
      
    } catch (error: unknown) {
      console.error('🏁 ============ BACKEND SIGNATURE GENERATION FAILED ============');
      console.error('❌ SERVER LOG ERROR: Complete signature generation failure');
      console.error('❌ SERVER LOG ERROR: Error type:', typeof error);
      console.error('❌ SERVER LOG ERROR: Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ SERVER LOG ERROR: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ SERVER LOG ERROR: Error details:', error);
      console.error('🏁 ============ BACKEND SIGNATURE GENERATION ERROR END ============');
      
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate claim signature' 
      };
    }
  }

  /**
   * Process reward claims through smart contract with enhanced security
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
      
      console.log(`✅ Contract verified: DynamicTreasuryPool deployed at ${contractAddress}`);

      // Create contract instance
      const contract = new ethers.Contract(contractAddress, REWARD_POOL_ABI, provider);
      
      // Check user's claim limit
      const maxClaimLimit = await contract.getMaxClaimLimit(userAddress);
      const maxClaimLimitFormatted = Number(ethers.formatUnits(maxClaimLimit, 18));
      
      if (maxClaimLimitFormatted === 0) {
        return {
          success: false,
          error: 'No claim limit allocated. Please provide liquidity to establish your reward eligibility.',
          amount: 0,
          recipient: userAddress
        };
      }

      // Smart contract is ready for claiming - return success with claim limit
      // Frontend will handle the actual wallet transaction via wagmi
      return {
        success: true,
        error: undefined,
        amount: maxClaimLimitFormatted,
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
   * Distribute specific rewards to a user's contract balance for claiming
   */
  async distributeRewardsToUser(
    userAddress: string,
    amount: number
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.isContractDeployed || !this.rewardPoolContract || !this.wallet) {
        return {
          success: false,
          error: 'Smart contracts not deployed or wallet not initialized'
        };
      }

      console.log(`💰 Distributing ${amount} KILT to user ${userAddress} for claiming...`);

      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount.toString(), 18);

      // Call distributeReward function on the DynamicTreasuryPool contract
      const tx = await this.rewardPoolContract.distributeReward(userAddress, amountWei);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      console.log(`✅ Distributed ${amount} KILT to ${userAddress}. Transaction: ${receipt.hash}`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: unknown) {
      console.error('Failed to distribute rewards to user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to distribute rewards'
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
      const claimableAmount = await contract.getClaimableAmount(userAddress);
      return Number(ethers.formatUnits(claimableAmount, 18));
    } catch (error: unknown) {
      return 0;
    }
  }

  /**
   * Get claimed rewards for a user (total amount already claimed)
   */
  async getClaimedAmount(userAddress: string): Promise<{ success: boolean; claimedAmount?: number; error?: string }> {
    try {
      const contractAddress = await getSmartContractAddress();
      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      
      console.log(`🔍 Getting claimed amount for user ${userAddress} from contract ${contractAddress}...`);
      
      // Check if contract is deployed
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        console.log('⚠️ Contract not deployed, returning 0 claimed amount');
        return { success: true, claimedAmount: 0 };
      }
      
      const contract = new ethers.Contract(contractAddress, REWARD_POOL_ABI, provider);
      const claimedAmountWei = await contract.claimedAmount(userAddress);
      const claimedAmount = Number(ethers.formatUnits(claimedAmountWei, 18));
      
      console.log(`✅ Retrieved claimed amount: ${claimedAmount} KILT for user ${userAddress}`);
      
      return { 
        success: true, 
        claimedAmount: claimedAmount 
      };
    } catch (error: unknown) {
      console.error('❌ Failed to get claimed amount:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get claimed amount' 
      };
    }
  }

  /**
   * Get user stats including 24-hour claimability from smart contract
   */
  async getUserStats(userAddress: string): Promise<{ 
    success: boolean; 
    claimed?: number; 
    lastClaim?: number; 
    canClaimAt?: number; 
    currentNonce?: number; 
    error?: string 
  }> {
    try {
      const contractAddress = await getSmartContractAddress();
      const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
      
      console.log(`📊 Getting user stats for ${userAddress} from contract ${contractAddress}...`);
      
      // Check if contract is deployed
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        console.log('⚠️ Contract not deployed, returning default user stats');
        return { success: true, claimed: 0, lastClaim: 0, canClaimAt: 0, currentNonce: 0 };
      }
      
      const contract = new ethers.Contract(contractAddress, REWARD_POOL_ABI, provider);
      const userStats = await contract.getUserStats(userAddress);
      
      // Parse returned values: (uint256 claimed, uint256 lastClaim, uint256 canClaimAt, uint256 currentNonce)
      const claimed = Number(ethers.formatUnits(userStats[0], 18));
      const lastClaim = Number(userStats[1]);
      const canClaimAt = Number(userStats[2]);
      const currentNonce = Number(userStats[3]);
      
      console.log(`✅ User stats retrieved: claimed=${claimed} KILT, lastClaim=${lastClaim}, canClaimAt=${canClaimAt}, nonce=${currentNonce}`);
      
      return { 
        success: true, 
        claimed,
        lastClaim,
        canClaimAt,
        currentNonce
      };
    } catch (error: unknown) {
      console.error('❌ Failed to get user stats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get user stats' 
      };
    }
  }

  /**
   * Set reward allowance for a user (admin operation)
   * This function sets the amount a user can claim from the contract
   */
  async setRewardAllowance(userAddress: string, amount: number): Promise<{ success: boolean; error?: string; transactionHash?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      // Convert amount to wei (KILT has 18 decimals)
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      
      console.log(`Setting reward allowance: ${amount} KILT (${amountWei.toString()} wei) for ${userAddress}...`);
      
      // Call setRewardAllowance function with admin privileges
      const tx = await this.rewardPoolContract.setRewardAllowance(userAddress, amountWei);
      const receipt = await tx.wait();
      
      console.log(`✅ Reward allowance set successfully. Transaction: ${receipt.hash}`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
      
    } catch (error: unknown) {
      console.error('Setting reward allowance failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set reward allowance'
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
      const balance = await contract.getContractBalance();
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
   * Set pending calculator authorization (Step 1 of 2 - Security Delay Process)
   */
  async setPendingCalculatorAuthorization(calculatorAddress: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      console.log(`🔐 Setting pending calculator authorization for ${calculatorAddress}...`);
      
      const tx = await this.rewardPoolContract.setPendingCalculatorAuthorization(calculatorAddress);
      const receipt = await tx.wait();
      
      console.log(`✅ Pending calculator set successfully. Activation available in 24 hours. Transaction: ${receipt.hash}`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: unknown) {
      console.error('Setting pending calculator failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set pending calculator'
      };
    }
  }

  /**
   * Activate pending calculator (Step 2 of 2 - After 24-hour delay)
   */
  async activatePendingCalculator(calculatorAddress: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      // Check if calculator is pending and delay has passed
      const pendingTimestamp = await this.rewardPoolContract.pendingCalculators(calculatorAddress);
      const currentTime = Math.floor(Date.now() / 1000);
      const DELAY_24_HOURS = 24 * 60 * 60;
      
      if (pendingTimestamp.toString() === '0') {
        return {
          success: false,
          error: 'Calculator is not pending authorization. Call setPendingCalculatorAuthorization first.'
        };
      }
      
      if (currentTime < Number(pendingTimestamp) + DELAY_24_HOURS) {
        const remainingTime = (Number(pendingTimestamp) + DELAY_24_HOURS - currentTime);
        const remainingHours = Math.ceil(remainingTime / 3600);
        return {
          success: false,
          error: `Security delay not complete. ${remainingHours} hours remaining before activation.`
        };
      }
      
      console.log(`🔐 Activating calculator authorization for ${calculatorAddress}...`);
      
      const tx = await this.rewardPoolContract.activatePendingCalculator(calculatorAddress);
      const receipt = await tx.wait();
      
      console.log(`✅ Calculator activated successfully. Transaction: ${receipt.hash}`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: unknown) {
      console.error('Activating calculator failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate calculator'
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
   * Batch set reward allowances for multiple users (admin operation)
   */
  async setRewardAllowancesBatch(users: string[], amounts: number[]): Promise<{ success: boolean; error?: string; transactionHash?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    if (users.length !== amounts.length) {
      return {
        success: false,
        error: 'Users and amounts arrays must have the same length'
      };
    }

    if (users.length > 100) {
      return {
        success: false,
        error: 'Maximum 100 users per batch operation'
      };
    }

    try {
      // Convert amounts to wei (KILT has 18 decimals)
      const amountsWei = amounts.map(amount => ethers.parseUnits(amount.toString(), 18));
      
      console.log(`Setting reward allowances for ${users.length} users...`);
      
      // Call setRewardAllowancesBatch function with admin privileges
      const tx = await this.rewardPoolContract.setRewardAllowancesBatch(users, amountsWei);
      const receipt = await tx.wait();
      
      console.log(`✅ Batch reward allowance set successfully. Transaction: ${receipt.hash}`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
      
    } catch (error: unknown) {
      console.error('Batch reward allowance setting failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch operation failed'
      };
    }
  }

  /**
   * PRODUCTION METHOD: Distribute rewards to contract for user claiming
   * This method handles direct reward distribution to the smart contract
   */
  async distributeRewardsToContract(userAddress: string, amount: number): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.isContractDeployed || !this.rewardPoolContract) {
      return {
        success: false,
        error: 'Smart contracts not deployed'
      };
    }

    try {
      console.log(`💰 Distributing ${amount} KILT to contract for user ${userAddress}...`);
      
      // Convert amount to Wei (18 decimals for KILT)
      const amountInWei = ethers.parseUnits(amount.toString(), 18);
      
      // Call the smart contract method to distribute rewards
      const tx = await this.rewardPoolContract.distributeRewards(userAddress, amountInWei);
      const receipt = await tx.wait();
      
      console.log(`✅ Rewards distributed successfully. Transaction: ${receipt.hash}`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: unknown) {
      console.error('Reward distribution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to distribute rewards'
      };
    }
  }

  /**
   * Distribute rewards directly using owner function (bypasses signature verification)
   */
  async distributeRewardDirectly(userAddress: string, amount: number): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.rewardPoolContract || !this.wallet) {
        return { success: false, error: 'Smart contracts not deployed or wallet not initialized' };
      }

      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      
      console.log(`💰 Direct distribution: ${amount} KILT to ${userAddress}`);
      console.log(`💰 Amount in wei: ${amountWei.toString()}`);

      // Check contract balance first
      const contractBalance = await this.kiltTokenContract?.balanceOf(await this.rewardPoolContract.getAddress()) || 0n;
      const contractBalanceFormatted = Number(ethers.formatUnits(contractBalance, 18));
      
      if (contractBalanceFormatted < amount) {
        return { 
          success: false,
          error: `Insufficient contract balance. Available: ${contractBalanceFormatted} KILT, Requested: ${amount} KILT` 
        };
      }

      // Call distributeReward function directly as owner
      const tx = await this.rewardPoolContract.distributeReward(userAddress, amountWei);
      console.log(`💰 Distribution transaction sent: ${tx.hash}`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt?.status !== 1) {
        return { success: false, error: 'Distribution transaction failed' };
      }

      console.log(`✅ Rewards distributed successfully: ${tx.hash}`);
      return {
        success: true,
        transactionHash: tx.hash
      };

    } catch (error: unknown) {
      console.error('Direct reward distribution failed:', error);
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to distribute rewards directly' 
      };
    }
  }

  /**
   * Get the current provider instance for debugging purposes
   */
  getProvider() {
    return this.provider;
  }
}

// Export singleton instance
export const smartContractService = new SmartContractService();