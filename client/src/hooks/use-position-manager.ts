import { useState } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useToast } from './use-toast';
import { createWalletClient, createPublicClient, custom, http, parseUnits, formatUnits, maxUint256 } from 'viem';
import { base } from 'viem/chains';

// Uniswap V3 Position Manager on Base
const POSITION_MANAGER_ADDRESS = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1' as const;

// Complete Uniswap V3 Position Manager ABI
const POSITION_MANAGER_ABI = [
  // Mint new position
  {
    inputs: [
      {
        components: [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'amount0Desired', type: 'uint256' },
          { name: 'amount1Desired', type: 'uint256' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'deadline', type: 'uint256' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'mint',
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  // Increase liquidity
  {
    inputs: [
      {
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'amount0Desired', type: 'uint256' },
          { name: 'amount1Desired', type: 'uint256' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'increaseLiquidity',
    outputs: [
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  // Decrease liquidity
  {
    inputs: [
      {
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'liquidity', type: 'uint128' },
          { name: 'amount0Min', type: 'uint256' },
          { name: 'amount1Min', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'decreaseLiquidity',
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Collect fees
  {
    inputs: [
      {
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'amount0Max', type: 'uint128' },
          { name: 'amount1Max', type: 'uint128' },
        ],
        name: 'params',
        type: 'tuple',
      },
    ],
    name: 'collect',
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Burn position (remove all liquidity and collect)
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  // Get position details
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'positions',
    outputs: [
      { name: 'nonce', type: 'uint96' },
      { name: 'operator', type: 'address' },
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0', type: 'uint128' },
      { name: 'tokensOwed1', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC20 ABI for token operations
const ERC20_ABI = [
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface MintPositionParams {
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: string;
  amount1Desired: string;
  amount0Min?: string;
  amount1Min?: string;
}

export interface IncreaseLiquidityParams {
  tokenId: string;
  amount0Desired: string;
  amount1Desired: string;
  amount0Min?: string;
  amount1Min?: string;
}

export interface DecreaseLiquidityParams {
  tokenId: string;
  liquidity: string;
  amount0Min?: string;
  amount1Min?: string;
}

export interface CollectFeesParams {
  tokenId: string;
  amount0Max?: string;
  amount1Max?: string;
}

export function usePositionManager() {
  const { address } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);

  // Create wallet and public clients
  const walletClient = address ? createWalletClient({
    chain: base,
    transport: custom(window.ethereum)
  }) : null;

  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  const getDeadline = () => Math.floor(Date.now() / 1000) + 1200; // 20 minutes

  // Check and approve token if needed
  const ensureApproval = async (tokenAddress: string, amount: bigint) => {
    if (!walletClient || !address) throw new Error('Wallet not connected');

    const allowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [address as `0x${string}`, POSITION_MANAGER_ADDRESS],
    });

    if (allowance < amount) {
      toast({
        title: "Approval Required",
        description: `Approving ${tokenAddress} for position manager...`,
      });

      const hash = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [POSITION_MANAGER_ADDRESS, maxUint256],
      });

      await publicClient.waitForTransactionReceipt({ hash });
      
      toast({
        title: "Approval Successful",
        description: "Token approved for position manager",
      });
    }
  };

  // Mint new position
  const mintPosition = async (params: MintPositionParams) => {
    if (!walletClient || !address) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setCurrentOperation('mint');
    
    try {
      const amount0Desired = parseUnits(params.amount0Desired, 18);
      const amount1Desired = parseUnits(params.amount1Desired, 18);
      const amount0Min = parseUnits(params.amount0Min || '0', 18);
      const amount1Min = parseUnits(params.amount1Min || '0', 18);

      // Ensure token approvals
      await ensureApproval(params.token0, amount0Desired);
      await ensureApproval(params.token1, amount1Desired);

      toast({
        title: "Creating Position",
        description: "Minting new liquidity position...",
      });

      const hash = await walletClient.writeContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: POSITION_MANAGER_ABI,
        functionName: 'mint',
        args: [{
          token0: params.token0 as `0x${string}`,
          token1: params.token1 as `0x${string}`,
          fee: params.fee,
          tickLower: params.tickLower,
          tickUpper: params.tickUpper,
          amount0Desired,
          amount1Desired,
          amount0Min,
          amount1Min,
          recipient: address as `0x${string}`,
          deadline: BigInt(getDeadline()),
        }],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Extract tokenId from logs
      const mintLog = receipt.logs.find(log => log.address.toLowerCase() === POSITION_MANAGER_ADDRESS.toLowerCase());
      const tokenId = mintLog ? BigInt(mintLog.topics[3] || '0').toString() : null;

      toast({
        title: "Position Created",
        description: `New position minted${tokenId ? ` with ID: ${tokenId}` : ''}`,
      });

      return { hash, tokenId, receipt };
    } catch (error) {
      console.error('Mint position error:', error);
      toast({
        title: "Mint Failed",
        description: (error as Error).message || 'Failed to mint position',
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
      setCurrentOperation(null);
    }
  };

  // Increase liquidity in existing position
  const increaseLiquidity = async (params: IncreaseLiquidityParams) => {
    if (!walletClient || !address) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setCurrentOperation('increase');
    
    try {
      // Get position details to know which tokens to approve
      const position = await publicClient.readContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: POSITION_MANAGER_ABI,
        functionName: 'positions',
        args: [BigInt(params.tokenId)],
      });

      const amount0Desired = parseUnits(params.amount0Desired, 18);
      const amount1Desired = parseUnits(params.amount1Desired, 18);
      const amount0Min = parseUnits(params.amount0Min || '0', 18);
      const amount1Min = parseUnits(params.amount1Min || '0', 18);

      // Ensure token approvals
      await ensureApproval(position[2], amount0Desired); // token0
      await ensureApproval(position[3], amount1Desired); // token1

      toast({
        title: "Increasing Liquidity",
        description: "Adding liquidity to existing position...",
      });

      const hash = await walletClient.writeContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: POSITION_MANAGER_ABI,
        functionName: 'increaseLiquidity',
        args: [{
          tokenId: BigInt(params.tokenId),
          amount0Desired,
          amount1Desired,
          amount0Min,
          amount1Min,
          deadline: BigInt(getDeadline()),
        }],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      toast({
        title: "Liquidity Increased",
        description: "Successfully added liquidity to position",
      });

      return { hash, receipt };
    } catch (error) {
      console.error('Increase liquidity error:', error);
      toast({
        title: "Increase Failed",
        description: (error as Error).message || 'Failed to increase liquidity',
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
      setCurrentOperation(null);
    }
  };

  // Decrease liquidity from position
  const decreaseLiquidity = async (params: DecreaseLiquidityParams) => {
    if (!walletClient || !address) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setCurrentOperation('decrease');
    
    try {
      const liquidity = parseUnits(params.liquidity, 0); // liquidity is already in wei
      const amount0Min = parseUnits(params.amount0Min || '0', 18);
      const amount1Min = parseUnits(params.amount1Min || '0', 18);

      toast({
        title: "Decreasing Liquidity",
        description: "Removing liquidity from position...",
      });

      const hash = await walletClient.writeContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: POSITION_MANAGER_ABI,
        functionName: 'decreaseLiquidity',
        args: [{
          tokenId: BigInt(params.tokenId),
          liquidity: liquidity as bigint,
          amount0Min,
          amount1Min,
          deadline: BigInt(getDeadline()),
        }],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      toast({
        title: "Liquidity Decreased",
        description: "Successfully removed liquidity from position",
      });

      return { hash, receipt };
    } catch (error) {
      console.error('Decrease liquidity error:', error);
      toast({
        title: "Decrease Failed",
        description: (error as Error).message || 'Failed to decrease liquidity',
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
      setCurrentOperation(null);
    }
  };

  // Collect accumulated fees
  const collectFees = async (params: CollectFeesParams) => {
    if (!walletClient || !address) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setCurrentOperation('collect');
    
    try {
      const amount0Max = params.amount0Max ? parseUnits(params.amount0Max, 18) : maxUint256;
      const amount1Max = params.amount1Max ? parseUnits(params.amount1Max, 18) : maxUint256;

      toast({
        title: "Collecting Fees",
        description: "Collecting accumulated fees...",
      });

      const hash = await walletClient.writeContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: POSITION_MANAGER_ABI,
        functionName: 'collect',
        args: [{
          tokenId: BigInt(params.tokenId),
          recipient: address as `0x${string}`,
          amount0Max: amount0Max as bigint,
          amount1Max: amount1Max as bigint,
        }],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      toast({
        title: "Fees Collected",
        description: "Successfully collected accumulated fees",
      });

      return { hash, receipt };
    } catch (error) {
      console.error('Collect fees error:', error);
      toast({
        title: "Collection Failed",
        description: (error as Error).message || 'Failed to collect fees',
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
      setCurrentOperation(null);
    }
  };

  // Burn position (remove all liquidity and collect all fees)
  const burnPosition = async (tokenId: string) => {
    if (!walletClient || !address) throw new Error('Wallet not connected');
    
    setIsLoading(true);
    setCurrentOperation('burn');
    
    try {
      // First get position details to check if it has liquidity
      const position = await publicClient.readContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: POSITION_MANAGER_ABI,
        functionName: 'positions',
        args: [BigInt(tokenId)],
      });

      // If position has liquidity, we need to decrease it first
      if (position[7] > 0n) { // liquidity > 0
        toast({
          title: "Removing Liquidity",
          description: "First removing all liquidity from position...",
        });

        await decreaseLiquidity({
          tokenId,
          liquidity: position[7].toString(),
          amount0Min: '0',
          amount1Min: '0',
        });
      }

      // Collect any remaining fees
      if (position[10] > 0n || position[11] > 0n) { // tokensOwed0 or tokensOwed1 > 0
        toast({
          title: "Collecting Fees",
          description: "Collecting any remaining fees...",
        });

        await collectFees({ tokenId });
      }

      // Finally burn the position NFT
      toast({
        title: "Burning Position",
        description: "Burning position NFT...",
      });

      const hash = await walletClient.writeContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: POSITION_MANAGER_ABI,
        functionName: 'burn',
        args: [BigInt(tokenId)],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      toast({
        title: "Position Burned",
        description: "Position successfully burned and removed",
      });

      return { hash, receipt };
    } catch (error) {
      console.error('Burn position error:', error);
      toast({
        title: "Burn Failed",
        description: (error as Error).message || 'Failed to burn position',
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
      setCurrentOperation(null);
    }
  };

  // Get position details from blockchain
  const getPositionDetails = async (tokenId: string) => {
    try {
      const position = await publicClient.readContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: POSITION_MANAGER_ABI,
        functionName: 'positions',
        args: [BigInt(tokenId)],
      });

      return {
        nonce: position[0],
        operator: position[1],
        token0: position[2],
        token1: position[3],
        fee: position[4],
        tickLower: position[5],
        tickUpper: position[6],
        liquidity: position[7],
        feeGrowthInside0LastX128: position[8],
        feeGrowthInside1LastX128: position[9],
        tokensOwed0: position[10],
        tokensOwed1: position[11],
      };
    } catch (error) {
      console.error('Get position details error:', error);
      throw error;
    }
  };

  return {
    // State
    isLoading,
    currentOperation,
    
    // Actions
    mintPosition,
    increaseLiquidity,
    decreaseLiquidity,
    collectFees,
    burnPosition,
    getPositionDetails,
    
    // Utilities
    ensureApproval,
  };
}