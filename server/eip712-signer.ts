import { ethers } from 'ethers';

// EIP-712 Domain for the AutoDistributeTreasuryPool contract
const EIP712_DOMAIN = {
  name: 'KILTTreasuryPool',
  version: '1',
  chainId: 8453, // Base network
  verifyingContract: '', // Will be set dynamically from database
};

// EIP-712 Types for reward authorization
const REWARD_TYPES = {
  RewardAuthorization: [
    { name: 'user', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

export interface RewardAuthorizationData {
  user: string;
  amount: string; // Big number as string
  nonce?: number; // Will be fetched from contract if not provided
  deadline?: number; // Will use default if not provided (1 hour from now)
}

export interface SignedRewardAuthorization {
  user: string;
  amount: string;
  nonce: number;
  deadline: number;
  signature: string;
  hash: string;
}

export class EIP712RewardSigner {
  private wallet: ethers.Wallet | null = null;
  private contractAddress: string = '';

  constructor() {
    this.initializeWallet();
  }

  private initializeWallet() {
    const privateKey = process.env.REWARD_WALLET_PRIVATE_KEY;
    
    if (!privateKey) {
      console.warn('🔐 REWARD_WALLET_PRIVATE_KEY not set - signatures will not be available');
      return;
    }

    try {
      this.wallet = new ethers.Wallet(privateKey);
      console.log('✅ EIP-712 signer initialized with wallet:', this.wallet.address);
    } catch (error) {
      console.error('❌ Failed to initialize EIP-712 signer:', error);
    }
  }

  setContractAddress(address: string) {
    this.contractAddress = address;
    console.log('📋 Contract address set for EIP-712 domain:', address);
  }

  isAvailable(): boolean {
    return this.wallet !== null && this.contractAddress !== '';
  }

  getSignerAddress(): string | null {
    return this.wallet?.address || null;
  }

  /**
   * Sign a reward authorization using EIP-712
   * @param data Reward authorization data
   * @returns Signed authorization with signature
   */
  async signRewardAuthorization(data: RewardAuthorizationData): Promise<SignedRewardAuthorization> {
    if (!this.wallet) {
      throw new Error('EIP-712 signer not available - REWARD_WALLET_PRIVATE_KEY not set');
    }

    if (!this.contractAddress) {
      throw new Error('Contract address not set - call setContractAddress first');
    }

    // Set defaults
    const nonce = data.nonce ?? 0; // Should be fetched from contract in real implementation
    const deadline = data.deadline ?? Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // Prepare the domain with contract address
    const domain = {
      ...EIP712_DOMAIN,
      verifyingContract: this.contractAddress,
    };

    // Prepare the message
    const message = {
      user: data.user,
      amount: data.amount,
      nonce,
      deadline,
    };

    try {
      // Sign using EIP-712
      const signature = await this.wallet.signTypedData(domain, REWARD_TYPES, message);
      
      // Generate the hash for verification
      const hash = ethers.TypedDataEncoder.hash(domain, REWARD_TYPES, message);

      console.log('✅ EIP-712 signature generated:', {
        user: data.user,
        amount: data.amount,
        nonce,
        deadline,
        signature: signature.slice(0, 10) + '...',
        hash: hash.slice(0, 10) + '...',
      });

      return {
        user: data.user,
        amount: data.amount,
        nonce,
        deadline,
        signature,
        hash,
      };
    } catch (error) {
      console.error('❌ Failed to sign reward authorization:', error);
      throw new Error(`Failed to sign reward authorization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify an EIP-712 signature (for testing)
   * @param signedAuth Signed authorization data
   * @returns True if signature is valid
   */
  async verifySignature(signedAuth: SignedRewardAuthorization): Promise<boolean> {
    try {
      const domain = {
        ...EIP712_DOMAIN,
        verifyingContract: this.contractAddress,
      };

      const message = {
        user: signedAuth.user,
        amount: signedAuth.amount,
        nonce: signedAuth.nonce,
        deadline: signedAuth.deadline,
      };

      const recoveredAddress = ethers.verifyTypedData(
        domain,
        REWARD_TYPES,
        message,
        signedAuth.signature
      );

      const isValid = recoveredAddress.toLowerCase() === this.wallet?.address.toLowerCase();
      
      console.log('🔍 Signature verification:', {
        expected: this.wallet?.address,
        recovered: recoveredAddress,
        isValid,
      });

      return isValid;
    } catch (error) {
      console.error('❌ Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate authorization data for bulk users (for admin interface)
   * @param userRewards Array of user addresses and their reward amounts
   * @returns Array of signed authorizations
   */
  async signBulkRewardAuthorizations(
    userRewards: Array<{ user: string; amount: string; nonce?: number }>
  ): Promise<SignedRewardAuthorization[]> {
    if (!this.isAvailable()) {
      throw new Error('EIP-712 signer not available');
    }

    const results: SignedRewardAuthorization[] = [];

    for (const userReward of userRewards) {
      try {
        const signed = await this.signRewardAuthorization(userReward);
        results.push(signed);
      } catch (error) {
        console.error(`❌ Failed to sign authorization for user ${userReward.user}:`, error);
        throw error;
      }
    }

    console.log(`✅ Bulk signed ${results.length} reward authorizations`);
    return results;
  }
}

// Export singleton instance
export const eip712Signer = new EIP712RewardSigner();