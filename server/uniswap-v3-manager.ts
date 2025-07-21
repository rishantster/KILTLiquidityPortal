import { ethers } from 'ethers';

// Uniswap V3 Contract ABIs
const POSITION_MANAGER_ABI = [
  'function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  'function increaseLiquidity((uint256 tokenId, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1)',
  'function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)',
  'function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)',
  'function burn(uint256 tokenId) external payable',
  'function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  'function ownerOf(uint256 tokenId) external view returns (address owner)'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

// Contract addresses on Base
const POSITION_MANAGER_ADDRESS = '0x03a520b32C04BF3bEEf7BF5d7652A52f7D86F4a7';
const KILT_TOKEN_ADDRESS = '0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';

export interface MintParams {
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: string;
  amount1Desired: string;
  amount0Min: string;
  amount1Min: string;
  recipient: string;
  deadline: number;
}

export interface IncreaseLiquidityParams {
  tokenId: string;
  amount0Desired: string;
  amount1Desired: string;
  amount0Min: string;
  amount1Min: string;
  deadline: number;
}

export interface DecreaseLiquidityParams {
  tokenId: string;
  liquidity: string;
  amount0Min: string;
  amount1Min: string;
  deadline: number;
}

export interface CollectParams {
  tokenId: string;
  recipient: string;
  amount0Max?: string;
  amount1Max?: string;
}

export class UniswapV3Manager {
  private provider: ethers.JsonRpcProvider;
  private positionManager: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    this.positionManager = new ethers.Contract(
      POSITION_MANAGER_ADDRESS,
      POSITION_MANAGER_ABI,
      this.provider
    );
  }

  /**
   * Add new liquidity - Create new Uniswap V3 position
   */
  async addLiquidity(params: MintParams, signer: ethers.Signer): Promise<{
    tokenId: string;
    liquidity: string;
    amount0: string;
    amount1: string;
    hash: string;
  }> {
    try {
      const positionManagerWithSigner = this.positionManager.connect(signer);

      // Prepare mint parameters
      const mintParams = {
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
        deadline: params.deadline
      };

      console.log('🏗️ Minting new position with params:', mintParams);

      const tx = await positionManagerWithSigner.mint(mintParams) as any;
      const receipt = await tx.wait();

      // Parse the mint event to get token ID
      const mintEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = positionManagerWithSigner.interface.parseLog(log);
          return parsed?.name === 'IncreaseLiquidity';
        } catch {
          return false;
        }
      });

      let tokenId = '0';
      let liquidity = '0';
      let amount0 = '0';
      let amount1 = '0';

      if (mintEvent) {
        const parsed = positionManagerWithSigner.interface.parseLog(mintEvent);
        if (parsed) {
          tokenId = parsed.args.tokenId.toString();
          liquidity = parsed.args.liquidity.toString();
          amount0 = parsed.args.amount0.toString();
          amount1 = parsed.args.amount1.toString();
        }
      }

      console.log('✅ Position minted successfully:', { tokenId, liquidity, amount0, amount1 });

      return {
        tokenId,
        liquidity,
        amount0,
        amount1,
        hash: tx.hash
      };
    } catch (error) {
      console.error('❌ Failed to add liquidity:', error);
      throw new Error(`Failed to add liquidity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Increase liquidity - Add more tokens to existing position
   */
  async increaseLiquidity(params: IncreaseLiquidityParams, signer: ethers.Signer): Promise<{
    liquidity: string;
    amount0: string;
    amount1: string;
    hash: string;
  }> {
    try {
      const positionManagerWithSigner = this.positionManager.connect(signer);

      console.log('📈 Increasing liquidity for position:', params.tokenId);

      const tx = await (positionManagerWithSigner as any).increaseLiquidity({
        tokenId: params.tokenId,
        amount0Desired: params.amount0Desired,
        amount1Desired: params.amount1Desired,
        amount0Min: params.amount0Min,
        amount1Min: params.amount1Min,
        deadline: params.deadline
      });

      const receipt = await tx.wait();

      // Parse the increase liquidity event
      const increaseEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = positionManagerWithSigner.interface.parseLog(log);
          return parsed?.name === 'IncreaseLiquidity';
        } catch {
          return false;
        }
      });

      let liquidity = '0';
      let amount0 = '0';
      let amount1 = '0';

      if (increaseEvent) {
        const parsed = positionManagerWithSigner.interface.parseLog(increaseEvent);
        if (parsed) {
          liquidity = parsed.args.liquidity.toString();
          amount0 = parsed.args.amount0.toString();
          amount1 = parsed.args.amount1.toString();
        }
      }

      console.log('✅ Liquidity increased successfully:', { liquidity, amount0, amount1 });

      return {
        liquidity,
        amount0,
        amount1,
        hash: tx.hash
      };
    } catch (error) {
      console.error('❌ Failed to increase liquidity:', error);
      throw new Error(`Failed to increase liquidity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrease liquidity - Remove liquidity from position
   */
  async decreaseLiquidity(params: DecreaseLiquidityParams, signer: ethers.Signer): Promise<{
    amount0: string;
    amount1: string;
    hash: string;
  }> {
    try {
      const positionManagerWithSigner = this.positionManager.connect(signer);

      console.log('📉 Decreasing liquidity for position:', params.tokenId);

      const tx = await (positionManagerWithSigner as any).decreaseLiquidity({
        tokenId: params.tokenId,
        liquidity: params.liquidity,
        amount0Min: params.amount0Min,
        amount1Min: params.amount1Min,
        deadline: params.deadline
      });

      const receipt = await tx.wait();

      // Parse the decrease liquidity event
      const decreaseEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = positionManagerWithSigner.interface.parseLog(log);
          return parsed?.name === 'DecreaseLiquidity';
        } catch {
          return false;
        }
      });

      let amount0 = '0';
      let amount1 = '0';

      if (decreaseEvent) {
        const parsed = positionManagerWithSigner.interface.parseLog(decreaseEvent);
        if (parsed) {
          amount0 = parsed.args.amount0.toString();
          amount1 = parsed.args.amount1.toString();
        }
      }

      console.log('✅ Liquidity decreased successfully:', { amount0, amount1 });

      return {
        amount0,
        amount1,
        hash: tx.hash
      };
    } catch (error) {
      console.error('❌ Failed to decrease liquidity:', error);
      throw new Error(`Failed to decrease liquidity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect fees - Harvest earned fees (CRITICAL for token recovery)
   */
  async collectFees(params: CollectParams, signer: ethers.Signer): Promise<{
    amount0: string;
    amount1: string;
    hash: string;
  }> {
    try {
      const positionManagerWithSigner = this.positionManager.connect(signer);

      // Use maximum values to collect all available fees
      const amount0Max = params.amount0Max || ethers.MaxUint256.toString();
      const amount1Max = params.amount1Max || ethers.MaxUint256.toString();

      console.log('💰 Collecting fees for position:', params.tokenId);

      const tx = await (positionManagerWithSigner as any).collect({
        tokenId: params.tokenId,
        recipient: params.recipient,
        amount0Max,
        amount1Max
      });

      const receipt = await tx.wait();

      // Parse the collect event
      const collectEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = positionManagerWithSigner.interface.parseLog(log);
          return parsed?.name === 'Collect';
        } catch {
          return false;
        }
      });

      let amount0 = '0';
      let amount1 = '0';

      if (collectEvent) {
        const parsed = positionManagerWithSigner.interface.parseLog(collectEvent);
        if (parsed) {
          amount0 = parsed.args.amount0.toString();
          amount1 = parsed.args.amount1.toString();
        }
      }

      console.log('✅ Fees collected successfully:', { amount0, amount1 });

      return {
        amount0,
        amount1,
        hash: tx.hash
      };
    } catch (error) {
      console.error('❌ Failed to collect fees:', error);
      throw new Error(`Failed to collect fees: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Burn position - Close position completely
   */
  async burnPosition(tokenId: string, signer: ethers.Signer): Promise<{
    hash: string;
  }> {
    try {
      const positionManagerWithSigner = this.positionManager.connect(signer);

      console.log('🔥 Burning position:', tokenId);

      const tx = await (positionManagerWithSigner as any).burn(tokenId);
      await tx.wait();

      console.log('✅ Position burned successfully');

      return {
        hash: tx.hash
      };
    } catch (error) {
      console.error('❌ Failed to burn position:', error);
      throw new Error(`Failed to burn position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check and approve tokens before liquidity operations
   */
  async approveTokens(
    token0Amount: string,
    token1Amount: string,
    userAddress: string,
    signer: ethers.Signer
  ): Promise<{
    token0Approved: boolean;
    token1Approved: boolean;
    approvalHashes: string[];
  }> {
    try {
      const approvalHashes: string[] = [];
      let token0Approved = false;
      let token1Approved = false;

      // Check KILT token approval
      const kiltContract = new ethers.Contract(KILT_TOKEN_ADDRESS, ERC20_ABI, signer);
      const kiltAllowance = await kiltContract.allowance(userAddress, POSITION_MANAGER_ADDRESS);
      
      if (BigInt(kiltAllowance) < BigInt(token1Amount)) {
        console.log('🔐 Approving KILT tokens...');
        const kiltApproveTx = await kiltContract.approve(POSITION_MANAGER_ADDRESS, ethers.MaxUint256);
        await kiltApproveTx.wait();
        approvalHashes.push(kiltApproveTx.hash);
        token1Approved = true;
      } else {
        token1Approved = true;
      }

      // Check WETH approval
      const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, signer);
      const wethAllowance = await wethContract.allowance(userAddress, POSITION_MANAGER_ADDRESS);
      
      if (BigInt(wethAllowance) < BigInt(token0Amount)) {
        console.log('🔐 Approving WETH tokens...');
        const wethApproveTx = await wethContract.approve(POSITION_MANAGER_ADDRESS, ethers.MaxUint256);
        await wethApproveTx.wait();
        approvalHashes.push(wethApproveTx.hash);
        token0Approved = true;
      } else {
        token0Approved = true;
      }

      console.log('✅ Token approvals completed');

      return {
        token0Approved,
        token1Approved,
        approvalHashes
      };
    } catch (error) {
      console.error('❌ Failed to approve tokens:', error);
      throw new Error(`Failed to approve tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get position details
   */
  async getPosition(tokenId: string): Promise<{
    nonce: string;
    operator: string;
    token0: string;
    token1: string;
    fee: number;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    feeGrowthInside0LastX128: string;
    feeGrowthInside1LastX128: string;
    tokensOwed0: string;
    tokensOwed1: string;
  }> {
    try {
      const position = await this.positionManager.positions(tokenId);
      
      return {
        nonce: position[0].toString(),
        operator: position[1],
        token0: position[2],
        token1: position[3],
        fee: position[4],
        tickLower: position[5],
        tickUpper: position[6],
        liquidity: position[7].toString(),
        feeGrowthInside0LastX128: position[8].toString(),
        feeGrowthInside1LastX128: position[9].toString(),
        tokensOwed0: position[10].toString(),
        tokensOwed1: position[11].toString()
      };
    } catch (error) {
      console.error('❌ Failed to get position:', error);
      throw new Error(`Failed to get position: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user owns a position
   */
  async isPositionOwner(tokenId: string, userAddress: string): Promise<boolean> {
    try {
      const owner = await this.positionManager.ownerOf(tokenId);
      return owner.toLowerCase() === userAddress.toLowerCase();
    } catch (error) {
      console.error('❌ Failed to check position ownership:', error);
      return false;
    }
  }
}

export const uniswapV3Manager = new UniswapV3Manager();