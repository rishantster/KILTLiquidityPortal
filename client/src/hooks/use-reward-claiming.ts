import { useState } from 'react';
import { createWalletClient, custom, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { useWagmiWallet } from './use-wagmi-wallet';
import { useToast } from './use-toast';

// Enhanced DynamicTreasuryPool contract address on Base network - DEPLOYED!
const DYNAMIC_TREASURY_POOL_ADDRESS = '0x09bcB93e7E2FF067232d83f5e7a7E8360A458175' as const;

// KILT token address on Base network
const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8' as const;

// Enhanced DynamicTreasuryPool contract ABI with security features for reward claiming
const DYNAMIC_TREASURY_POOL_ABI = [
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'distributeReward',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'signature', type: 'bytes' }
    ],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserStats',
    outputs: [
      { name: 'totalClaimedAmount', type: 'uint256' },
      { name: 'lastClaimTime', type: 'uint256' },
      { name: 'canClaimAt', type: 'uint256' },
      { name: 'currentNonce', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getClaimedAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getClaimableAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'nonces',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalTreasuryBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getContractBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

// Base network public client for reading blockchain data
const baseClient = createPublicClient({
  chain: base,
  transport: http('https://base-rpc.publicnode.com'),
});

// Simplified interface for BasicTreasuryPool
export interface ClaimRewardsParams {
  // No parameters needed for BasicTreasuryPool.claimRewards()
}

export interface RewardClaimResult {
  success: boolean;
  transactionHash?: string;
  claimedAmount?: string;
  error?: string;
}

export function useRewardClaiming() {
  const { address, isConnected } = useWagmiWallet();
  const { toast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCheckingClaimability, setIsCheckingClaimability] = useState(false);

  // Create wallet client for transactions
  const walletClient = address ? createWalletClient({
    chain: base,
    transport: custom((window as any).ethereum),
    account: address
  }) : null;

  // Check if rewards are claimable on-chain
  const checkClaimability = async (userAddress: string): Promise<{
    isClaimable: boolean;
    claimableAmount: string;
    lockExpiryDate: Date | null;
  }> => {
    setIsCheckingClaimability(true);
    try {
      // Read claimable amount from BasicTreasuryPool contract
      const claimableAmountResult = await baseClient.readContract({
        address: DYNAMIC_TREASURY_POOL_ADDRESS,
        abi: DYNAMIC_TREASURY_POOL_ABI,
        functionName: 'getUserStats',
        args: [userAddress as `0x${string}`],
      });

      const claimableAmount = (claimableAmountResult as any)?.[0]?.toString() || '0';
      const isClaimable = BigInt(claimableAmount) > 0n;

      return {
        isClaimable,
        claimableAmount,
        lockExpiryDate: null // No lock period in BasicTreasuryPool
      };
    } catch (error) {
      console.error('Failed to check claimability:', error);
      throw error;
    } finally {
      setIsCheckingClaimability(false);
    }
  };

  // Execute direct reward claiming from smart contract  
  const claimRewards = async (): Promise<RewardClaimResult> => {
    setIsClaiming(true);
    
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Wallet not connected');
      }

      // Step 1: Get user's calculated rewards from backend
      console.log(`Getting calculated rewards for ${address}...`);
      const statsResponse = await fetch(`/api/rewards/stats`);
      if (!statsResponse.ok) {
        throw new Error('Failed to get reward stats from backend');
      }

      const stats = await statsResponse.json();
      const calculatedAmount = stats.totalClaimable || 0;
      
      if (calculatedAmount <= 0) {
        return {
          success: false,
          error: 'No rewards available for claiming. Start providing liquidity to earn KILT rewards.'
        };
      }

      // Step 2: Get user's current nonce and generate signature
      console.log(`Requesting signature for ${calculatedAmount} KILT claim...`);
      const signatureResponse = await fetch('/api/rewards/generate-claim-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address
        })
      });

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json();
        throw new Error(errorData.error || 'Failed to get claim signature from backend');
      }

      const { signature, nonce } = await signatureResponse.json();
      
      // Step 3: User claims rewards directly from treasury contract
      console.log(`Claiming ${calculatedAmount} KILT for ${address} with nonce ${nonce}...`);
      const totalRewardBalanceWei = parseUnits(calculatedAmount.toString(), 18);
      
      const claimHash = await walletClient.writeContract({
        address: DYNAMIC_TREASURY_POOL_ADDRESS,
        abi: DYNAMIC_TREASURY_POOL_ABI,
        functionName: 'claimRewards',
        args: [address as `0x${string}`, totalRewardBalanceWei, BigInt(nonce), signature],
      });

      // Wait for claim transaction to be mined
      const claimReceipt = await baseClient.waitForTransactionReceipt({ 
        hash: claimHash 
      });
      
      if (claimReceipt.status !== 'success') {
        throw new Error('Reward claim transaction failed');
      }

      console.log(`✅ Rewards claimed successfully. Transaction: ${claimHash}`);

      // Return success result
      return {
        success: true,
        transactionHash: claimHash,
        claimedAmount: calculatedAmount.toFixed(4),
      };

    } catch (error) {
      console.error('Reward claim failed:', error);
      
      let errorMessage = 'Failed to claim rewards';
      if (error instanceof Error) {
        if (error.message.includes('User denied')) {
          errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient ETH for gas fees';
        } else if (error.message.includes('Treasury contract not yet deployed')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Claim Failed",
        description: errorMessage,
        variant: "destructive",
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsClaiming(false);
    }
  };

  return {
    claimRewards,
    checkClaimability,
    isClaiming,
    isCheckingClaimability,
    isConnected,
    address,
    // Helper function to get user's NFT token IDs from positions
    getUserTokenIds: async (): Promise<string[]> => {
      if (!address) return [];
      
      try {
        // Fetch user positions to get token IDs
        const response = await fetch(`/api/positions/wallet/${address}`);
        const positions = await response.json();
        
        return positions
          .filter((pos: any) => pos.status === 'ACTIVE' && pos.nftTokenId)
          .map((pos: any) => pos.nftTokenId.toString());
      } catch (error) {
        console.error('Failed to fetch user token IDs:', error);
        return [];
      }
    }
  };
}