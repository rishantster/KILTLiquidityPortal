import { createPublicClient, createWalletClient, custom, http, parseAbi, Address, formatUnits, parseUnits } from 'viem';
import { base } from 'viem/chains';

// Contract addresses
export const KILT_STAKER_ADDRESS = '0x0000000000000000000000000000000000000000'; // To be deployed
export const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';
export const UNISWAP_V3_NFT_MANAGER = '0x03a520b32C04BF3bEEf7BF5d92bf15F25de9a9E5'; // Base network

// Contract ABI
export const KILT_STAKER_ABI = parseAbi([
  // View functions
  'function programActive() view returns (bool)',
  'function stakes(uint256 tokenId) view returns (address owner, uint256 liquidity, uint256 stakedAt, uint256 lastClaimTime, bool active)',
  'function calculateRewards(uint256 tokenId) view returns (uint256)',
  'function getTotalPendingRewards(address user) view returns (uint256)',
  'function getUserStakes(address user) view returns (uint256[])',
  'function getStakeInfo(uint256 tokenId) view returns (address owner, uint256 liquidity, uint256 stakedAt, uint256 lastClaimTime, bool active)',
  'function getProgramStats() view returns (bool programActive, uint256 timeRemaining, uint256 totalStaked, uint256 totalDistributed)',
  
  // State-changing functions
  'function stakePosition(uint256 tokenId, uint256 liquidity) external',
  'function unstakePosition(uint256 tokenId) external',
  'function claimRewards() external',
  
  // Events
  'event PositionStaked(address indexed user, uint256 indexed tokenId, uint256 liquidity)',
  'event PositionUnstaked(address indexed user, uint256 indexed tokenId)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
  'event RewardsCalculated(uint256 indexed tokenId, uint256 baseAPR, uint256 timeMultiplier, uint256 sizeMultiplier, uint256 dailyRewards)'
]);

export const ERC721_ABI = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function approve(address to, uint256 tokenId) external',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved) external'
]);

export const KILT_TOKEN_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
]);

// Create clients
export const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

export const getWalletClient = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return createWalletClient({
      chain: base,
      transport: custom(window.ethereum)
    });
  }
  return null;
};

// Types
export interface StakeInfo {
  owner: Address;
  liquidity: bigint;
  stakedAt: bigint;
  lastClaimTime: bigint;
  active: boolean;
}

export interface ProgramStats {
  programActive: boolean;
  timeRemaining: bigint;
  totalStaked: bigint;
  totalDistributed: bigint;
}

export interface RewardCalculation {
  baseAPR: number;
  timeMultiplier: number;
  sizeMultiplier: number;
  effectiveAPR: number;
  dailyRewards: number;
  timeStaked: number;
}

// Smart contract service class
export class KiltStakerService {
  private publicClient = publicClient;
  private walletClient: any = null;

  constructor() {
    this.walletClient = getWalletClient();
  }

  // Read functions
  async isProgramActive(): Promise<boolean> {
    return await this.publicClient.readContract({
      address: KILT_STAKER_ADDRESS as Address,
      abi: KILT_STAKER_ABI,
      functionName: 'programActive'
    });
  }

  async getStakeInfo(tokenId: bigint): Promise<StakeInfo> {
    return await this.publicClient.readContract({
      address: KILT_STAKER_ADDRESS as Address,
      abi: KILT_STAKER_ABI,
      functionName: 'getStakeInfo',
      args: [tokenId]
    });
  }

  async calculateRewards(tokenId: bigint): Promise<bigint> {
    return await this.publicClient.readContract({
      address: KILT_STAKER_ADDRESS as Address,
      abi: KILT_STAKER_ABI,
      functionName: 'calculateRewards',
      args: [tokenId]
    });
  }

  async getTotalPendingRewards(userAddress: Address): Promise<bigint> {
    return await this.publicClient.readContract({
      address: KILT_STAKER_ADDRESS as Address,
      abi: KILT_STAKER_ABI,
      functionName: 'getTotalPendingRewards',
      args: [userAddress]
    });
  }

  async getUserStakes(userAddress: Address): Promise<bigint[]> {
    return await this.publicClient.readContract({
      address: KILT_STAKER_ADDRESS as Address,
      abi: KILT_STAKER_ABI,
      functionName: 'getUserStakes',
      args: [userAddress]
    });
  }

  async getProgramStats(): Promise<ProgramStats> {
    return await this.publicClient.readContract({
      address: KILT_STAKER_ADDRESS as Address,
      abi: KILT_STAKER_ABI,
      functionName: 'getProgramStats'
    });
  }

  // Write functions (require wallet connection)
  async stakePosition(tokenId: bigint, liquidity: bigint, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: KILT_STAKER_ADDRESS as Address,
      abi: KILT_STAKER_ABI,
      functionName: 'stakePosition',
      args: [tokenId, liquidity],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  async unstakePosition(tokenId: bigint, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: KILT_STAKER_ADDRESS as Address,
      abi: KILT_STAKER_ABI,
      functionName: 'unstakePosition',
      args: [tokenId],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  async claimRewards(account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: KILT_STAKER_ADDRESS as Address,
      abi: KILT_STAKER_ABI,
      functionName: 'claimRewards',
      account
    });

    return await this.walletClient.writeContract(request);
  }

  // NFT approval functions
  async approveNFT(tokenId: bigint, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: UNISWAP_V3_NFT_MANAGER as Address,
      abi: ERC721_ABI,
      functionName: 'approve',
      args: [KILT_STAKER_ADDRESS, tokenId],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  async isApprovedForAll(owner: Address, operator: Address): Promise<boolean> {
    return await this.publicClient.readContract({
      address: UNISWAP_V3_NFT_MANAGER as Address,
      abi: ERC721_ABI,
      functionName: 'isApprovedForAll',
      args: [owner, operator]
    });
  }

  async setApprovalForAll(account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: UNISWAP_V3_NFT_MANAGER as Address,
      abi: ERC721_ABI,
      functionName: 'setApprovalForAll',
      args: [KILT_STAKER_ADDRESS, true],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  // Utility functions
  async waitForTransaction(hash: string) {
    return await this.publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
  }

  // Helper function to calculate rewards with multipliers (for frontend display)
  calculateRewardParameters(
    liquidityAmount: number,
    daysStaked: number
  ): RewardCalculation {
    const baseAPR = 47.2;
    
    // Time multiplier: 1x to 2x over 30 days
    let timeMultiplier = 1 + Math.min(daysStaked / 30, 1);
    
    // Size multiplier: 1x to 1.5x for positions >= $100k
    let sizeMultiplier = 1;
    if (liquidityAmount >= 100000) {
      sizeMultiplier = 1.5;
    } else {
      sizeMultiplier = 1 + (liquidityAmount / 100000) * 0.5;
    }
    
    const effectiveAPR = baseAPR * timeMultiplier * sizeMultiplier;
    const dailyRewards = (liquidityAmount * effectiveAPR) / (365 * 100);
    
    return {
      baseAPR,
      timeMultiplier,
      sizeMultiplier,
      effectiveAPR,
      dailyRewards,
      timeStaked: daysStaked
    };
  }

  // Format functions for UI
  formatKiltAmount(amount: bigint): string {
    return formatUnits(amount, 18);
  }

  parseKiltAmount(amount: string): bigint {
    return parseUnits(amount, 18);
  }

  formatTimeRemaining(seconds: bigint): string {
    const totalSeconds = Number(seconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
}

// Create singleton instance
export const kiltStakerService = new KiltStakerService();