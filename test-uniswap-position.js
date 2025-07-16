// Test script to verify Uniswap V3 position detection
const { createPublicClient, http } = require('viem');
const { base } = require('viem/chains');

const POSITION_MANAGER = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1';
const TEST_WALLET = '0x5bf25dc1baf6a96c5a0f724e05ecf4d456c7652e';

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

async function testPositionDetection() {
  try {
    console.log('Testing Uniswap V3 Position Detection...');
    console.log('Contract:', POSITION_MANAGER);
    console.log('Test Wallet:', TEST_WALLET);
    
    // Test balanceOf call
    const balance = await client.readContract({
      address: POSITION_MANAGER,
      abi: [{
        inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      }],
      functionName: 'balanceOf',
      args: [TEST_WALLET],
    });
    
    console.log('Balance result:', balance.toString());
    console.log('Balance number:', Number(balance));
    
    if (Number(balance) > 0) {
      console.log('✓ Wallet has Uniswap V3 positions');
    } else {
      console.log('✗ Wallet has no Uniswap V3 positions');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPositionDetection();