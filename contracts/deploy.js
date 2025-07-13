const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying KILT Reward Pool Contract...');
  
  // Contract parameters
  const KILT_TOKEN_ADDRESS = '0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8'; // KILT token on Base
  const REWARD_WALLET_ADDRESS = process.env.REWARD_WALLET_ADDRESS || '0x1234567890123456789012345678901234567890'; // From environment
  const TREASURY_ALLOCATION = ethers.utils.parseEther('2905600'); // 2.9M KILT tokens
  const PROGRAM_DURATION = 365 * 24 * 60 * 60; // 365 days in seconds
  const PROGRAM_START_TIME = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // Start in 24 hours
  
  // Deploy contract
  const KILTRewardPool = await ethers.getContractFactory('KILTRewardPool');
  const rewardPool = await KILTRewardPool.deploy(
    KILT_TOKEN_ADDRESS,
    REWARD_WALLET_ADDRESS,
    TREASURY_ALLOCATION,
    PROGRAM_DURATION,
    PROGRAM_START_TIME
  );
  
  await rewardPool.deployed();
  
  console.log('✅ KILT Reward Pool deployed to:', rewardPool.address);
  console.log('📋 Contract Details:');
  console.log('   - KILT Token:', KILT_TOKEN_ADDRESS);
  console.log('   - Reward Wallet:', REWARD_WALLET_ADDRESS);
  console.log('   - Program Start:', new Date(PROGRAM_START_TIME * 1000).toISOString());
  console.log('   - Program Duration: 365 days');
  console.log('   - Lock Period: 7 days (rolling)');
  console.log('   - Treasury Allocation:', ethers.utils.formatEther(TREASURY_ALLOCATION), 'KILT');
  
  // Verify contract on Base scanner
  console.log('\n🔍 Verifying contract...');
  try {
    await hre.run('verify:verify', {
      address: rewardPool.address,
      constructorArguments: [
        KILT_TOKEN_ADDRESS,
        REWARD_WALLET_ADDRESS,
        TREASURY_ALLOCATION,
        PROGRAM_DURATION,
        PROGRAM_START_TIME
      ],
    });
    console.log('✅ Contract verified successfully');
  } catch (error) {
    console.log('❌ Contract verification failed:', error.message);
  }
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: rewardPool.address,
    kiltTokenAddress: KILT_TOKEN_ADDRESS,
    rewardWalletAddress: REWARD_WALLET_ADDRESS,
    programStartTime: PROGRAM_START_TIME,
    deployedAt: new Date().toISOString(),
    network: 'base',
    chainId: 8453
  };
  
  const fs = require('fs');
  fs.writeFileSync('./deployment.json', JSON.stringify(deploymentInfo, null, 2));
  console.log('💾 Deployment info saved to deployment.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });