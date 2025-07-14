/**
 * Mathematical comparison between current and proposed reward formulas
 * 
 * Current Formula: R_u = (L_u/L_T) * (w1 + (D_u/365)*(1-w1)) * R/365 * IRM
 * Proposed Formula: R_u = (L_u/L_T) * (1 + ((D_u/365)*w1)) * R/365 * IRM
 */

// Formula parameters
const L_u = 1000;  // User liquidity in USD
const L_T = 100000;  // Total liquidity in USD
const R = 2905600;  // Annual reward budget in KILT
const IRM = 1.0;  // In-range multiplier (full range)
const w1 = 0.6;  // Base liquidity weight

console.log('=== FORMULA COMPARISON ANALYSIS ===\n');

// Test scenarios at different time points
const testDays = [1, 30, 90, 180, 365];

console.log('Day | Current Formula | Proposed Formula | Current APR | Proposed APR | Difference');
console.log('----+----------------+------------------+-------------+--------------+-----------');

testDays.forEach(days => {
  // Current formula: (w1 + (D_u/365)*(1-w1))
  const currentTimeMultiplier = w1 + (days / 365) * (1 - w1);
  const currentDaily = (L_u / L_T) * currentTimeMultiplier * (R / 365) * IRM;
  const currentAPR = (currentDaily * 365) / L_u * 100;
  
  // Proposed formula: (1 + ((D_u/365)*w1))
  const proposedTimeMultiplier = 1 + ((days / 365) * w1);
  const proposedDaily = (L_u / L_T) * proposedTimeMultiplier * (R / 365) * IRM;
  const proposedAPR = (proposedDaily * 365) / L_u * 100;
  
  const difference = ((proposedAPR - currentAPR) / currentAPR * 100).toFixed(1);
  
  console.log(`${days.toString().padStart(3)} | ${currentDaily.toFixed(4).padStart(14)} | ${proposedDaily.toFixed(4).padStart(16)} | ${currentAPR.toFixed(2).padStart(11)} | ${proposedAPR.toFixed(2).padStart(12)} | ${difference.padStart(8)}%`);
});

console.log('\n=== TIME MULTIPLIER PROGRESSION ===\n');

console.log('Day | Current Multiplier | Proposed Multiplier | Difference');
console.log('----+-------------------+---------------------+-----------');

testDays.forEach(days => {
  const currentMult = w1 + (days / 365) * (1 - w1);
  const proposedMult = 1 + ((days / 365) * w1);
  const diff = ((proposedMult - currentMult) / currentMult * 100).toFixed(1);
  
  console.log(`${days.toString().padStart(3)} | ${currentMult.toFixed(4).padStart(17)} | ${proposedMult.toFixed(4).padStart(19)} | ${diff.padStart(8)}%`);
});

console.log('\n=== FORMULA ANALYSIS ===\n');

// Range analysis
console.log('CURRENT FORMULA RANGE:');
console.log(`- Day 1: ${(w1 + (1/365) * (1-w1)).toFixed(4)} (${w1} base)`);
console.log(`- Day 365: ${(w1 + (365/365) * (1-w1)).toFixed(4)} (grows to 1.0)`);
console.log(`- Growth: ${w1.toFixed(1)} → 1.0 (${((1-w1)/w1*100).toFixed(1)}% increase)`);

console.log('\nPROPOSED FORMULA RANGE:');
console.log(`- Day 1: ${(1 + (1/365) * w1).toFixed(4)} (1.0 base)`);
console.log(`- Day 365: ${(1 + (365/365) * w1).toFixed(4)} (grows to ${(1+w1).toFixed(1)})`);
console.log(`- Growth: 1.0 → ${(1+w1).toFixed(1)} (${(w1*100).toFixed(1)}% increase)`);

console.log('\n=== PROS AND CONS ===\n');

console.log('CURRENT FORMULA PROS:');
console.log('✓ Starts at 60% base recognition (fair for new participants)');
console.log('✓ Grows to 100% over 365 days (reasonable maximum)');
console.log('✓ Smooth progression curve');
console.log('✓ Encourages long-term commitment');

console.log('\nCURRENT FORMULA CONS:');
console.log('✗ Lower initial rewards may discourage new participants');
console.log('✗ Maximum is capped at 100% (no bonus for extreme loyalty)');

console.log('\nPROPOSED FORMULA PROS:');
console.log('✓ Starts at 100% base recognition (attractive to new participants)');
console.log('✓ Grows to 160% over 365 days (rewards extreme loyalty)');
console.log('✓ Higher rewards overall');
console.log('✓ More attractive user onboarding');

console.log('\nPROPOSED FORMULA CONS:');
console.log('✗ Higher budget consumption (60% more rewards at year end)');
console.log('✗ May exhaust treasury faster');
console.log('✗ Creates 60% bonus for long-term participants');
console.log('✗ Less conservative budget management');