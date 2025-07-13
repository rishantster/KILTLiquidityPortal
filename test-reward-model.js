#!/usr/bin/env node

// Test script to demonstrate the new reward formula
// R_u = (L_u/L_T) * (w1 + (D_u/365)*(1-w1)) * R/365 * IRM

const TREASURY_ALLOCATION = 2905600; // Annual KILT budget
const BASE_LIQUIDITY_WEIGHT = 0.6; // w1 - base liquidity weight
const DAILY_BUDGET = TREASURY_ALLOCATION / 365; // ~7,960 KILT per day

function calculateDailyReward(userLiquidity, totalLiquidity, daysActive, inRangeMultiplier) {
    if (totalLiquidity === 0 || userLiquidity === 0 || inRangeMultiplier === 0) {
        return 0;
    }

    // Formula components
    const liquidityShare = userLiquidity / totalLiquidity; // L_u/L_T
    const timeProgression = BASE_LIQUIDITY_WEIGHT + (daysActive / 365) * (1 - BASE_LIQUIDITY_WEIGHT); // w1 + (D_u/365)*(1-w1)
    const dailyBudgetRate = TREASURY_ALLOCATION / 365; // R/365
    
    // Final calculation: R_u = (L_u/L_T) * (w1 + (D_u/365)*(1-w1)) * R/365 * IRM
    const dailyReward = liquidityShare * timeProgression * dailyBudgetRate * inRangeMultiplier;
    
    return Math.max(0, dailyReward);
}

function calculateAPR(dailyReward, userLiquidity) {
    if (userLiquidity === 0) return 0;
    return (dailyReward * 365) / userLiquidity * 100;
}

// Test scenarios
console.log("=".repeat(80));
console.log("KILT LIQUIDITY REWARD FORMULA MODEL TEST");
console.log("Formula: R_u = (L_u/L_T) * (w1 + (D_u/365)*(1-w1)) * R/365 * IRM");
console.log("=".repeat(80));

console.log("\nConstants:");
console.log(`- Annual Treasury Budget (R): ${TREASURY_ALLOCATION.toLocaleString()} KILT`);
console.log(`- Daily Budget Rate (R/365): ${DAILY_BUDGET.toFixed(2)} KILT/day`);
console.log(`- Base Liquidity Weight (w1): ${BASE_LIQUIDITY_WEIGHT}`);
console.log(`- Time progression: ${BASE_LIQUIDITY_WEIGHT} to 1.0 over 365 days`);

// Scenario 1: Small liquidity provider
console.log("\n" + "=".repeat(50));
console.log("SCENARIO 1: Small Provider ($500 in $50K pool)");
console.log("=".repeat(50));

const scenarios1 = [
    { days: 1, inRange: 1.0 },
    { days: 30, inRange: 1.0 },
    { days: 90, inRange: 1.0 },
    { days: 180, inRange: 1.0 },
    { days: 365, inRange: 1.0 }
];

scenarios1.forEach(({ days, inRange }) => {
    const userLiq = 500;
    const totalLiq = 50000;
    const dailyReward = calculateDailyReward(userLiq, totalLiq, days, inRange);
    const apr = calculateAPR(dailyReward, userLiq);
    const liquidityShare = (userLiq / totalLiq * 100).toFixed(1);
    const timeProgression = (BASE_LIQUIDITY_WEIGHT + (days / 365) * (1 - BASE_LIQUIDITY_WEIGHT)).toFixed(3);
    
    console.log(`Day ${days.toString().padStart(3)}: ${dailyReward.toFixed(2)} KILT/day | ${apr.toFixed(1)}% APR | ${liquidityShare}% share | ${timeProgression} time factor`);
});

// Scenario 2: Medium liquidity provider
console.log("\n" + "=".repeat(50));
console.log("SCENARIO 2: Medium Provider ($2,500 in $50K pool)");
console.log("=".repeat(50));

const scenarios2 = [
    { days: 1, inRange: 1.0 },
    { days: 30, inRange: 1.0 },
    { days: 90, inRange: 1.0 },
    { days: 180, inRange: 1.0 },
    { days: 365, inRange: 1.0 }
];

