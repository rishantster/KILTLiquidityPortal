import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from './use-wallet';
import { useKiltTokenData } from './use-kilt-data';
import { 
  uniswapV3Service, 
  type UniswapV3Position, 
  type PoolData, 
  type MintParams,
  type IncreaseLiquidityParams,
  type DecreaseLiquidityParams,
  type CollectParams,
  TOKENS,
  UNISWAP_V3_CONTRACTS
} from '@/lib/uniswap-v3';
import { useToast } from './use-toast';

export function useUniswapV3() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: kiltData } = useKiltTokenData();

  // Query user's NFT positions
  const { data: userPositions, isLoading: positionsLoading } = useQuery<bigint[]>({
    queryKey: ['uniswap-positions', address],
    queryFn: () => uniswapV3Service.getUserPositions(address!),
    enabled: !!address && isConnected,
    refetchInterval: 30000
  });

  // Query KILT/ETH positions specifically
  const { data: kiltEthPositions, isLoading: kiltEthLoading } = useQuery<UniswapV3Position[]>({
    queryKey: ['kilt-eth-positions', address],
    queryFn: () => uniswapV3Service.getKiltEthPositions(address!),
    enabled: !!address && isConnected,
    refetchInterval: 30000
  });

  // Query KILT/ETH pool address
  const { data: kiltEthPoolAddress, isLoading: poolAddressLoading } = useQuery<string>({
    queryKey: ['kilt-eth-pool-address'],
    queryFn: () => uniswapV3Service.getKiltEthPool(),
    staleTime: 300000, // 5 minutes
    refetchInterval: false
  });

  // Query pool data
  const { data: poolData, isLoading: poolDataLoading } = useQuery<PoolData | null>({
    queryKey: ['pool-data', kiltEthPoolAddress],
    queryFn: () => kiltEthPoolAddress && kiltEthPoolAddress !== '0x0000000000000000000000000000000000000000' 
      ? uniswapV3Service.getPoolData(kiltEthPoolAddress as `0x${string}`)
      : null,
    enabled: !!kiltEthPoolAddress && kiltEthPoolAddress !== '0x0000000000000000000000000000000000000000',
    refetchInterval: 30000
  });

  // Query user token balances
  const { data: kiltBalance } = useQuery<bigint>({
    queryKey: ['kilt-balance', address],
    queryFn: () => uniswapV3Service.getTokenBalance(TOKENS.KILT, address!),
    enabled: !!address && isConnected,
    refetchInterval: 15000
  });

  const { data: wethBalance } = useQuery<bigint>({
    queryKey: ['weth-balance', address],
    queryFn: () => uniswapV3Service.getTokenBalance(TOKENS.WETH, address!),
    enabled: !!address && isConnected,
    refetchInterval: 15000
  });

  // Mutations for contract interactions

  // Approve tokens
  const approveTokenMutation = useMutation({
    mutationFn: async ({ tokenAddress, amount }: { tokenAddress: string; amount: bigint }) => {
      if (!address) throw new Error('Wallet not connected');
      return await uniswapV3Service.approveToken(
        tokenAddress as `0x${string}`, 
        UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER, 
        amount, 
        address
      );
    },
    onSuccess: (hash) => {
      toast({
        title: "Token Approved",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
      // Invalidate balance queries
      queryClient.invalidateQueries({ queryKey: ['kilt-balance'] });
      queryClient.invalidateQueries({ queryKey: ['weth-balance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve token",
        variant: "destructive",
      });
    }
  });

  // Approve NFT
  const approveNFTMutation = useMutation({
    mutationFn: async ({ tokenId, spender }: { tokenId: bigint; spender: string }) => {
      if (!address) throw new Error('Wallet not connected');
      return await uniswapV3Service.approveNFT(tokenId, spender as `0x${string}`, address);
    },
    onSuccess: (hash) => {
      toast({
        title: "NFT Approved",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "NFT Approval Failed",
        description: error.message || "Failed to approve NFT",
        variant: "destructive",
      });
    }
  });

  // Set approval for all NFTs
  const setApprovalForAllMutation = useMutation({
    mutationFn: async ({ operator, approved }: { operator: string; approved: boolean }) => {
      if (!address) throw new Error('Wallet not connected');
      return await uniswapV3Service.setApprovalForAll(operator as `0x${string}`, approved, address);
    },
    onSuccess: (hash) => {
      toast({
        title: "Approval Updated",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to update approval",
        variant: "destructive",
      });
    }
  });

  // Mint new position
  const mintPositionMutation = useMutation({
    mutationFn: async (params: MintParams) => {
      if (!address) throw new Error('Wallet not connected');
      return await uniswapV3Service.mintPosition(params, address);
    },
    onSuccess: (hash) => {
      toast({
        title: "Position Minted",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
      // Invalidate position queries
      queryClient.invalidateQueries({ queryKey: ['uniswap-positions'] });
      queryClient.invalidateQueries({ queryKey: ['kilt-eth-positions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Mint Failed",
        description: error.message || "Failed to mint position",
        variant: "destructive",
      });
    }
  });

  // Increase liquidity
  const increaseLiquidityMutation = useMutation({
    mutationFn: async (params: IncreaseLiquidityParams) => {
      if (!address) throw new Error('Wallet not connected');
      return await uniswapV3Service.increaseLiquidity(params, address);
    },
    onSuccess: (hash) => {
      toast({
        title: "Liquidity Increased",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['kilt-eth-positions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Increase Failed",
        description: error.message || "Failed to increase liquidity",
        variant: "destructive",
      });
    }
  });

  // Decrease liquidity
  const decreaseLiquidityMutation = useMutation({
    mutationFn: async (params: DecreaseLiquidityParams) => {
      if (!address) throw new Error('Wallet not connected');
      return await uniswapV3Service.decreaseLiquidity(params, address);
    },
    onSuccess: (hash) => {
      toast({
        title: "Liquidity Decreased",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['kilt-eth-positions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Decrease Failed",
        description: error.message || "Failed to decrease liquidity",
        variant: "destructive",
      });
    }
  });

  // Collect fees
  const collectFeesMutation = useMutation({
    mutationFn: async (params: CollectParams) => {
      if (!address) throw new Error('Wallet not connected');
      return await uniswapV3Service.collectFees(params, address);
    },
    onSuccess: (hash) => {
      toast({
        title: "Fees Collected",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['kilt-eth-positions'] });
      queryClient.invalidateQueries({ queryKey: ['kilt-balance'] });
      queryClient.invalidateQueries({ queryKey: ['weth-balance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Collection Failed",
        description: error.message || "Failed to collect fees",
        variant: "destructive",
      });
    }
  });

  // Burn position
  const burnPositionMutation = useMutation({
    mutationFn: async (tokenId: bigint) => {
      if (!address) throw new Error('Wallet not connected');
      return await uniswapV3Service.burnPosition(tokenId, address);
    },
    onSuccess: (hash) => {
      toast({
        title: "Position Burned",
        description: `Transaction submitted: ${hash.slice(0, 8)}...${hash.slice(-6)}`,
      });
      queryClient.invalidateQueries({ queryKey: ['uniswap-positions'] });
      queryClient.invalidateQueries({ queryKey: ['kilt-eth-positions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Burn Failed",
        description: error.message || "Failed to burn position",
        variant: "destructive",
      });
    }
  });

  // Helper functions
  const formatTokenAmount = (amount: bigint | undefined, decimals: number = 18) => {
    if (!amount) return '0';
    return parseFloat(uniswapV3Service.formatTokenAmount(amount, decimals)).toLocaleString(undefined, {
      maximumFractionDigits: 4
    });
  };

  const parseTokenAmount = (amount: string, decimals: number = 18) => {
    return uniswapV3Service.parseTokenAmount(amount, decimals);
  };

  const calculatePositionValue = (position: UniswapV3Position) => {
    const kiltPrice = kiltData?.price || 0.0289;
    const ethPrice = 3000; // Approximate ETH price
    return uniswapV3Service.calculatePositionValue(position, kiltPrice, ethPrice);
  };

  const isPositionInRange = (position: UniswapV3Position) => {
    if (!poolData) return false;
    return uniswapV3Service.isPositionInRange(position, poolData.tick);
  };

  // Check if pool exists
  const poolExists = kiltEthPoolAddress && kiltEthPoolAddress !== '0x0000000000000000000000000000000000000000';

  return {
    // Data
    userPositions: userPositions || [],
    kiltEthPositions: kiltEthPositions || [],
    poolData,
    kiltEthPoolAddress,
    kiltBalance: kiltBalance || BigInt(0),
    wethBalance: wethBalance || BigInt(0),
    poolExists,

    // Loading states
    isLoading: positionsLoading || kiltEthLoading || poolAddressLoading || poolDataLoading,

    // Actions
    approveToken: approveTokenMutation.mutate,
    approveNFT: approveNFTMutation.mutate,
    setApprovalForAll: setApprovalForAllMutation.mutate,
    mintPosition: mintPositionMutation.mutate,
    increaseLiquidity: increaseLiquidityMutation.mutate,
    decreaseLiquidity: decreaseLiquidityMutation.mutate,
    collectFees: collectFeesMutation.mutate,
    burnPosition: burnPositionMutation.mutate,

    // Action states
    isApproving: approveTokenMutation.isPending,
    isApprovingNFT: approveNFTMutation.isPending,
    isSettingApproval: setApprovalForAllMutation.isPending,
    isMinting: mintPositionMutation.isPending,
    isIncreasing: increaseLiquidityMutation.isPending,
    isDecreasing: decreaseLiquidityMutation.isPending,
    isCollecting: collectFeesMutation.isPending,
    isBurning: burnPositionMutation.isPending,

    // Helper functions
    formatTokenAmount,
    parseTokenAmount,
    calculatePositionValue,
    isPositionInRange,

    // Service instance for advanced operations
    service: uniswapV3Service
  };
}

// Hook for individual position data
export function useUniswapPosition(tokenId: bigint | null) {
  return useQuery<UniswapV3Position | null>({
    queryKey: ['uniswap-position', tokenId?.toString()],
    queryFn: () => tokenId ? uniswapV3Service.getPosition(tokenId) : null,
    enabled: !!tokenId,
    refetchInterval: 30000
  });
}

// Hook for token allowances
export function useTokenAllowance(tokenAddress: string | null, owner: string | null, spender: string) {
  return useQuery<bigint>({
    queryKey: ['token-allowance', tokenAddress, owner, spender],
    queryFn: () => 
      tokenAddress && owner 
        ? uniswapV3Service.getTokenAllowance(
            tokenAddress as `0x${string}`, 
            owner as `0x${string}`, 
            spender as `0x${string}`
          )
        : BigInt(0),
    enabled: !!tokenAddress && !!owner,
    refetchInterval: 30000
  });
}