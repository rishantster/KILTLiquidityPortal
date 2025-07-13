import { ethers } from 'ethers';

export interface TreasuryInfo {
  currentTreasuryAddress: string;
  balance: number;
  allowance: number;
  isConfigured: boolean;
  canTransfer: boolean;
}

export interface TreasuryUpdateResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export class TreasuryService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract | null = null;
  private kiltContract: ethers.Contract | null = null;
  
  // Contract addresses
  private readonly KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8';
  private readonly REWARD_POOL_ADDRESS = process.env.KILT_REWARD_POOL_ADDRESS || '';
  
  // ABIs (simplified for treasury operations)
  private readonly KILT_TOKEN_ABI = [
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)'
  ];
  
  private readonly REWARD_POOL_ABI = [
    'function rewardWallet() view returns (address)',
    'function updateRewardWallet(address _newRewardWallet)',
    'function kiltToken() view returns (address)',
    'function TREASURY_ALLOCATION() view returns (uint256)',
    'function totalRewardsDistributed() view returns (uint256)',
    'function owner() view returns (address)'
  ];

  constructor() {
    this.provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    this.initializeContracts();
  }

  private initializeContracts() {
    try {
      if (this.REWARD_POOL_ADDRESS) {
        this.contract = new ethers.Contract(
          this.REWARD_POOL_ADDRESS,
          this.REWARD_POOL_ABI,
          this.provider
        );
      }
      
      this.kiltContract = new ethers.Contract(
        this.KILT_TOKEN_ADDRESS,
        this.KILT_TOKEN_ABI,
        this.provider
      );
    } catch (error) {
      console.error('Failed to initialize treasury contracts:', error);
    }
  }

  /**
   * Get current treasury information
   */
  async getTreasuryInfo(): Promise<TreasuryInfo> {
    try {
      if (!this.contract || !this.kiltContract) {
        return {
          currentTreasuryAddress: '0x0000000000000000000000000000000000000000',
          balance: 0,
          allowance: 0,
          isConfigured: false,
          canTransfer: false
        };
      }

      const treasuryAddress = await this.contract.rewardWallet();
      const isConfigured = treasuryAddress !== '0x0000000000000000000000000000000000000000';
      
      let balance = 0;
      let allowance = 0;
      
      if (isConfigured) {
        const balanceWei = await this.kiltContract.balanceOf(treasuryAddress);
        balance = parseFloat(ethers.formatEther(balanceWei));
        
        const allowanceWei = await this.kiltContract.allowance(treasuryAddress, this.REWARD_POOL_ADDRESS);
        allowance = parseFloat(ethers.formatEther(allowanceWei));
      }

      return {
        currentTreasuryAddress: treasuryAddress,
        balance,
        allowance,
        isConfigured,
        canTransfer: allowance > 0 && balance > 0
      };
    } catch (error) {
      console.error('Failed to get treasury info:', error);
      return {
        currentTreasuryAddress: '0x0000000000000000000000000000000000000000',
        balance: 0,
        allowance: 0,
        isConfigured: false,
        canTransfer: false
      };
    }
  }

  /**
   * Update treasury wallet address (requires contract owner)
   */
  async updateTreasuryAddress(
    newTreasuryAddress: string,
    ownerPrivateKey: string
  ): Promise<TreasuryUpdateResult> {
    try {
      if (!this.contract) {
        return { success: false, error: 'Contract not initialized' };
      }

      if (!ethers.isAddress(newTreasuryAddress)) {
        return { success: false, error: 'Invalid treasury address' };
      }

      const wallet = new ethers.Wallet(ownerPrivateKey, this.provider);
      const contractWithSigner = this.contract.connect(wallet);
      
      const tx = await contractWithSigner.updateRewardWallet(newTreasuryAddress);
      await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Failed to update treasury address:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Set up treasury allowance (requires treasury wallet private key)
   */
  async setupTreasuryAllowance(
    treasuryPrivateKey: string,
    allowanceAmount: number = 2905600
  ): Promise<TreasuryUpdateResult> {
    try {
      if (!this.kiltContract) {
        return { success: false, error: 'KILT contract not initialized' };
      }

      const treasuryWallet = new ethers.Wallet(treasuryPrivateKey, this.provider);
      const kiltContractWithSigner = this.kiltContract.connect(treasuryWallet);
      
      const allowanceWei = ethers.parseEther(allowanceAmount.toString());
      const tx = await kiltContractWithSigner.approve(this.REWARD_POOL_ADDRESS, allowanceWei);
      await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      console.error('Failed to setup treasury allowance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get contract owner address
   */
  async getContractOwner(): Promise<string> {
    try {
      if (!this.contract) return '0x0000000000000000000000000000000000000000';
      return await this.contract.owner();
    } catch (error) {
      console.error('Failed to get contract owner:', error);
      return '0x0000000000000000000000000000000000000000';
    }
  }

  /**
   * Get treasury allocation and distribution stats
   */
  async getTreasuryStats(): Promise<{
    totalAllocation: number;
    totalDistributed: number;
    remainingBudget: number;
    dailyBudget: number;
  }> {
    try {
      if (!this.contract) {
        return {
          totalAllocation: 2905600,
          totalDistributed: 0,
          remainingBudget: 2905600,
          dailyBudget: 7960.55
        };
      }

      const allocationWei = await this.contract.TREASURY_ALLOCATION();
      const distributedWei = await this.contract.totalRewardsDistributed();
      
      const totalAllocation = parseFloat(ethers.formatEther(allocationWei));
      const totalDistributed = parseFloat(ethers.formatEther(distributedWei));
      
      return {
        totalAllocation,
        totalDistributed,
        remainingBudget: totalAllocation - totalDistributed,
        dailyBudget: totalAllocation / 365
      };
    } catch (error) {
      console.error('Failed to get treasury stats:', error);
      return {
        totalAllocation: 2905600,
        totalDistributed: 0,
        remainingBudget: 2905600,
        dailyBudget: 7960.55
      };
    }
  }

  /**
   * Validate treasury setup
   */
  async validateTreasurySetup(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      const treasuryInfo = await this.getTreasuryInfo();
      
      if (!treasuryInfo.isConfigured) {
        issues.push('Treasury address not configured');
        recommendations.push('Set treasury address using updateTreasuryAddress()');
      }
      
      if (treasuryInfo.balance < 1000) {
        issues.push('Treasury balance too low');
        recommendations.push('Fund treasury with at least 1000 KILT tokens');
      }
      
      if (treasuryInfo.allowance < 2905600) {
        issues.push('Insufficient allowance for reward pool');
        recommendations.push('Approve reward pool to spend 2.9M KILT tokens');
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        recommendations
      };
    } catch (error) {
      return {
        isValid: false,
        issues: ['Failed to validate treasury setup'],
        recommendations: ['Check network connection and contract addresses']
      };
    }
  }
}

export const treasuryService = new TreasuryService();