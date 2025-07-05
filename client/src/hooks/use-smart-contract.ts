import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './use-wallet';
import { kiltStakerService, type StakeInfo, type ProgramStats, type RewardCalculation } from '@/lib/smart-contracts';
import { useToast } from './use-toast';

export function useKiltStaker() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query program status
  const { data: programStats, isLoading: programLoading } = useQuery<ProgramStats>({
    queryKey: ['program-stats'],
    queryFn: () => kiltStakerService.getProgramStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: true
  });

  // Query user's staked positions
  const { data: userStakes, isLoading: stakesLoading } = useQuery<bigint[]>({
    queryKey: ['user-stakes', address],
    queryFn: () => kiltStakerService.getUserStakes(address!),
    enabled: !!address && isConnected,
    refetchInterval: 15000
  });

  // Query user's pending rewards
  const { data: pendingRewards, isLoading: rewardsLoading } = useQuery<bigint>({
    queryKey: ['pending-rewards', address],
    queryFn: () => kiltStakerService.getTotalPendingRewards(address!),
    enabled: !!address && isConnected,
    refetchInterval: 10000 // More frequent for live reward updates
  });

  // Stake position mutation
  const stakePositionMutation = useMutation({
    mutationFn: async ({ tokenId, liquidity }: { tokenId: bigint; liquidity: bigint }) => {
      if (!address) throw new Error('Wallet not connected');
      return await kiltStakerService.stakePosition(tokenId, liquidity, address);
    },
    onSuccess: (hash) => {
      toast({
        title: "Position Staked",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['user-stakes'] });
      queryClient.invalidateQueries({ queryKey: ['program-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Staking Failed",
        description: error.message || "Failed to stake position",
        variant: "destructive",
      });
    }
  });

  // Unstake position mutation
  const unstakePositionMutation = useMutation({
    mutationFn: async (tokenId: bigint) => {
      if (!address) throw new Error('Wallet not connected');
      return await kiltStakerService.unstakePosition(tokenId, address);
    },
    onSuccess: (hash) => {
      toast({
        title: "Position Unstaked",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['user-stakes'] });
      queryClient.invalidateQueries({ queryKey: ['pending-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['program-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Unstaking Failed",
        description: error.message || "Failed to unstake position",
        variant: "destructive",
      });
    }
  });

  // Claim rewards mutation
  const claimRewardsMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Wallet not connected');
      return await kiltStakerService.claimRewards(address);
    },
    onSuccess: (hash) => {
      toast({
        title: "Rewards Claimed",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['pending-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['program-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim rewards",
        variant: "destructive",
      });
    }
  });

  // Approve NFT for staking
  const approveNFTMutation = useMutation({
    mutationFn: async (tokenId: bigint) => {
      if (!address) throw new Error('Wallet not connected');
      return await kiltStakerService.approveNFT(tokenId, address);
    },
    onSuccess: (hash) => {
      toast({
        title: "NFT Approved",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve NFT",
        variant: "destructive",
      });
    }
  });

  // Helper functions for UI
  const formatKiltAmount = (amount: bigint | undefined) => {
    if (!amount) return '0';
    return parseFloat(kiltStakerService.formatKiltAmount(amount)).toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  };

  const formatTimeRemaining = (seconds: bigint | undefined) => {
    if (!seconds) return '0m';
    return kiltStakerService.formatTimeRemaining(seconds);
  };

  const calculateRewardParameters = (liquidityAmount: number, daysStaked: number): RewardCalculation => {
    return kiltStakerService.calculateRewardParameters(liquidityAmount, daysStaked);
  };

  const isProgramActive = programStats?.programActive ?? false;
  const timeRemaining = programStats?.timeRemaining ?? BigInt(0);
  const totalStaked = programStats?.totalStaked ?? BigInt(0);
  const totalDistributed = programStats?.totalDistributed ?? BigInt(0);

  return {
    // Data
    programStats,
    userStakes: userStakes || [],
    pendingRewards: pendingRewards || BigInt(0),
    
    // Loading states
    isLoading: programLoading || stakesLoading || rewardsLoading,
    
    // Computed values
    isProgramActive,
    timeRemaining,
    totalStaked,
    totalDistributed,
    
    // Actions
    stakePosition: stakePositionMutation.mutate,
    unstakePosition: unstakePositionMutation.mutate,
    claimRewards: claimRewardsMutation.mutate,
    approveNFT: approveNFTMutation.mutate,
    
    // Action states
    isStaking: stakePositionMutation.isPending,
    isUnstaking: unstakePositionMutation.isPending,
    isClaiming: claimRewardsMutation.isPending,
    isApproving: approveNFTMutation.isPending,
    
    // Helper functions
    formatKiltAmount,
    formatTimeRemaining,
    calculateRewardParameters,
    
    // Service instance for advanced operations
    service: kiltStakerService
  };
}

// Hook for individual stake information
export function useStakeInfo(tokenId: bigint | null) {
  return useQuery<StakeInfo | null>({
    queryKey: ['stake-info', tokenId?.toString()],
    queryFn: () => tokenId ? kiltStakerService.getStakeInfo(tokenId) : null,
    enabled: !!tokenId,
    refetchInterval: 15000
  });
}

// Hook for calculating rewards for a specific position
export function usePositionRewards(tokenId: bigint | null) {
  return useQuery<bigint>({
    queryKey: ['position-rewards', tokenId?.toString()],
    queryFn: () => tokenId ? kiltStakerService.calculateRewards(tokenId) : BigInt(0),
    enabled: !!tokenId,
    refetchInterval: 10000
  });
}

// Hook for checking NFT approval status
export function useNFTApproval(userAddress: string | null) {
  return useQuery<boolean>({
    queryKey: ['nft-approval', userAddress],
    queryFn: () => userAddress ? 
      kiltStakerService.isApprovedForAll(
        userAddress as `0x${string}`, 
        kiltStakerService.service.constructor.name // This would be the contract address
      ) : false,
    enabled: !!userAddress,
    refetchInterval: 30000
  });
}