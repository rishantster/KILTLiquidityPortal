// Script to check calculator authorization status for the KILT reward contract
import { ethers } from 'ethers';

// Contract configuration
const CONTRACT_ADDRESS = '0xe5771357399D58aC79A5b1161e8C363bB178B22b';
const CALCULATOR_ADDRESS = '0x0d16cbcf28fdc69cc44fc7a7a6a1a3bc75a8b82c';
const BASE_RPC_URL = 'https://mainnet.base.org';

// Contract ABI for authorization functions
const CONTRACT_ABI = [
  'function setCalculatorAuthorization(address calculator, bool authorized) external',
  'function authorizedCalculators(address) external view returns (bool)',
  'function owner() external view returns (address)'
];

async function checkCalculatorStatus() {
  try {
    console.log('🔐 Checking calculator authorization status...');
    console.log(`Contract: ${CONTRACT_ADDRESS}`);
    console.log(`Calculator: ${CALCULATOR_ADDRESS}`);
    
    // Connect to Base network
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    
    // Check if calculator is already authorized
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const isAuthorized = await contract.authorizedCalculators(CALCULATOR_ADDRESS);
    const owner = await contract.owner();
    
    console.log(`Contract Owner: ${owner}`);
    console.log(`Calculator Authorized: ${isAuthorized}`);
    
    if (isAuthorized) {
      console.log('✅ Calculator is already authorized! Claims will work.');
    } else {
      console.log('⚠️ Calculator needs authorization.');
      console.log('');
      console.log('To authorize, use your contract owner wallet to call:');
      console.log('Function: setCalculatorAuthorization');
      console.log(`Parameter 1 (calculator): ${CALCULATOR_ADDRESS}`);
      console.log('Parameter 2 (authorized): true');
    }
    
  } catch (error) {
    console.error('Failed to check calculator authorization:', error.message);
  }
}

// Run the check
checkCalculatorStatus();