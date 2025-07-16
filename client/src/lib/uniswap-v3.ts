import { createPublicClient, createWalletClient, custom, http, parseAbi, Address, formatUnits, parseUnits } from 'viem';
import { base } from 'viem/chains';

// Official Uniswap V3 contract addresses on Base network
export const UNISWAP_V3_CONTRACTS = {
  FACTORY: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD' as Address,
  NONFUNGIBLE_POSITION_MANAGER: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1' as Address,
  QUOTER_V2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a' as Address,
  SWAP_ROUTER_02: '0x2626664c2603336E57B271c5C0b26F421741e481' as Address,
  V3_STAKER: '0x42bE4D6527829FeFA1493e1fb9F3676d2425C3C1' as Address
} as const;

// Token addresses - these will be fetched dynamically from blockchain config
export const TOKENS = {
  KILT: '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8' as Address,
  WETH: '0x4200000000000000000000000000000000000006' as Address // Fallback - will be updated dynamically
} as const;

// Uniswap V3 ABIs
export const NONFUNGIBLE_POSITION_MANAGER_ABI = parseAbi([
  // View functions
  'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  'function ownerOf(uint256 tokenId) external view returns (address owner)',
  'function balanceOf(address owner) external view returns (uint256 balance)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256 tokenId)',
  'function tokenByIndex(uint256 index) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string memory)',
  'function getApproved(uint256 tokenId) external view returns (address operator)',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  
  // Liquidity management
  'function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  'function increaseLiquidity((uint256 tokenId, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1)',
  'function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)',
  'function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)',
  'function burn(uint256 tokenId) external payable',
  
  // Approval functions
  'function approve(address to, uint256 tokenId) external',
  'function setApprovalForAll(address operator, bool approved) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external',
  'function transferFrom(address from, address to, uint256 tokenId) external',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
  'event IncreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  'event DecreaseLiquidity(uint256 indexed tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  'event Collect(uint256 indexed tokenId, address recipient, uint256 amount0, uint256 amount1)'
]);

export const UNISWAP_V3_FACTORY_ABI = parseAbi([
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)',
  'function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool)',
  'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, int24 tickSpacing, address pool)'
]);

export const UNISWAP_V3_POOL_ABI = parseAbi([
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint24)',
  'function tickSpacing() external view returns (int24)',
  'function liquidity() external view returns (uint128)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function feeGrowthGlobal0X128() external view returns (uint256)',
  'function feeGrowthGlobal1X128() external view returns (uint256)',
  'function protocolFees() external view returns (uint128 token0, uint128 token1)',
  'function positions(bytes32 key) external view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  'function observations(uint256 index) external view returns (uint32 blockTimestamp, int56 tickCumulative, uint160 secondsPerLiquidityCumulativeX128, bool initialized)',
  'function snapshotCumulativesInside(int24 tickLower, int24 tickUpper) external view returns (int56 tickCumulativeInside, uint160 secondsPerLiquidityInsideX128, uint32 secondsInside)'
]);

export const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
  'function totalSupply() external view returns (uint256)'
]);

// Create clients
export const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

export const getWalletClient = () => {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return createWalletClient({
      chain: base,
      transport: custom((window as any).ethereum)
    });
  }
  return null;
};

// Types
export interface UniswapV3Position {
  tokenId: bigint;
  nonce: bigint;
  operator: Address;
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  feeGrowthInside0LastX128: bigint;
  feeGrowthInside1LastX128: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
  // Additional fields from backend
  currentValueUSD?: number;
  token0Amount?: string;
  token1Amount?: string;
  isActive?: boolean;
  poolAddress?: string;
}

export interface PoolData {
  address: Address;
  token0: Address;
  token1: Address;
  fee: number;
  tickSpacing: number;
  liquidity: bigint;
  sqrtPriceX96: bigint;
  tick: number;
  feeGrowthGlobal0X128: bigint;
  feeGrowthGlobal1X128: bigint;
}

export interface MintParams {
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  recipient: Address;
  deadline: bigint;
}

