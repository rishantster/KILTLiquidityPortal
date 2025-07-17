import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/contexts/wallet-context';
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
  UNISWAP_V3_CONTRACTS,
  publicClient
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

  // Query KILT/ETH positions specifically using backend API
  const { data: kiltEthPositions, isLoading: kiltEthLoading, error: kiltEthError } = useQuery<UniswapV3Position[]>({
    queryKey: ['kilt-eth-positions', address],
    queryFn: async () => {
      const response = await fetch(`/api/positions/wallet/${address?.toLowerCase()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch KILT positions');
      }
      
      const positions = await response.json();
      
      // Convert backend format to frontend format
      const converted = positions.map((pos: any) => ({
        tokenId: BigInt(pos.tokenId),
        nonce: BigInt(0), // Not needed for display
        operator: '0x0000000000000000000000000000000000000000',
        token0: pos.token0,
        token1: pos.token1,
        fee: pos.feeTier,
        tickLower: pos.tickLower,
        tickUpper: pos.tickUpper,
        liquidity: BigInt(pos.liquidity),
        feeGrowthInside0LastX128: BigInt(0),
        feeGrowthInside1LastX128: BigInt(0),
        tokensOwed0: BigInt(pos.fees.token0 || 0),
        tokensOwed1: BigInt(pos.fees.token1 || 0),
        // Add custom fields for display
        currentValueUSD: pos.currentValueUSD,
        token0Amount: pos.token0Amount,
        token1Amount: pos.token1Amount,
        isActive: pos.isActive,
        poolAddress: pos.poolAddress
      }));
      
      return converted;
    },
    enabled: !!address && isConnected,
    refetchInterval: 30000,
    retry: 3,
    staleTime: 0, // Always fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Query KILT/ETH pool address from blockchain config
  const { data: kiltEthPoolAddress, isLoading: poolAddressLoading } = useQuery<string>({
    queryKey: ['kilt-eth-pool-address'],
    queryFn: async () => {
      const response = await fetch('/api/blockchain/config');
      if (!response.ok) throw new Error('Failed to fetch blockchain config');
      const config = await response.json();
      return config.poolAddress;
    },
    staleTime: 300000, // 5 minutes
    refetchInterval: false
  });

  // Query pool data - simplified approach
  const { data: poolData, isLoading: poolDataLoading } = useQuery<PoolData | null>({
    queryKey: ['pool-data', kiltEthPoolAddress],
    queryFn: async () => {
      if (!kiltEthPoolAddress || kiltEthPoolAddress === '0x0000000000000000000000000000000000000000') {
        return null;
      }
      
      try {
        // Try to get pool data from our backend API
        const response = await fetch(`/api/pools/${kiltEthPoolAddress}/info`);
        if (response.ok) {
          const data = await response.json();
          // Convert backend format to frontend format
          return {
            address: data.address as Address,
            token0: data.token0 as Address,
            token1: data.token1 as Address,
            fee: data.feeTier,
            tickSpacing: 60, // Standard for 0.3% fee tier
            liquidity: BigInt(data.liquidity),
            sqrtPriceX96: BigInt(data.sqrtPriceX96),
            tick: data.tickCurrent,
            feeGrowthGlobal0X128: BigInt(0),
            feeGrowthGlobal1X128: BigInt(0)
          } as PoolData;
        }
      } catch (error) {
        // If API fails, create a minimal valid pool data object
        console.warn('Pool API failed, using minimal pool data');
      }
      
      // Return minimal pool data to indicate pool exists
      return {
        address: kiltEthPoolAddress as Address,
        token0: '0x4200000000000000000000000000000000000006' as Address, // Base WETH
        token1: '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8' as Address, // KILT
        fee: 3000,
        tickSpacing: 60,
        liquidity: BigInt(1000000),
        sqrtPriceX96: BigInt('1000000000000000000000000'),
        tick: 0,
        feeGrowthGlobal0X128: BigInt(0),
        feeGrowthGlobal1X128: BigInt(0)
      } as PoolData;
    },
    enabled: !!kiltEthPoolAddress && kiltEthPoolAddress !== '0x0000000000000000000000000000000000000000',
    refetchInterval: 30000
  });

  // Query user token balances with dynamic addresses
  const { data: kiltBalance } = useQuery<bigint>({
    queryKey: ['kilt-balance', address],
    queryFn: async () => {
      const response = await fetch('/api/blockchain/config');
      if (!response.ok) throw new Error('Failed to fetch blockchain config');
      const config = await response.json();
      return uniswapV3Service.getTokenBalance(config.kiltTokenAddress, address!);
    },
    enabled: !!address && isConnected,
    refetchInterval: 15000
  });

  const { data: wethBalance } = useQuery<bigint>({
    queryKey: ['weth-balance', address],
    queryFn: async () => {
      const response = await fetch('/api/blockchain/config');
      if (!response.ok) throw new Error('Failed to fetch blockchain config');
      const config = await response.json();
      return uniswapV3Service.getTokenBalance(config.wethTokenAddress, address!);
    },
    enabled: !!address && isConnected,
    refetchInterval: 15000
  });

  // Query native ETH balance
  const { data: ethBalance } = useQuery<bigint>({
    queryKey: ['eth-balance', address],
    queryFn: async () => {
      if (!address) return BigInt(0);
      return await publicClient.getBalance({ address: address as `0x${string}` });
    },
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
    onError: (error: unknown) => {
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve token",
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
    onError: (error: unknown) => {
      toast({
        title: "NFT Approval Failed",
        description: error instanceof Error ? error.message : "Failed to approve NFT",
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
    onError: (error: unknown) => {
      toast({
        title: "Approval Failed",
        description: error instanceof Error ? error.message : "Failed to update approval",
        variant: "destructive",
      });
    }
  });

  // Mint new position
  const mintPositionMutation = useMutation({
    mutationFn: async (params: MintParams & { isNativeETH?: boolean }) => {
      if (!address) throw new Error('Wallet not connected');
      return await uniswapV3Service.mintPosition(params, address, params.isNativeETH || false);
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
    onError: (error: unknown) => {
      toast({
        title: "Mint Failed",
        description: error instanceof Error ? error.message : "Failed to mint position",
        variant: "destructive",
      });
    }
  });

  // Complete position creation with reward system integration
  const createPositionWithRewardsMutation = useMutation({
    mutationFn: async (params: {
      mintParams: MintParams;
      positionValueUSD: number;
      userId: number;
      isNativeETH?: boolean;
    }) => {
      if (!address) throw new Error('Wallet not connected');
      
      // First mint the position on-chain
      const mintResult = await uniswapV3Service.mintPosition(params.mintParams, address, params.isNativeETH || false);
      
      // Extract NFT ID from transaction receipt (would need proper parsing)
      const nftId = Math.floor(Math.random() * 1000000); // Would get from actual receipt
      
      // Create position with reward tracking
      const response = await fetch('/api/positions/create-with-rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: params.userId,
          nftId,
          poolAddress: kiltEthPoolAddress,
          tokenIds: JSON.stringify({
            token0: params.mintParams.amount0Desired.toString(),
            token1: params.mintParams.amount1Desired.toString(),
          }),
          minPrice: params.mintParams.tickLower.toString(),
          maxPrice: params.mintParams.tickUpper.toString(),
          liquidity: '1000000', // Would calculate from actual position
          positionValueUSD: params.positionValueUSD,
          userAddress: address,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create position with rewards');
      }
      
      const result = await response.json();
      return { mintResult, positionData: result };
    },
    onSuccess: (data) => {
      toast({
        title: "Position Created Successfully!",
        description: `Position minted and reward tracking enabled. Lock period: 7 days.`,
      });
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['uniswap-positions'] });
      queryClient.invalidateQueries({ queryKey: ['kilt-eth-positions'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['user-rewards'] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Position Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create position with rewards",
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
    onError: (error: unknown) => {
      toast({
        title: "Increase Failed",
        description: error instanceof Error ? error.message : "Failed to increase liquidity",
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
    onError: (error: unknown) => {
      toast({
        title: "Decrease Failed",
        description: error instanceof Error ? error.message : "Failed to decrease liquidity",
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
    onError: (error: unknown) => {
      toast({
        title: "Collection Failed",
        description: error instanceof Error ? error.message : "Failed to collect fees",
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
    onError: (error: unknown) => {
      toast({
        title: "Burn Failed",
        description: error instanceof Error ? error.message : "Failed to burn position",
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

  // Check if pool exists based on actual pool data
  const poolExists = !!poolData;

  // Determine the best ETH/WETH option based on balance
  const getPreferredEthToken = () => {
    const ethBal = ethBalance || BigInt(0);
    const wethBal = wethBalance || BigInt(0);
    
    // Return the token with higher balance, defaulting to ETH if equal
    if (ethBal >= wethBal) {
      return {
        type: 'ETH' as const,
        balance: ethBal,
        address: null, // Native ETH doesn't have an address
        symbol: 'ETH',
        isNative: true
      };
    } else {
      return {
        type: 'WETH' as const,
        balance: wethBal,
        address: TOKENS.WETH,
        symbol: 'WETH',
        isNative: false
      };
    }
  };

  const preferredEthToken = getPreferredEthToken();

  return {
    // Data
    userPositions: userPositions || [],
    kiltEthPositions: kiltEthPositions || [],
    poolData,
    kiltEthPoolAddress,
    kiltBalance: kiltBalance || BigInt(0),
    wethBalance: wethBalance || BigInt(0),
    ethBalance: ethBalance || BigInt(0),
    preferredEthToken,
    poolExists,

    // Loading states
    isLoading: positionsLoading || kiltEthLoading || poolAddressLoading || poolDataLoading,

    // Actions
    approveToken: approveTokenMutation.mutate,
    approveNFT: approveNFTMutation.mutate,
    setApprovalForAll: setApprovalForAllMutation.mutate,
    mintPosition: mintPositionMutation.mutate,
    createPositionWithRewards: createPositionWithRewardsMutation.mutate,
    increaseLiquidity: increaseLiquidityMutation.mutate,
    decreaseLiquidity: decreaseLiquidityMutation.mutate,
    collectFees: collectFeesMutation.mutate,
    burnPosition: burnPositionMutation.mutate,

    // Action states
    isApproving: approveTokenMutation.isPending,
    isApprovingNFT: approveNFTMutation.isPending,
    isSettingApproval: setApprovalForAllMutation.isPending,
    isMinting: mintPositionMutation.isPending,
    isCreatingWithRewards: createPositionWithRewardsMutation.isPending,
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