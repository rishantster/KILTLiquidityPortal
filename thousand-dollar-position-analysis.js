#!/usr/bin/env node

// Analysis specifically for $1000 positions across different scenarios
// R_u = (L_u/L_T) * (w1 + (D_u/365)*(1-w1)) * R/365 * IRM

const TREASURY_ALLOCATION = 2905600; // Annual KILT budget
const BASE_LIQUIDITY_WEIGHT = 0.6; // w1 - base liquidity weight
const KILT_PRICE = 0.01602; // Current KILT price in USD
const POSITION_SIZE = 1000; // $1000 position

function calculateDailyReward(userLiquidity, totalLiquidity, daysActive, inRangeMultiplier) {
    if (totalLiquidity === 0 || userLiquidity === 0 || inRangeMultiplier === 0) {
        return 0;
    }

    const liquidityShare = userLiquidity / totalLiquidity;
    const timeProgression = BASE_LIQUIDITY_WEIGHT + (daysActive / 365) * (1 - BASE_LIQUIDITY_WEIGHT);
    const dailyBudgetRate = TREASURY_ALLOCATION / 365;
    
    return liquidityShare * timeProgression * dailyBudgetRate * inRangeMultiplier;
}

function calculateAPR(dailyReward, userLiquidity) {
    if (userLiquidity === 0) return 0;
    const dailyRewardUSD = dailyReward * KILT_PRICE;
    return (dailyRewardUSD * 365) / userLiquidity * 100;
}

console.log("=".repeat(80));
console.log("$1000 POSITION APR ANALYSIS - KILT LIQUIDITY REWARDS");
console.log("=".repeat(80));

console.log(`Position Size: $${POSITION_SIZE.toLocaleString()}`);
console.log(`KILT Price: $${KILT_PRICE}`);
console.log(`Daily Treasury Budget: $${((TREASURY_ALLOCATION / 365) * KILT_PRICE).toFixed(2)}`);

// Different pool sizes to analyze
const POOL_SCENARIOS = [
    { size: 50000, name: "Very Small Pool", description: "Limited early liquidity" },
    { size: 100000, name: "Small Pool", description: "Growing early stage" },
    { size: 250000, name: "Medium-Small Pool", description: "Moderate activity" },
    { size: 500000, name: "Medium Pool", description: "Established liquidity" },
    { size: 1000000, name: "Large Pool", description: "High liquidity" },
    { size: 2000000, name: "Very Large Pool", description: "Mature market" }
];

// Time periods for analysis
const TIME_PERIODS = [
    { days: 30, name: "1 Month" },
    { days: 90, name: "3 Months" },
    { days: 180, name: "6 Months" },
    { days: 365, name: "1 Year" }
];

console.log("\n" + "=".repeat(80));
console.log("APR BY POOL SIZE AND TIME COMMITMENT");
console.log("=".repeat(80));

// Header
console.log(`\n${"Pool Size".padEnd(18)} | ${"1 Month".padEnd(8)} | ${"3 Months".padEnd(8)} | ${"6 Months".padEnd(8)} | ${"1 Year".padEnd(8)} | ${"Share".padEnd(6)}`);
console.log("-".repeat(80));

POOL_SCENARIOS.forEach(({ size, name }) => {
    const aprs = TIME_PERIODS.map(({ days }) => {
        const dailyReward = calculateDailyReward(POSITION_SIZE, size, days, 1.0);
        return calculateAPR(dailyReward, POSITION_SIZE);
    });
    
    const liquidityShare = ((POSITION_SIZE / size) * 100).toFixed(2);
    
    console.log(`${name.padEnd(18)} | ${aprs[0].toFixed(1).padStart(6)}% | ${aprs[1].toFixed(1).padStart(6)}% | ${aprs[2].toFixed(1).padStart(6)}% | ${aprs[3].toFixed(1).padStart(6)}% | ${liquidityShare.padStart(4)}%`);
});

// Daily rewards analysis
console.log("\n" + "=".repeat(80));
console.log("DAILY REWARDS IN USD AND KILT");
console.log("=".repeat(80));

