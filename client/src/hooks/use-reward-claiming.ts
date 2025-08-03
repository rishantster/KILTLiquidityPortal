import { useState } from 'react';
import { createWalletClient, custom, createPublicClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { useWagmiWallet } from './use-wagmi-wallet';
import { useToast } from './use-toast';

// Treasury contract address on Base network (placeholder - needs actual deployed contract)
const MULTI_TOKEN_TREASURY_POOL_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// KILT token address on Base network
const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8' as const;

// MultiTokenTreasuryPool contract ABI - Core functions for reward claiming
const TREASURY_POOL_ABI = [
  {
    inputs: [
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'rewardToken', type: 'address' }
    ],
    name: 'claimRewards',
    outputs: [{ name: 'claimedAmount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'rewardToken', type: 'address' }
    ],
    name: 'getClaimableRewards',
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'rewardToken', type: 'address' }
    ],
    name: 'isClaimable',
    outputs: [{ name: 'claimable', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'rewardToken', type: 'address' }
    ],
    name: 'getLockExpiryDate',
    outputs: [{ name: 'expiryDate', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

// Base network public client for reading blockchain data
const baseClient = createPublicClient({
  chain: base,
  transport: http('https://base-rpc.publicnode.com'),
});

export interface ClaimRewardsParams {
  tokenIds: string[];
  rewardToken?: string; // Defaults to KILT
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
  const checkClaimability = async (userAddress: string, rewardToken: string = KILT_TOKEN_ADDRESS): Promise<{
    isClaimable: boolean;
    claimableAmount: string;
    lockExpiryDate: Date | null;
  }> => {
    setIsCheckingClaimability(true);
    try {
      // Read claimability status from smart contract
      const [isClaimableResult, claimableAmountResult, lockExpiryResult] = await Promise.all([
        baseClient.readContract({
          address: MULTI_TOKEN_TREASURY_POOL_ADDRESS,
          abi: TREASURY_POOL_ABI,
          functionName: 'isClaimable',
          args: [userAddress as `0x${string}`, rewardToken as `0x${string}`],
        }),
        baseClient.readContract({
          address: MULTI_TOKEN_TREASURY_POOL_ADDRESS,
          abi: TREASURY_POOL_ABI,
          functionName: 'getClaimableRewards',
          args: [userAddress as `0x${string}`, rewardToken as `0x${string}`],
        }),
        baseClient.readContract({
          address: MULTI_TOKEN_TREASURY_POOL_ADDRESS,
          abi: TREASURY_POOL_ABI,
          functionName: 'getLockExpiryDate',
          args: [userAddress as `0x${string}`, rewardToken as `0x${string}`],
        })
      ]);

      const claimableAmount = (claimableAmountResult as bigint).toString();
      const lockExpiryTimestamp = lockExpiryResult as bigint;
      const lockExpiryDate = lockExpiryTimestamp > 0 ? new Date(Number(lockExpiryTimestamp) * 1000) : null;

      return {
        isClaimable: isClaimableResult as boolean,
        claimableAmount,
        lockExpiryDate
      };
    } catch (error) {
      console.error('Failed to check claimability:', error);
      throw error;
    } finally {
      setIsCheckingClaimability(false);
    }
  };

  // Execute reward claim transaction
  const claimRewards = async (params: ClaimRewardsParams): Promise<RewardClaimResult> => {
    setIsClaiming(true);
    
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Wallet not connected');
      }

      if (!params.tokenIds || params.tokenIds.length === 0) {
        throw new Error('No position token IDs provided');
      }

      // Check if treasury contract is deployed
      if (MULTI_TOKEN_TREASURY_POOL_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Treasury contract not yet deployed. Reward claiming will be available after smart contract deployment.');
      }

      const rewardToken = params.rewardToken || KILT_TOKEN_ADDRESS;
      const tokenIds = params.tokenIds.map(id => BigInt(id));

      // First check if rewards are claimable
      const claimabilityCheck = await checkClaimability(address, rewardToken);
      
      if (!claimabilityCheck.isClaimable) {
        const lockDate = claimabilityCheck.lockExpiryDate;
        const errorMessage = lockDate 
          ? `Rewards are still locked until ${lockDate.toLocaleDateString()}`
          : 'No claimable rewards available';
        
        return {
          success: false,
          error: errorMessage
        };
      }

      // Estimate gas for the claim transaction
      const gasEstimate = await baseClient.estimateContractGas({
        address: MULTI_TOKEN_TREASURY_POOL_ADDRESS,
        abi: TREASURY_POOL_ABI,
        functionName: 'claimRewards',
        args: [tokenIds, rewardToken as `0x${string}`],
        account: address as `0x${string}`,
      });

      // Execute the claim transaction
      const txHash = await walletClient.writeContract({
        address: MULTI_TOKEN_TREASURY_POOL_ADDRESS,
        abi: TREASURY_POOL_ABI,
        functionName: 'claimRewards',
        args: [tokenIds, rewardToken as `0x${string}`],
        account: address as `0x${string}`,
        gas: gasEstimate + BigInt(10000), // Add buffer for gas estimation
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