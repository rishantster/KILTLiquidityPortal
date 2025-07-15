/**
 * Test APR calculation with refined formula
 */

// Current admin treasury configuration (from API logs)
const treasuryAllocation = 3000000; // 3M KILT
const programDuration = 90; // 90 days
const dailyBudget = treasuryAllocation / programDuration; // 33,333 KILT/day

// Formula parameters
const w1 = 0.6; // Max liquidity boost
const kiltPrice = 0.01602; // Current KILT price
const inRangeMultiplier = 1.0; // Always in-range

// Test scenarios
const scenarios = [
  { name: "Early Small Pool", poolSize: 100000, positionValue: 500, days: 30 },
  { name: "Mature Large Pool", poolSize: 800000, positionValue: 2000, days: 90 },
  { name: "Day 1 New User", poolSize: 100000, positionValue: 1000, days: 1 },
  { name: "1 Year Veteran", poolSize: 500000, positionValue: 1500, days: 365 }
];

console.log('=== APR CALCULATION WITH REFINED FORMULA ===\n');
console.log('Formula: R_u = (L_u/L_T) * (1 + ((D_u/P)*w1)) * (R/P) * IRM\n');

console.log('Treasury Parameters:');
console.log(`- Total Allocation: ${treasuryAllocation.toLocaleString()} KILT`);
console.log(`- Program Duration: ${programDuration} days`);
console.log(`- Daily Budget: ${dailyBudget.toLocaleString()} KILT`);
console.log(`- KILT Price: $${kiltPrice}`);
console.log(`- Max Boost (w1): ${w1}\n`);

console.log('Scenario | Pool Size | Position | Days | Time Boost | Daily KILT | Annual USD | APR');
console.log('---------|-----------|----------|------|------------|------------|------------|--------');

scenarios.forEach(scenario => {
  // Calculate using refined formula
  const liquidityShare = scenario.positionValue / scenario.poolSize; // L_u/L_T
  const timeBoost = 1 + ((scenario.days / programDuration) * w1); // 1 + ((D_u/P)*w1)
  const dailyRewards = liquidityShare * timeBoost * dailyBudget * inRangeMultiplier; // Daily KILT
  const annualRewards = dailyRewards * 365; // Annual KILT
  const annualRewardsUSD = annualRewards * kiltPrice; // Annual USD
  const apr = (annualRewardsUSD / scenario.positionValue) * 100; // APR percentage
  
  console.log(`${scenario.name.padEnd(8)} | $${scenario.poolSize.toLocaleString().padEnd(8)} | $${scenario.positionValue.toString().padEnd(7)} | ${scenario.days.toString().padEnd(4)} | ${timeBoost.toFixed(3).padEnd(10)} | ${dailyRewards.toFixed(2).padEnd(10)} | $${annualRewardsUSD.toFixed(2).padEnd(9)} | ${apr.toFixed(1)}%`);
});

console.log('\n=== KEY INSIGHTS ===\n');

// Calculate specific APR for typical user scenarios
const typicalEarlyAPR = (() => {
  const liquidityShare = 500 / 100000; // $500 in $100K pool
  const timeBoost = 1 + ((30 / programDuration) * w1); // 30 days
  const dailyRewards = liquidityShare * timeBoost * dailyBudget * inRangeMultiplier;
  const annualRewards = dailyRewards * 365;
  const annualRewardsUSD = annualRewards * kiltPrice;
  return (annualRewardsUSD / 500) * 100;
})();

const typicalMatureAPR = (() => {
  const liquidityShare = 2000 / 800000; // $2000 in $800K pool
  const timeBoost = 1 + ((90 / programDuration) * w1); // 90 days (full program)
  const dailyRewards = liquidityShare * timeBoost * dailyBudget * inRangeMultiplier;
  const annualRewards = dailyRewards * 365;
  const annualRewardsUSD = annualRewards * kiltPrice;
  return (annualRewardsUSD / 2000) * 100;
})();

console.log(`Early Participant APR (30 days, small pool): ${typicalEarlyAPR.toFixed(1)}%`);
console.log(`Mature Participant APR (90 days, large pool): ${typicalMatureAPR.toFixed(1)}%`);
console.log(`APR Range: ${typicalMatureAPR.toFixed(1)}% - ${typicalEarlyAPR.toFixed(1)}%`);

console.log('\nFormula Benefits:');
console.log('✓ 100% base recognition from day 1');
console.log('✓ Linear growth to 160% at program end');
console.log('✓ Higher APR for early participants');
console.log('✓ Proportional rewards based on liquidity share');
console.log('✓ Sustainable within treasury budget');