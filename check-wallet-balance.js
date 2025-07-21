// Check wallet balances for KILT and ETH tokens
import { ethers } from 'ethers';

async function checkWalletBalances() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const walletAddress = '0xcd9e4Df3b05e1006B7DC933dE2234b397cd2aD22';
  
  // Token addresses on Base
  const KILT_ADDRESS = '0x5D0DD05bB095fdD6Af4865A1AdF97c39C85ad2d8';
  const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
  
  try {
    // Check ETH balance
    const ethBalance = await provider.getBalance(walletAddress);
    console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    // Check KILT token balance
    const kiltContract = new ethers.Contract(
      KILT_ADDRESS,
      ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
      provider
    );
    
    const kiltBalance = await kiltContract.balanceOf(walletAddress);
    const kiltDecimals = await kiltContract.decimals();
    const formattedKiltBalance = ethers.formatUnits(kiltBalance, kiltDecimals);
    console.log(`KILT Balance: ${formattedKiltBalance} KILT`);
    
    // Check WETH balance
    const wethContract = new ethers.Contract(
      WETH_ADDRESS,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    
    const wethBalance = await wethContract.balanceOf(walletAddress);
    const formattedWethBalance = ethers.formatEther(wethBalance);
    console.log(`WETH Balance: ${formattedWethBalance} WETH`);
    
  } catch (error) {
    console.error('Error checking balances:', error.message);
  }
}

checkWalletBalances();