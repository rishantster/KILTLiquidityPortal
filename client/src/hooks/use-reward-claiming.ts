import { useState } from 'react';
import { createWalletClient, custom, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { useWagmiWallet } from './use-wagmi-wallet';
import { useToast } from './use-toast';

// Treasury contract address on Base network - DEPLOYED!
const BASIC_TREASURY_POOL_ADDRESS = '0xe5771357399D58aC79A5b1161e8C363bB178B22b' as const;

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
    inputs: [
      { name: 'totalRewardBalance', type: 'uint256' },
      { name: 'signature', type: 'bytes' }
    ],
    name: 'claimRewards',
    outputs: [],
    stateMutability: 'nonpayable',
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
        const claimedAmount = await baseClient.readContract({
          address: BASIC_TREASURY_POOL_ADDRESS,
          abi: BASIC_TREASURY_POOL_ABI,
          functionName: 'getClaimedAmount',
          args: [address as `0x${string}`],
        }) as bigint;

        // For the new simplified contract, we check claimed amount instead
        // User can claim (calculated rewards - already claimed)
        console.log(`User has claimed ${formatUnits(claimedAmount, 18)} KILT so far`);
        
        // Get calculated rewards from backend stats endpoint
        const statsResponse = await fetch(`/api/rewards/stats`);
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          const calculatedAmount = stats.totalClaimable || 0;
          const alreadyClaimed = parseFloat(formatUnits(claimedAmount, 18));
          claimableKilt = Math.max(0, calculatedAmount - alreadyClaimed);
          console.log(`Calculated: ${calculatedAmount} KILT, Claimed: ${alreadyClaimed} KILT, Claimable: ${claimableKilt} KILT`);
        } else {
          console.error('Failed to get reward stats');
          claimableKilt = 0;
        }
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
   - Connect to contract: 0xe5771357399D58aC79A5b1161e8C363bB178B22b
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

      // Step 2: Get signature from backend for the total claimable amount
      console.log(`Requesting signature for ${claimableKilt} KILT claim...`);
      const signatureResponse = await fetch('/api/rewards/generate-claim-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          totalRewardBalance: claimableKilt
        })
      });

      if (!signatureResponse.ok) {
        throw new Error('Failed to get claim signature from backend');
      }

      const { signature } = await signatureResponse.json();
      
      // Step 3: User claims the rewards with signature
      console.log(`Claiming ${claimableKilt} KILT for ${address} with signature...`);
      const totalRewardBalanceWei = parseUnits(claimableKilt.toString(), 18);
      
      const claimHash = await walletClient.writeContract({
        address: BASIC_TREASURY_POOL_ADDRESS,
        abi: BASIC_TREASURY_POOL_ABI,
        functionName: 'claimRewards',
        args: [totalRewardBalanceWei, signature],
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