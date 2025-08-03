import { useState } from 'react';
import { createWalletClient, custom, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { useWagmiWallet } from './use-wagmi-wallet';
import { useToast } from './use-toast';

// Treasury contract address on Base network - DEPLOYED!
const BASIC_TREASURY_POOL_ADDRESS = '0x3ee2361272EaDc5ADc91418530722728E7DCe526' as const;

// KILT token address on Base network
const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8' as const;

// BasicTreasuryPool contract ABI - Core functions for reward claiming and distribution
const BASIC_TREASURY_POOL_ABI = [
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
    inputs: [],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getClaimableRewards',
    outputs: [{ name: 'claimableAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserRewards',
    outputs: [{ name: 'rewards', type: 'tuple[]', components: [
      { name: 'amount', type: 'uint256' },
      { name: 'lockTimestamp', type: 'uint256' },
      { name: 'claimed', type: 'bool' }
    ]}],
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
        address: BASIC_TREASURY_POOL_ADDRESS,
        abi: BASIC_TREASURY_POOL_ABI,
        functionName: 'getClaimableRewards',
        args: [userAddress as `0x${string}`],
      });

      const claimableAmount = (claimableAmountResult as bigint).toString();
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

      // Step 1: Check if user has claimable rewards in the smart contract
      console.log(`Checking claimable rewards for ${address}...`);
      
      let claimableKilt = 0;
      try {
        const claimableAmount = await baseClient.readContract({
          address: BASIC_TREASURY_POOL_ADDRESS,
          abi: BASIC_TREASURY_POOL_ABI,
          functionName: 'getClaimableRewards',
          args: [address as `0x${string}`],
        });

        // Convert from wei to KILT tokens (18 decimals)
        claimableKilt = parseFloat(formatUnits(claimableAmount as bigint, 18));
        console.log(`User has ${claimableKilt} KILT claimable from smart contract`);
      } catch (contractError) {
        console.error('Failed to check claimable rewards from smart contract:', contractError);
        
        // If we can't read from contract, assume no rewards are distributed yet
        const rewardStatsResponse = await fetch(`/api/rewards/stats?userAddress=${address}`);
        if (rewardStatsResponse.ok) {
          const rewardStats = await rewardStatsResponse.json();
          const calculatedAmount = rewardStats.totalClaimable || 0;
          
          return {
            success: false,
            error: `Reward claiming requires admin distribution first. You have earned ${calculatedAmount.toFixed(4)} KILT from your liquidity positions.
            
📋 MANUAL CLAIMING INSTRUCTIONS:
1. Admin must first distribute rewards using MetaMask:
   - Connect to contract: 0x3ee2361272EaDc5ADc91418530722728E7DCe526
   - Call distributeReward(${address}, ${(calculatedAmount * Math.pow(10, 18)).toExponential()})
2. Then you can claim rewards by calling claimRewards()

💡 Alternative: Request admin to set up REWARD_WALLET_PRIVATE_KEY for automatic distribution.`
          };
        }
        
        throw contractError;
      }

      if (claimableKilt <= 0) {
        // No rewards have been distributed to this user yet
        // Get calculated rewards to show what they should earn
        const rewardStatsResponse = await fetch(`/api/rewards/stats?userAddress=${address}`);
        if (rewardStatsResponse.ok) {
          const rewardStats = await rewardStatsResponse.json();
          const calculatedAmount = rewardStats.totalClaimable || 0;
          
          return {
            success: false,
            error: `No rewards available for claiming yet. You have earned ${calculatedAmount.toFixed(4)} KILT but it hasn't been distributed to the smart contract. Please contact the admin to distribute your rewards.`
          };
        }
        
        return {
          success: false,
          error: 'No rewards available for claiming from the smart contract yet.'
        };
      }

      // Step 2: User claims the available rewards directly from smart contract
      console.log(`Claiming ${claimableKilt} KILT for ${address}...`);
      const claimHash = await walletClient.writeContract({
        address: BASIC_TREASURY_POOL_ADDRESS,
        abi: BASIC_TREASURY_POOL_ABI,
        functionName: 'claimRewards',
        args: [],
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
        claimedAmount: claimableKilt.toFixed(4),
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