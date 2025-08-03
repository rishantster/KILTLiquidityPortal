const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AutoDistributeTreasuryPool to Base network...");

  // Contract parameters
  const KILT_TOKEN_ADDRESS = "0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8"; // KILT on Base
  const OWNER_ADDRESS = "0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e"; // Contract owner

  // Deploy the contract
  const AutoDistributeTreasuryPool = await hre.ethers.getContractFactory("AutoDistributeTreasuryPool");
  const contract = await AutoDistributeTreasuryPool.deploy(
    KILT_TOKEN_ADDRESS,
    OWNER_ADDRESS
  );

  await contract.deployed();

  console.log("✅ AutoDistributeTreasuryPool deployed to:", contract.address);
  console.log("📋 Contract Parameters:");
  console.log("   KILT Token:", KILT_TOKEN_ADDRESS);
  console.log("   Owner:", OWNER_ADDRESS);
  console.log("   Network: Base (Chain ID: 8453)");

  // Verify contract on BaseScan
  if (hre.network.name === "base") {
    console.log("\n🔍 Verifying contract on BaseScan...");
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [KILT_TOKEN_ADDRESS, OWNER_ADDRESS],
      });
      console.log("✅ Contract verified on BaseScan");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  // Generate deployment summary
  console.log("\n📊 Deployment Summary:");
  console.log("=".repeat(50));
  console.log("Contract Address:", contract.address);
  console.log("Transaction Hash:", contract.deployTransaction.hash);
  console.log("Gas Used:", contract.deployTransaction.gasLimit.toString());
  console.log("Block Number:", contract.deployTransaction.blockNumber);
  
  // Instructions for next steps
  console.log("\n🔧 Next Steps:");
  console.log("1. Set REWARD_WALLET_PRIVATE_KEY environment variable");
  console.log("2. Transfer KILT tokens to contract for rewards");
  console.log("3. Update database with new contract address");
  console.log("4. Test automatic claiming functionality");

  // Update database configuration script
  console.log("\n💾 Database Update SQL:");
  console.log(`UPDATE blockchain_config SET config_value = '${contract.address}' WHERE config_key = 'AUTO_DISTRIBUTE_POOL_ADDRESS';`);
  console.log(`INSERT INTO blockchain_config (config_key, config_value) VALUES ('AUTO_DISTRIBUTE_POOL_ADDRESS', '${contract.address}') ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;`);

  return contract.address;
}

main()
  .then((address) => {
    console.log(`\n🎉 Deployment completed successfully!`);
    console.log(`Contract ready for automatic KILT reward claiming at: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });