// Create a dedicated calculator wallet for secure reward signing
import { ethers } from 'ethers';

console.log('🔐 Creating dedicated calculator wallet...');

// Generate a new random wallet for calculator functions
const calculatorWallet = ethers.Wallet.createRandom();

console.log('\n✅ Calculator Wallet Created:');
console.log('Address:', calculatorWallet.address);
console.log('Private Key:', calculatorWallet.privateKey);
console.log('\n🔧 Next Steps:');
console.log('1. Add this to your .env file:');
console.log(`   CALCULATOR_PRIVATE_KEY=${calculatorWallet.privateKey}`);
console.log('\n2. Use your owner wallet to authorize this calculator:');
console.log('   - Go to BaseScan: https://basescan.org/address/0xe5771357399D58aC79A5b1161e8C363bB178B22b#writeContract');
console.log('   - Connect your owner wallet');
console.log(`   - Call setPendingCalculatorAuthorization with: ${calculatorWallet.address}`);
console.log('   - Wait 24 hours, then call activatePendingCalculator');
console.log('\n🛡️ Security: Your owner private key stays completely secure!');