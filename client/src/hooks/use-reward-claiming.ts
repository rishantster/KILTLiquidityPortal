import { useState } from 'react';
import { createWalletClient, custom, createPublicClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { useWagmiWallet } from './use-wagmi-wallet';
import { useToast } from './use-toast';

// Treasury contract address on Base network - DEPLOYED!
const BASIC_TREASURY_POOL_ADDRESS = '0x3ee2361272EaDc5ADc91418530722728E7DCe526' as const;

// KILT token address on Base network
const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8' as const;

// BasicTreasuryPool contract ABI - Core functions for reward claiming
const BASIC_TREASURY_POOL_ABI = [
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
    name: 'getContractBalance',
    outputs: [{ name: '', type: 'uint256' }],
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

  // Execute reward claim transaction  
  const claimRewards = async (): Promise<RewardClaimResult> => {
    setIsClaiming(true);
    
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Wallet not connected');
      }

      // First check if rewards are claimable
      const claimabilityCheck = await checkClaimability(address);
      
      if (!claimabilityCheck.isClaimable) {
        return {
          success: false,
          error: 'No claimable rewards available'
        };
      }

      // Estimate gas for the claim transaction
      const gasEstimate = await baseClient.estimateContractGas({
        address: BASIC_TREASURY_POOL_ADDRESS,
        abi: BASIC_TREASURY_POOL_ABI,
        functionName: 'claimRewards',
        args: [],
        account: address as `0x${string}`,
      });

      // Execute the claim transaction
      const txHash = await walletClient.writeContract({
        address: BASIC_TREASURY_POOL_ADDRESS,
        abi: BASIC_TREASURY_POOL_ABI,
        functionName: 'claimRewards',
        args: [],
        gas: gasEstimate,
      });

      // Wait for transaction confirmation
      const receipt = await baseClient.waitForTransactionReceipt({ 
        hash: txHash,
        timeout: 60000 // 60 second timeout
      });

      // Parse transaction logs to get claimed amount
      // In a real implementation, you'd parse the ClaimRewards event from the logs
      const claimedAmount = claimabilityCheck.claimableAmount;

      toast({
        title: "Rewards Claimed Successfully!",
        description: `Claimed ${(parseFloat(claimedAmount) / 1e18).toFixed(4)} KILT tokens`,
      });

      return {
        success: true,
        transactionHash: txHash,
        claimedAmount: (parseFloat(claimedAmount) / 1e18).toFixed(4),
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