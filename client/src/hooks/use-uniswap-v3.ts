import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useToast } from './use-toast';
import { createPublicClient, createWalletClient, custom, http, formatUnits, parseUnits, maxUint256 } from 'viem';
import { base } from 'viem/chains';
import { useQuery } from '@tanstack/react-query';

// ERC20 ABI for token operations
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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
] as const;

// Uniswap V3 NonfungiblePositionManager ABI (minimal)
const POSITION_MANAGER_ABI = [
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
] as const;

// Create Base network client with reliable RPC endpoint
const baseClient = createPublicClient({
  chain: base,
  transport: http('https://base-rpc.publicnode.com'),
});

// Contract addresses on Base network - Updated from official Uniswap docs
const UNISWAP_V3_POSITION_MANAGER = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1';

// Custom hook to fetch blockchain configuration from admin panel
function useBlockchainConfig() {
  return useQuery({
    queryKey: ['/api/blockchain-config'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUniswapV3() {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  
  // Get blockchain configuration from admin panel - MUST be called unconditionally
  const { data: blockchainConfig, isLoading: isConfigLoading } = useBlockchainConfig();
  
  const [isMinting, setIsMinting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [kiltBalance, setKiltBalance] = useState('0');
  const [wethBalance, setWethBalance] = useState('0');
  const [ethBalance, setEthBalance] = useState('0');
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Token addresses from admin panel configuration
  const KILT_TOKEN = blockchainConfig?.kiltTokenAddress || '0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8';
  const WETH_TOKEN = blockchainConfig?.wethTokenAddress || '0x4200000000000000000000000000000000000006';
  const POOL_ADDRESS = blockchainConfig?.poolAddress;

  // Real blockchain balance fetching with timeout and retry
  const fetchRealBalances = async () => {
    if (!address || !isConnected) return;

    setIsLoadingBalances(true);
    try {
      // Fetch balances with timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      const balancesPromise = Promise.all([
        // KILT token balance
        baseClient.readContract({
          address: KILT_TOKEN as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        }),
        // WETH token balance
        baseClient.readContract({
          address: WETH_TOKEN as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        }),
        // Native ETH balance
        baseClient.getBalance({
          address: address as `0x${string}`,
        }),
      ]);

      const [kiltBalanceWei, wethBalanceWei, ethBalanceWei] = await Promise.race([
        balancesPromise,
        timeoutPromise
      ]) as [bigint, bigint, bigint];

      // Convert wei to readable format
      const kiltBalanceFormatted = formatUnits(kiltBalanceWei, 18);
      const wethBalanceFormatted = formatUnits(wethBalanceWei, 18);
      const ethBalanceFormatted = formatUnits(ethBalanceWei, 18);
      
      setKiltBalance(kiltBalanceFormatted);
      setWethBalance(wethBalanceFormatted);
      setEthBalance(ethBalanceFormatted);
      

    } catch (error) {
      console.error('Failed to fetch balances:', error);
      // Reset to zeros on failure
      setKiltBalance('0');
      setWethBalance('0');
      setEthBalance('0');
      
      toast({
        title: "Balance fetch failed",
        description: "Unable to fetch wallet balances from blockchain",
        variant: "destructive",
      });
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Fetch balances when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      // Add a small delay to ensure wallet is fully connected
      setTimeout(() => {
        fetchRealBalances();
      }, 1000);
    } else {
      setKiltBalance('0');
      setWethBalance('0');
      setEthBalance('0');
    }
  }, [address, isConnected]);

  const formatTokenAmount = (amount: string | bigint) => {
    try {
      const amountStr = typeof amount === 'bigint' ? amount.toString() : amount;
      const parsed = parseFloat(amountStr) / 1e18; // Convert from wei to readable format
      return parsed.toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  const parseTokenAmount = (amount: string) => {
    return amount;
  };

  const approveToken = async ({ tokenAddress, amount }: { tokenAddress: `0x${string}`, amount: bigint }) => {
    setIsApproving(true);
    try {
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      // Call the ERC20 approve function
      const txHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            name: 'approve',
            outputs: [{ name: '', type: 'bool' }],
            type: 'function'
          }
        ],
        functionName: 'approve',
        args: [UNISWAP_V3_POSITION_MANAGER as `0x${string}`, amount]
      });

      // Wait for transaction confirmation
      await baseClient.waitForTransactionReceipt({ hash: txHash });

      toast({
        title: "Token Approved",
        description: `Token approved for position manager`,
      });

      return txHash;
    } catch (error) {
      const errorMessage = (error as Error)?.message || 'Failed to approve token';
      toast({
        title: "Approval Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsApproving(false);
    }
  };

  const mintPosition = async (params: {
    token0: `0x${string}`,
    token1: `0x${string}`,
    fee: number,
    tickLower: number,
    tickUpper: number,
    amount0Desired: bigint,
    amount1Desired: bigint,
    amount0Min: bigint,
    amount1Min: bigint,
    recipient: `0x${string}`,
    deadline: number
  }) => {
    setIsMinting(true);
    try {
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      // On Base network, we use WETH tokens only (no native ETH value)
      // The position manager expects WETH tokens, not native ETH
      const ethValue = 0n; // Always 0 for WETH-based transactions
      
      // Debug: Log the transaction details
      console.log('Base network transaction:', {
        ethValue: ethValue.toString(),
        token0: params.token0,
        token1: params.token1,
        amount0Desired: params.amount0Desired.toString(),
        amount1Desired: params.amount1Desired.toString(),
        WETH_TOKEN,
        note: 'Using WETH tokens only on Base network'
      });

      // Call the actual Uniswap V3 Position Manager contract
      const txHash = await walletClient.writeContract({
        address: UNISWAP_V3_POSITION_MANAGER as `0x${string}`,
        abi: [
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
                  { name: 'deadline', type: 'uint256' }
                ],
                name: 'params',
                type: 'tuple'
              }
            ],
            name: 'mint',
            outputs: [
              { name: 'tokenId', type: 'uint256' },
              { name: 'liquidity', type: 'uint128' },
              { name: 'amount0', type: 'uint256' },
              { name: 'amount1', type: 'uint256' }
            ],
            type: 'function'
          }
        ],
        functionName: 'mint',
        args: [
          {
            token0: params.token0,
            token1: params.token1,
            fee: params.fee,
            tickLower: params.tickLower,
            tickUpper: params.tickUpper,
            amount0Desired: params.amount0Desired,
            amount1Desired: params.amount1Desired,
            amount0Min: params.amount0Min,
            amount1Min: params.amount1Min,
            recipient: params.recipient,
            deadline: BigInt(params.deadline)
          }
        ],
        value: ethValue
      });

      // Wait for transaction confirmation
      await baseClient.waitForTransactionReceipt({ hash: txHash });

      toast({
        title: "Position Created!",
        description: `Transaction hash: ${txHash}`,
      });

      return txHash;
    } catch (error) {
      const errorMessage = (error as Error)?.message || 'Failed to create position';
      toast({
        title: "Position Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsMinting(false);
    }
  };

  return {
    // Real blockchain balances
    kiltBalance,
    wethBalance,
    ethBalance,
    preferredEthToken: { type: 'WETH' as const },
    
    // Position data - require real blockchain data
    userPositions: [],
    kiltEthPositions: [],
    poolData: null,
    poolExists: !isConfigLoading && !!POOL_ADDRESS,  // Pool exists if configuration loaded and pool address is set
    
    // Loading states
    isLoading: isLoadingBalances,
    isIncreasing: false,
    isDecreasing: false,
    isCollecting: false,
    isBurning: false,
    isMinting,
    isApproving,
    
    // Functions
    formatTokenAmount,
    parseTokenAmount: (amount: string) => {
      try {
        return BigInt(Math.floor(parseFloat(amount || '0') * 1e18)).toString();
      } catch {
        return '0';
      }
    },
    // Manual refresh function for balances
    refreshBalances: fetchRealBalances,
    approveToken: async (params: { tokenAddress: string; amount: BigInt }) => {
      setIsApproving(true);
      try {
        if (!address) throw new Error('Wallet not connected');
        
        // Check if MetaMask is available
        if (typeof window.ethereum === 'undefined') {
          throw new Error('MetaMask not found');
        }

        // Create wallet client
        const walletClient = createWalletClient({
          chain: base,
          transport: custom(window.ethereum),
        });

        // Send approval transaction
        const hash = await walletClient.writeContract({
          address: params.tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [UNISWAP_V3_POSITION_MANAGER as `0x${string}`, params.amount],
          account: address as `0x${string}`,
        });

        // Wait for transaction confirmation
        const receipt = await baseClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
          toast({
            title: "Token Approved",
            description: `Successfully approved ${params.tokenAddress === KILT_TOKEN ? 'KILT' : 'WETH'} for trading`,
          });
        } else {
          throw new Error('Transaction failed');
        }
      } catch (error: any) {
        toast({
          title: "Approval failed",
          description: error.message || "Please try again",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsApproving(false);
      }
    },
    mintPosition: async (params: any) => {
      setIsMinting(true);
      try {
        if (!address) throw new Error('Wallet not connected');
        
        // Check if MetaMask is available
        if (typeof window.ethereum === 'undefined') {
          throw new Error('MetaMask not found');
        }

        // Create wallet client
        const walletClient = createWalletClient({
          chain: base,
          transport: custom(window.ethereum),
        });

        // Validate parameters
        if (!params.token0 || !params.token1) {
          throw new Error('Invalid token addresses');
        }

        // Ensure amounts are valid BigInt values
        const amount0Desired = BigInt(params.amount0Desired || '0');
        const amount1Desired = BigInt(params.amount1Desired || '0');
        const amount0Min = BigInt(params.amount0Min || '0');
        const amount1Min = BigInt(params.amount1Min || '0');

        if (amount0Desired <= 0n && amount1Desired <= 0n) {
          throw new Error('Invalid token amounts');
        }

        // Calculate ETH value to send (only if using native ETH)
        const ethValue = params.isNativeETH ? amount1Desired : 0n;

        // Create the mint parameters
        const mintParams = {
          token0: params.token0 as `0x${string}`,
          token1: params.token1 as `0x${string}`,
          fee: params.fee,
          tickLower: params.tickLower,
          tickUpper: params.tickUpper,
          amount0Desired,
          amount1Desired,
          amount0Min,
          amount1Min,
          recipient: params.recipient as `0x${string}`,
          deadline: BigInt(params.deadline),
        };

        // Send minting transaction
        const hash = await walletClient.writeContract({
          address: UNISWAP_V3_POSITION_MANAGER as `0x${string}`,
          abi: POSITION_MANAGER_ABI,
          functionName: 'mint',
          args: [mintParams],
          account: address as `0x${string}`,
          value: ethValue,
        });

        // Wait for transaction confirmation
        const receipt = await baseClient.waitForTransactionReceipt({ hash });
        
        if (receipt.status === 'success') {
          toast({
            title: "Position Created",
            description: "Successfully created liquidity position",
          });
          return hash;
        } else {
          throw new Error('Transaction failed');
        }
      } catch (error: any) {
        // Enhanced error handling with more specific messages
        let errorMessage = "Please try again";
        
        if (error.message?.includes('insufficient funds')) {
          errorMessage = "Insufficient funds for transaction";
        } else if (error.message?.includes('user rejected')) {
          errorMessage = "Transaction rejected by user";
        } else if (error.message?.includes('execution reverted')) {
          errorMessage = "Contract execution failed - check token approvals";
        } else if (error.message?.includes('invalid address')) {
          errorMessage = "Invalid contract address";
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast({
          title: "Position Creation Failed",
          description: errorMessage,
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsMinting(false);
      }
    },
    increaseLiquidity: async () => {
      throw new Error('Real blockchain integration required - mock data removed');
    },
    decreaseLiquidity: async () => {
      throw new Error('Real blockchain integration required - mock data removed');
    },
    collectFees: async () => {
      throw new Error('Real blockchain integration required - mock data removed');
    },
    burnPosition: async () => {
      throw new Error('Real blockchain integration required - mock data removed');
    },
    calculatePositionValue: () => {
      throw new Error('Real blockchain integration required - mock data removed');
    },
    isPositionInRange: () => {
      throw new Error('Real blockchain integration required - mock data removed');
    }
  };
}