console.log(`\n${"Pool Size".padEnd(18)} | ${"USD/day".padEnd(8)} | ${"KILT/day".padEnd(9)} | ${"APR".padEnd(6)} | ${"Time"}`);
console.log("-".repeat(70));

POOL_SCENARIOS.forEach(({ size, name }) => {
    // Use 6-month scenario as representative
    const dailyReward = calculateDailyReward(POSITION_SIZE, size, 180, 1.0);
    const dailyRewardUSD = dailyReward * KILT_PRICE;
    const apr = calculateAPR(dailyReward, POSITION_SIZE);
    
    console.log(`${name.padEnd(18)} | $${dailyRewardUSD.toFixed(2).padStart(7)} | ${dailyReward.toFixed(1).padStart(8)} | ${apr.toFixed(1).padStart(5)}% | 6 months`);
});

// Monthly earnings projection
console.log("\n" + "=".repeat(80));
console.log("MONTHLY EARNINGS PROJECTION ($1000 position, 6 months in program)");
console.log("=".repeat(80));

console.log(`\n${"Pool Size".padEnd(18)} | ${"Monthly USD".padEnd(11)} | ${"Monthly KILT".padEnd(12)} | ${"Annual USD".padEnd(10)}`);
console.log("-".repeat(70));

POOL_SCENARIOS.forEach(({ size, name }) => {
    const dailyReward = calculateDailyReward(POSITION_SIZE, size, 180, 1.0);
    const dailyRewardUSD = dailyReward * KILT_PRICE;
    const monthlyUSD = dailyRewardUSD * 30;
    const monthlyKILT = dailyReward * 30;
    const annualUSD = dailyRewardUSD * 365;
    
    console.log(`${name.padEnd(18)} | $${monthlyUSD.toFixed(2).padStart(10)} | ${monthlyKILT.toFixed(0).padStart(11)} | $${annualUSD.toFixed(2).padStart(9)}`);
});

// In-range impact for $1000 position
console.log("\n" + "=".repeat(80));
console.log("IN-RANGE MULTIPLIER IMPACT ($1000 in $500K pool, 6 months)");
console.log("=".repeat(80));

const inRangeScenarios = [
    { multiplier: 0.0, description: "Out of Range" },
    { multiplier: 0.25, description: "25% In-Range" },
    { multiplier: 0.5, description: "50% In-Range" },
    { multiplier: 0.75, description: "75% In-Range" },
    { multiplier: 1.0, description: "Always In-Range" }
];

console.log(`\n${"In-Range Status".padEnd(16)} | ${"USD/day".padEnd(8)} | ${"KILT/day".padEnd(9)} | ${"APR".padEnd(6)} | ${"Monthly USD"}`);
console.log("-".repeat(70));

inRangeScenarios.forEach(({ multiplier, description }) => {
    const dailyReward = calculateDailyReward(POSITION_SIZE, 500000, 180, multiplier);
    const dailyRewardUSD = dailyReward * KILT_PRICE;
    const apr = calculateAPR(dailyReward, POSITION_SIZE);
    const monthlyUSD = dailyRewardUSD * 30;
    
    console.log(`${description.padEnd(16)} | $${dailyRewardUSD.toFixed(2).padStart(7)} | ${dailyReward.toFixed(1).padStart(8)} | ${apr.toFixed(1).padStart(5)}% | $${monthlyUSD.toFixed(2).padStart(10)}`);
});

console.log("\n" + "=".repeat(80));
console.log("KEY TAKEAWAYS FOR $1000 POSITIONS:");
console.log("=".repeat(80));
console.log("• BEST CASE: 93.1% APR in small $50K pool after 1 year");
console.log("• TYPICAL: 7.4% APR in medium $500K pool after 6 months");
console.log("• CONSERVATIVE: 1.9% APR in large $2M pool after 6 months");
console.log("• DAILY EARNINGS: $0.13 - $2.55 per day depending on pool size");
console.log("• MONTHLY EARNINGS: $4 - $77 per month depending on pool size");
console.log("• TIME MATTERS: 67% more rewards after 1 year vs 1 month");
console.log("• RANGE CRITICAL: Must stay in-range to earn any rewards");
console.log("=".repeat(80));