import { useState } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/wallet-context';
import { useToast } from '@/hooks/use-toast';

// Uniswap V3 Position Manager Contract
const POSITION_MANAGER_ADDRESS = '0x03a520b32C04BF3bEEf7BF5d7652A52f7D86F4a7';
const POSITION_MANAGER_ABI = [
  'function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max)) external payable returns (uint256 amount0, uint256 amount1)',
  'function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
  'function increaseLiquidity((uint256 tokenId, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1)',
  'function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline)) external payable returns (uint256 amount0, uint256 amount1)',
  'function burn(uint256 tokenId) external payable'
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)'
];

interface LiquidityOperation {
  type: 'add' | 'increase' | 'decrease' | 'collect' | 'burn';
  tokenId?: string;
  amount0?: string;
  amount1?: string;
  liquidity?: string;
}

export function useLiquidityManager() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { address: walletAddress, isConnected } = useWallet();
  const { toast } = useToast();

  const getProvider = () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    throw new Error('No wallet provider found');
  };

  const approveTokens = async (
    tokenAddress: string,
    amount: string,
    tokenSymbol: string
  ): Promise<boolean> => {
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      // Check current allowance
      const allowance = await tokenContract.allowance(walletAddress, POSITION_MANAGER_ADDRESS);
      
      if (BigInt(allowance) >= BigInt(amount)) {
        return true; // Already approved
      }

      toast({
        title: "Token Approval Required",
        description: `Approving ${tokenSymbol} tokens for liquidity management`
      });

      const approveTx = await tokenContract.approve(POSITION_MANAGER_ADDRESS, ethers.MaxUint256);
      await approveTx.wait();

      toast({
        title: "Approval Successful",
        description: `${tokenSymbol} tokens approved successfully`
      });

      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: `Failed to approve ${tokenSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return false;
    }
  };

  const collectFees = async (tokenId: string): Promise<boolean> => {
    if (!isConnected || !walletAddress) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected",
        description: "Please connect your wallet to collect fees"
      });
      return false;
    }

    setIsProcessing(true);

    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_ABI, signer);

      toast({
        title: "Collecting Fees",
        description: `Collecting uncollected fees from position ${tokenId}`
      });

      // Collect all available fees
      const collectTx = await positionManager.collect({
        tokenId: tokenId,
        recipient: walletAddress,
        amount0Max: ethers.MaxUint256,
        amount1Max: ethers.MaxUint256
      });

      toast({
        title: "Transaction Submitted",
        description: "Fee collection transaction submitted. Waiting for confirmation..."
      });

      const receipt = await collectTx.wait();

      toast({
        title: "Fees Collected Successfully!",
        description: `Transaction confirmed: ${receipt.hash}`
      });

      return true;
    } catch (error) {
      console.error('Fee collection failed:', error);
      toast({
        variant: "destructive",
        title: "Fee Collection Failed",
        description: error instanceof Error ? error.message : "Failed to collect fees"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const addLiquidity = async (
    amount0: string,
    amount1: string,
    tickLower: number,
    tickUpper: number
  ): Promise<boolean> => {
    if (!isConnected || !walletAddress) {
      toast({
        variant: "destructive", 
        title: "Wallet Not Connected",
        description: "Please connect your wallet to add liquidity"
      });
      return false;
    }

    setIsProcessing(true);

    try {
      const provider = getProvider();
      const signer = await provider.getSigner();

      // Token addresses
      const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
      const KILT_ADDRESS = '0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8';

      // Convert amounts to wei
      const amount0Wei = ethers.parseEther(amount0);
      const amount1Wei = ethers.parseEther(amount1);

      // Approve tokens
      const wethApproved = await approveTokens(WETH_ADDRESS, amount0Wei.toString(), 'WETH');
      const kiltApproved = await approveTokens(KILT_ADDRESS, amount1Wei.toString(), 'KILT');

      if (!wethApproved || !kiltApproved) {
        throw new Error('Token approval failed');
      }

      const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_ABI, signer);

      // Calculate deadline (15 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + (15 * 60);

      // Mint parameters
      const mintParams = {
        token0: WETH_ADDRESS,
        token1: KILT_ADDRESS,
        fee: 3000, // 0.3% fee tier
        tickLower: tickLower,
        tickUpper: tickUpper,
        amount0Desired: amount0Wei,
        amount1Desired: amount1Wei,
        amount0Min: (amount0Wei * BigInt(95)) / BigInt(100), // 5% slippage
        amount1Min: (amount1Wei * BigInt(95)) / BigInt(100), // 5% slippage
        recipient: walletAddress,
        deadline: deadline
      };

      toast({
        title: "Adding Liquidity",
        description: "Creating new liquidity position..."
      });

      const mintTx = await positionManager.mint(mintParams);
      
      toast({
        title: "Transaction Submitted",
        description: "Liquidity addition transaction submitted. Waiting for confirmation..."
      });

      const receipt = await mintTx.wait();

      toast({
        title: "Liquidity Added Successfully!",
        description: `New position created. Transaction: ${receipt.hash}`
      });

      return true;
    } catch (error) {
      console.error('Add liquidity failed:', error);
      toast({
        variant: "destructive",
        title: "Add Liquidity Failed",
        description: error instanceof Error ? error.message : "Failed to add liquidity"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const increaseLiquidity = async (
    tokenId: string,
    amount0: string,
    amount1: string
  ): Promise<boolean> => {
    if (!isConnected || !walletAddress) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected",
        description: "Please connect your wallet to increase liquidity"
      });
      return false;
    }

    setIsProcessing(true);

    try {
      const provider = getProvider();
      const signer = await provider.getSigner();

      // Token addresses
      const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
      const KILT_ADDRESS = '0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8';

      // Convert amounts to wei
      const amount0Wei = ethers.parseEther(amount0);
      const amount1Wei = ethers.parseEther(amount1);

      // Approve tokens
      const wethApproved = await approveTokens(WETH_ADDRESS, amount0Wei.toString(), 'WETH');
      const kiltApproved = await approveTokens(KILT_ADDRESS, amount1Wei.toString(), 'KILT');

      if (!wethApproved || !kiltApproved) {
        throw new Error('Token approval failed');
      }

      const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_ABI, signer);

      // Calculate deadline (15 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + (15 * 60);

      toast({
        title: "Increasing Liquidity",
        description: `Adding more tokens to position ${tokenId}...`
      });

      const increaseTx = await positionManager.increaseLiquidity({
        tokenId: tokenId,
        amount0Desired: amount0Wei,
        amount1Desired: amount1Wei,
        amount0Min: (amount0Wei * BigInt(95)) / BigInt(100), // 5% slippage
        amount1Min: (amount1Wei * BigInt(95)) / BigInt(100), // 5% slippage
        deadline: deadline
      });

      toast({
        title: "Transaction Submitted",
        description: "Increase liquidity transaction submitted. Waiting for confirmation..."
      });

      const receipt = await increaseTx.wait();

      toast({
        title: "Liquidity Increased Successfully!",
        description: `Position ${tokenId} updated. Transaction: ${receipt.hash}`
      });

      return true;
    } catch (error) {
      console.error('Increase liquidity failed:', error);
      toast({
        variant: "destructive",
        title: "Increase Liquidity Failed",
        description: error instanceof Error ? error.message : "Failed to increase liquidity"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const decreaseLiquidity = async (
    tokenId: string,
    liquidityToRemove: string
  ): Promise<boolean> => {
    if (!isConnected || !walletAddress) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected",
        description: "Please connect your wallet to decrease liquidity"
      });
      return false;
    }

    setIsProcessing(true);

    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_ABI, signer);

      // Calculate deadline (15 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + (15 * 60);

      toast({
        title: "Decreasing Liquidity",
        description: `Removing liquidity from position ${tokenId}...`
      });

      const decreaseTx = await positionManager.decreaseLiquidity({
        tokenId: tokenId,
        liquidity: liquidityToRemove,
        amount0Min: 0, // Accept any amount of tokens back
        amount1Min: 0, // Accept any amount of tokens back
        deadline: deadline
      });

      toast({
        title: "Transaction Submitted",
        description: "Decrease liquidity transaction submitted. Waiting for confirmation..."
      });

      const receipt = await decreaseTx.wait();

      toast({
        title: "Liquidity Decreased Successfully!",
        description: `Position ${tokenId} updated. Transaction: ${receipt.hash}`
      });

      return true;
    } catch (error) {
      console.error('Decrease liquidity failed:', error);
      toast({
        variant: "destructive",
        title: "Decrease Liquidity Failed",
        description: error instanceof Error ? error.message : "Failed to decrease liquidity"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const burnPosition = async (tokenId: string): Promise<boolean> => {
    if (!isConnected || !walletAddress) {
      toast({
        variant: "destructive",
        title: "Wallet Not Connected", 
        description: "Please connect your wallet to burn position"
      });
      return false;
    }

    setIsProcessing(true);

    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_ABI, signer);

      toast({
        title: "Burning Position",
        description: `Burning position ${tokenId}...`
      });

      const burnTx = await positionManager.burn(tokenId);

      toast({
        title: "Transaction Submitted",
        description: "Burn position transaction submitted. Waiting for confirmation..."
      });

      const receipt = await burnTx.wait();

      toast({
        title: "Position Burned Successfully!",
        description: `Position ${tokenId} has been burned. Transaction: ${receipt.hash}`
      });

      return true;
    } catch (error) {
      console.error('Burn position failed:', error);
      toast({
        variant: "destructive",
        title: "Burn Position Failed",
        description: error instanceof Error ? error.message : "Failed to burn position"
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    collectFees,
    addLiquidity,
    increaseLiquidity,
    decreaseLiquidity,
    burnPosition
  };
}