scenarios2.forEach(({ days, inRange }) => {
    const userLiq = 2500;
    const totalLiq = 50000;
    const dailyReward = calculateDailyReward(userLiq, totalLiq, days, inRange);
    const apr = calculateAPR(dailyReward, userLiq);
    const liquidityShare = (userLiq / totalLiq * 100).toFixed(1);
    const timeProgression = (BASE_LIQUIDITY_WEIGHT + (days / 365) * (1 - BASE_LIQUIDITY_WEIGHT)).toFixed(3);
    
    console.log(`Day ${days.toString().padStart(3)}: ${dailyReward.toFixed(2)} KILT/day | ${apr.toFixed(1)}% APR | ${liquidityShare}% share | ${timeProgression} time factor`);
});

// Scenario 3: Large liquidity provider
console.log("\n" + "=".repeat(50));
console.log("SCENARIO 3: Large Provider ($10,000 in $50K pool)");
console.log("=".repeat(50));

const scenarios3 = [
    { days: 1, inRange: 1.0 },
    { days: 30, inRange: 1.0 },
    { days: 90, inRange: 1.0 },
    { days: 180, inRange: 1.0 },
    { days: 365, inRange: 1.0 }
];

scenarios3.forEach(({ days, inRange }) => {
    const userLiq = 10000;
    const totalLiq = 50000;
    const dailyReward = calculateDailyReward(userLiq, totalLiq, days, inRange);
    const apr = calculateAPR(dailyReward, userLiq);
    const liquidityShare = (userLiq / totalLiq * 100).toFixed(1);
    const timeProgression = (BASE_LIQUIDITY_WEIGHT + (days / 365) * (1 - BASE_LIQUIDITY_WEIGHT)).toFixed(3);
    
    console.log(`Day ${days.toString().padStart(3)}: ${dailyReward.toFixed(2)} KILT/day | ${apr.toFixed(1)}% APR | ${liquidityShare}% share | ${timeProgression} time factor`);
});

// Scenario 4: Impact of In-Range Multiplier
console.log("\n" + "=".repeat(50));
console.log("SCENARIO 4: In-Range Impact ($1,000 in $50K pool, 90 days)");
console.log("=".repeat(50));

const inRangeScenarios = [
    { inRange: 0.0, description: "Out of Range" },
    { inRange: 0.3, description: "30% In-Range" },
    { inRange: 0.7, description: "70% In-Range" },
    { inRange: 1.0, description: "Always In-Range" }
];

inRangeScenarios.forEach(({ inRange, description }) => {
    const userLiq = 1000;
    const totalLiq = 50000;
    const days = 90;
    const dailyReward = calculateDailyReward(userLiq, totalLiq, days, inRange);
    const apr = calculateAPR(dailyReward, userLiq);
    
    console.log(`${description.padEnd(15)}: ${dailyReward.toFixed(2)} KILT/day | ${apr.toFixed(1)}% APR | ${(inRange * 100).toFixed(0)}% multiplier`);
});

// Pool size comparison
console.log("\n" + "=".repeat(50));
console.log("SCENARIO 5: Pool Size Impact ($1,000 position, 180 days)");
console.log("=".repeat(50));

const poolSizes = [
    { total: 25000, description: "Small Pool" },
    { total: 50000, description: "Medium Pool" },
    { total: 100000, description: "Large Pool" },
    { total: 200000, description: "Very Large Pool" }
];

poolSizes.forEach(({ total, description }) => {
    const userLiq = 1000;
    const days = 180;
    const inRange = 1.0;
    const dailyReward = calculateDailyReward(userLiq, total, days, inRange);
    const apr = calculateAPR(dailyReward, userLiq);
    const liquidityShare = (userLiq / total * 100).toFixed(1);
    
    console.log(`${description.padEnd(15)}: ${dailyReward.toFixed(2)} KILT/day | ${apr.toFixed(1)}% APR | ${liquidityShare}% share`);
});

console.log("\n" + "=".repeat(80));
console.log("KEY INSIGHTS:");
console.log("=".repeat(80));
console.log("1. TIME PROGRESSION: APR increases from 60% to 100% base over 365 days");
console.log("2. LIQUIDITY SHARE: Higher share of pool = higher absolute rewards");
console.log("3. IN-RANGE CRITICAL: Out-of-range positions get 0 rewards");
console.log("4. POOL SIZE MATTERS: Smaller pools = higher individual APRs");
console.log("5. FAIR DISTRIBUTION: All participants get proportional rewards");
console.log("=".repeat(80));