#!/usr/bin/env node

// Compare old vs new APR calculations for realistic user expectations

const TREASURY_ALLOCATION = 2905600; // Annual KILT budget
const BASE_LIQUIDITY_WEIGHT = 0.6; // w1 - base liquidity weight
const KILT_PRICE = 0.01602; // Current KILT price in USD

function calculateNewFormulaAPR(userLiquidity, totalLiquidity, daysActive) {
    const liquidityShare = userLiquidity / totalLiquidity;
    const timeProgression = BASE_LIQUIDITY_WEIGHT + (daysActive / 365) * (1 - BASE_LIQUIDITY_WEIGHT);
    const dailyBudgetRate = TREASURY_ALLOCATION / 365;
    const inRangeMultiplier = 1.0;
    
    const dailyReward = liquidityShare * timeProgression * dailyBudgetRate * inRangeMultiplier;
    const dailyRewardUSD = dailyReward * KILT_PRICE;
    return (dailyRewardUSD * 365) / userLiquidity * 100;
}

function calculateOldFormulaAPR(userLiquidity, totalLiquidity, daysActive) {
    // Old formula was more optimistic with smaller pool assumptions
    const liquidityShare = userLiquidity / totalLiquidity;
    const timeProgression = BASE_LIQUIDITY_WEIGHT + (daysActive / 365) * (1 - BASE_LIQUIDITY_WEIGHT);
    const dailyBudgetRate = TREASURY_ALLOCATION / 365;
    const inRangeMultiplier = 1.0;
    
    const dailyReward = liquidityShare * timeProgression * dailyBudgetRate * inRangeMultiplier;
    const dailyRewardUSD = dailyReward * KILT_PRICE;
    return (dailyRewardUSD * 365) / userLiquidity * 100;
}

console.log("=".repeat(80));
console.log("APR CALCULATION COMPARISON: OLD vs NEW REALISTIC EXPECTATIONS");
console.log("=".repeat(80));

console.log("\n📊 BEFORE (Old Calculation):");
console.log("- Assumed $500 positions in $100K pools");
console.log("- APR Range: 29% - 47%");
console.log("- Optimistic small pool scenario");

console.log("\n📊 AFTER (New Calculation):");
console.log("- Assumes $2000 positions in $1M pools");
console.log("- APR Range: 3% - 5%");
console.log("- Realistic mature pool scenario");

console.log("\n" + "=".repeat(80));
console.log("SIDE-BY-SIDE COMPARISON FOR TYPICAL USER SCENARIOS");
console.log("=".repeat(80));

const scenarios = [
    { amount: 1000, pool: 500000, name: "Small Position in Medium Pool" },
    { amount: 2000, pool: 1000000, name: "Medium Position in Large Pool" },
    { amount: 5000, pool: 2000000, name: "Large Position in Very Large Pool" }
];

const timePeriods = [
    { days: 30, name: "1 Month" },
    { days: 180, name: "6 Months" },
    { days: 365, name: "1 Year" }
];

scenarios.forEach(({ amount, pool, name }) => {
    console.log(`\n${name} ($${amount.toLocaleString()} in $${pool.toLocaleString()} pool)`);
    console.log("-".repeat(60));
    
    console.log(`${"Time Period".padEnd(12)} | ${"Old Formula".padEnd(12)} | ${"New Formula".padEnd(12)} | ${"Difference"}`);
    console.log("-".repeat(60));
    
    timePeriods.forEach(({ days, name: timeName }) => {
        // Old formula used smaller pool assumptions
        const oldPoolSize = pool / 10; // Simulating old optimistic assumptions
        const oldAPR = calculateOldFormulaAPR(amount, oldPoolSize, days);
        
        // New formula uses realistic pool sizes
        const newAPR = calculateNewFormulaAPR(amount, pool, days);
        
        const difference = ((newAPR - oldAPR) / oldAPR * 100).toFixed(1);
        
        console.log(`${timeName.padEnd(12)} | ${oldAPR.toFixed(1).padStart(10)}% | ${newAPR.toFixed(1).padStart(10)}% | ${difference.padStart(8)}%`);
    });
});

console.log("\n" + "=".repeat(80));
console.log("REALISTIC EXPECTATIONS FOR USERS");
console.log("=".repeat(80));

console.log("\n✅ WHAT USERS CAN ACTUALLY EXPECT:");
console.log("• Early participants (smaller pools): 5-15% APR");
console.log("• Typical participants (medium pools): 2-8% APR");
console.log("• Late participants (large pools): 1-4% APR");
console.log("• Time commitment increases APR by ~67%");
console.log("• In-range performance is critical for any rewards");

console.log("\n❌ WHAT WE REMOVED:");
console.log("• Misleading 29-47% APR projections");
console.log("• Unrealistic small pool assumptions");
console.log("• Overly optimistic position scenarios");

console.log("\n🎯 BENEFITS OF REALISTIC CALCULATIONS:");
console.log("• Users have proper expectations");
console.log("• No disappointment from inflated projections");
console.log("• Better user adoption with honest marketing");
console.log("• Sustainable long-term program growth");

console.log("\n📈 RECOMMENDED MESSAGING:");
console.log("• 'Earn 3-5% APR on your KILT liquidity positions'");
console.log("• 'Higher APR for longer time commitment'");
console.log("• 'Early participants get better rates'");
console.log("• 'Must stay in-range to earn rewards'");

console.log("\n" + "=".repeat(80));