export interface IncreaseLiquidityParams {
  tokenId: bigint;
  amount0Desired: bigint;
  amount1Desired: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline: bigint;
}

export interface DecreaseLiquidityParams {
  tokenId: bigint;
  liquidity: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  deadline: bigint;
}

export interface CollectParams {
  tokenId: bigint;
  recipient: Address;
  amount0Max: bigint;
  amount1Max: bigint;
}

// Uniswap V3 Service
export class UniswapV3Service {
  private publicClient = publicClient;
  private walletClient: any = null;

  constructor() {
    this.walletClient = getWalletClient();
  }

  // Position Management Functions

  async getPosition(tokenId: bigint): Promise<UniswapV3Position> {
    const result = await this.publicClient.readContract({
      address: UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      functionName: 'positions',
      args: [tokenId]
    });

    return {
      tokenId,
      nonce: result[0],
      operator: result[1],
      token0: result[2],
      token1: result[3],
      fee: result[4],
      tickLower: result[5],
      tickUpper: result[6],
      liquidity: result[7],
      feeGrowthInside0LastX128: result[8],
      feeGrowthInside1LastX128: result[9],
      tokensOwed0: result[10],
      tokensOwed1: result[11]
    };
  }

  async getUserPositions(userAddress: Address): Promise<bigint[]> {
    const balance = await this.publicClient.readContract({
      address: UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    });

    const tokenIds: bigint[] = [];
    for (let i = 0; i < Number(balance); i++) {
      const tokenId = await this.publicClient.readContract({
        address: UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
        abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
        functionName: 'tokenOfOwnerByIndex',
        args: [userAddress, BigInt(i)]
      });
      tokenIds.push(tokenId);
    }

    return tokenIds;
  }

  async getKiltEthPositions(userAddress: Address, kiltTokenAddress?: Address, wethTokenAddress?: Address): Promise<UniswapV3Position[]> {
    const allTokenIds = await this.getUserPositions(userAddress);
    const positions: UniswapV3Position[] = [];

    // Use provided addresses or fall back to constants
    const kiltAddr = kiltTokenAddress || TOKENS.KILT;
    const wethAddr = wethTokenAddress || TOKENS.WETH;

    for (const tokenId of allTokenIds) {
      try {
        const position = await this.getPosition(tokenId);
        
        // Check if this is a KILT/ETH position with dynamic addresses
        const isKiltEthPosition = (
          (position.token0.toLowerCase() === kiltAddr.toLowerCase() && position.token1.toLowerCase() === wethAddr.toLowerCase()) ||
          (position.token0.toLowerCase() === wethAddr.toLowerCase() && position.token1.toLowerCase() === kiltAddr.toLowerCase())
        );

        // Include both open and closed positions (removed liquidity > 0n check)
        if (isKiltEthPosition) {
          positions.push(position);
        }
      } catch (error) {
        // Error fetching position
      }
    }

    return positions;
  }

  // Pool Functions

  async getKiltEthPool(): Promise<Address> {
    return await this.publicClient.readContract({
      address: UNISWAP_V3_CONTRACTS.FACTORY,
      abi: UNISWAP_V3_FACTORY_ABI,
      functionName: 'getPool',
      args: [TOKENS.KILT, TOKENS.WETH, 3000] // 0.3% fee tier
    });
  }

  async getPoolData(poolAddress: Address): Promise<PoolData> {
    const [token0, token1, fee, tickSpacing, liquidity, slot0Data, feeGrowthGlobal0X128, feeGrowthGlobal1X128] = await Promise.all([
      this.publicClient.readContract({
        address: poolAddress,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'token0'
      }),
      this.publicClient.readContract({
        address: poolAddress,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'token1'
      }),
      this.publicClient.readContract({
        address: poolAddress,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'fee'
      }),
      this.publicClient.readContract({
        address: poolAddress,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'tickSpacing'
      }),
      this.publicClient.readContract({
        address: poolAddress,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'liquidity'
      }),
      this.publicClient.readContract({
        address: poolAddress,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'slot0'
      }),
      this.publicClient.readContract({
        address: poolAddress,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'feeGrowthGlobal0X128'
      }),
      this.publicClient.readContract({
        address: poolAddress,
        abi: UNISWAP_V3_POOL_ABI,
        functionName: 'feeGrowthGlobal1X128'
      })
    ]);

    return {
      address: poolAddress,
      token0: token0 as Address,
      token1: token1 as Address,
      fee: fee as number,
      tickSpacing: tickSpacing as number,
      liquidity: liquidity as bigint,
      sqrtPriceX96: slot0Data[0] as bigint,
      tick: slot0Data[1] as number,
      feeGrowthGlobal0X128: feeGrowthGlobal0X128 as bigint,
      feeGrowthGlobal1X128: feeGrowthGlobal1X128 as bigint
    };
  }

  // Token Functions

  async getTokenBalance(tokenAddress: Address, userAddress: Address): Promise<bigint> {
    return await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    });
  }

  async getTokenAllowance(tokenAddress: Address, owner: Address, spender: Address): Promise<bigint> {
    return await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner, spender]
    });
  }

  // Write Functions (require wallet connection)

  async approveToken(tokenAddress: Address, spender: Address, amount: bigint, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  async approveNFT(tokenId: bigint, spender: Address, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      functionName: 'approve',
      args: [spender, tokenId],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  async setApprovalForAll(operator: Address, approved: boolean, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      functionName: 'setApprovalForAll',
      args: [operator, approved],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  async mintPosition(params: MintParams, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      functionName: 'mint',
      args: [params],
      account,
      value: params.token0 === TOKENS.WETH || params.token1 === TOKENS.WETH ? 
        (params.token0 === TOKENS.WETH ? params.amount0Desired : params.amount1Desired) : 0n
    });

    return await this.walletClient.writeContract(request);
  }

  async increaseLiquidity(params: IncreaseLiquidityParams, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      functionName: 'increaseLiquidity',
      args: [params],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  async decreaseLiquidity(params: DecreaseLiquidityParams, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      functionName: 'decreaseLiquidity',
      args: [params],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  async collectFees(params: CollectParams, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      functionName: 'collect',
      args: [params],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  async burnPosition(tokenId: bigint, account: Address): Promise<string> {
    if (!this.walletClient) throw new Error('Wallet not connected');

    const { request } = await this.publicClient.simulateContract({
      address: UNISWAP_V3_CONTRACTS.NONFUNGIBLE_POSITION_MANAGER,
      abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
      functionName: 'burn',
      args: [tokenId],
      account
    });

    return await this.walletClient.writeContract(request);
  }

  // Utility Functions

  async waitForTransaction(hash: string) {
    return await this.publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
  }

  formatTokenAmount(amount: bigint, decimals: number = 18): string {
    return formatUnits(amount, decimals);
  }

  parseTokenAmount(amount: string, decimals: number = 18): bigint {
    return parseUnits(amount, decimals);
  }

  // Calculate position value in USD (simplified)
  calculatePositionValue(position: UniswapV3Position, kiltPriceUSD: number, ethPriceUSD: number): number {
    // This is a simplified calculation
    // In practice, you'd need to calculate the exact token amounts based on current price and tick range
    const liquidityValue = Number(position.liquidity) / 1e18;
    
    // Rough approximation - in reality this needs complex liquidity math
    if (position.token0 === TOKENS.KILT) {
      return liquidityValue * kiltPriceUSD * 0.5 + liquidityValue * ethPriceUSD * 0.5;
    } else {
      return liquidityValue * ethPriceUSD * 0.5 + liquidityValue * kiltPriceUSD * 0.5;
    }
  }

  // Check if position is in range
  isPositionInRange(position: UniswapV3Position, currentTick: number): boolean {
    return currentTick >= position.tickLower && currentTick <= position.tickUpper;
  }
}

// Create singleton instance
export const uniswapV3Service = new UniswapV3Service();