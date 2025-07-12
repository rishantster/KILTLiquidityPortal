/**
 * REWARD CALCULATION DEMONSTRATION
 * 
 * This file demonstrates the critical fix for the reward calculation vulnerability
 * where dust positions could dominate rewards through exploitative time factors.
 */

interface RewardScenario {
  name: string;
  investment: number;
  poolSize: number;
  daysActive: number;
}

interface RewardComparison {
  scenario: RewardScenario;
  oldFormula: {
    liquidityWeight: number;
    timeWeight: number;
    totalScore: number;
    dailyRewards: number;
  };
  newFormula: {
    liquidityWeight: number;
    timeCoefficient: number;
    totalScore: number;
    dailyRewards: number;
  };
  improvement: {
    ratioToLargePosition: number;
    exploitationReduction: number;
  };
}

export class RewardCalculationDemo {
  private readonly DAILY_BUDGET = 7960; // KILT per day
  private readonly PROGRAM_DURATION_DAYS = 365;
  
  // Old formula parameters (BROKEN)
  private readonly OLD_LIQUIDITY_WEIGHT = 0.6;
  private readonly OLD_TIME_WEIGHT = 0.4;
  
  // New formula parameters (FIXED)
  private readonly MIN_TIME_COEFFICIENT = 0.6;
  private readonly MAX_TIME_COEFFICIENT = 1.0;

  /**
   * Demonstrate the vulnerability and fix
   */
  demonstrateVulnerabilityFix(): RewardComparison[] {
    const scenarios: RewardScenario[] = [
      {
        name: "Large Position (User A)",
        investment: 10000,
        poolSize: 100000,
        daysActive: 365
      },
      {
        name: "Dust Position (User B)",
        investment: 0.01,
        poolSize: 100000,
        daysActive: 365
      },
      {
        name: "Dust Position (55 days)",
        investment: 0.01,
        poolSize: 100000,
        daysActive: 55
      }
    ];

    return scenarios.map(scenario => this.compareRewardFormulas(scenario));
  }

  /**
   * Compare old vs new formula for a scenario
   */
  private compareRewardFormulas(scenario: RewardScenario): RewardComparison {
    const liquidityWeight = scenario.investment / scenario.poolSize;
    const timeRatio = Math.min(scenario.daysActive / this.PROGRAM_DURATION_DAYS, 1);
    
    // OLD FORMULA (BROKEN): Additive time factor
    // R_u = (w1 * L_u/T_total + w2 * D_u/365) * R/365
    const oldTimeWeight = timeRatio;
    const oldTotalScore = (this.OLD_LIQUIDITY_WEIGHT * liquidityWeight + this.OLD_TIME_WEIGHT * oldTimeWeight);
    const oldDailyRewards = oldTotalScore * this.DAILY_BUDGET;
    
    // NEW FORMULA (FIXED): Multiplicative time coefficient
    // R_u = (L_u/T_total) * timeCoefficient * R/365
    const newTimeCoefficient = this.MIN_TIME_COEFFICIENT + 
      ((this.MAX_TIME_COEFFICIENT - this.MIN_TIME_COEFFICIENT) * timeRatio);
    const newTotalScore = liquidityWeight * newTimeCoefficient;
    const newDailyRewards = newTotalScore * this.DAILY_BUDGET;
    
    return {
      scenario,
      oldFormula: {
        liquidityWeight: Math.round(liquidityWeight * 10000) / 10000,
        timeWeight: Math.round(oldTimeWeight * 10000) / 10000,
        totalScore: Math.round(oldTotalScore * 10000) / 10000,
        dailyRewards: Math.round(oldDailyRewards * 10000) / 10000
      },
      newFormula: {
        liquidityWeight: Math.round(liquidityWeight * 10000) / 10000,
        timeCoefficient: Math.round(newTimeCoefficient * 10000) / 10000,
        totalScore: Math.round(newTotalScore * 10000) / 10000,
        dailyRewards: Math.round(newDailyRewards * 10000) / 10000
      },
      improvement: {
        ratioToLargePosition: 0, // Will be calculated in comparison
        exploitationReduction: Math.round(((oldDailyRewards - newDailyRewards) / oldDailyRewards) * 10000) / 100
      }
    };
  }

  /**
   * Generate detailed vulnerability report
   */
  generateVulnerabilityReport(): string {
    const comparisons = this.demonstrateVulnerabilityFix();
    const [largePos, dustPos, dustPos55] = comparisons;
    
    // Calculate exploitation ratios
    dustPos.improvement.ratioToLargePosition = Math.round((dustPos.oldFormula.dailyRewards / largePos.oldFormula.dailyRewards) * 10000) / 100;
    dustPos55.improvement.ratioToLargePosition = Math.round((dustPos55.oldFormula.dailyRewards / largePos.oldFormula.dailyRewards) * 10000) / 100;
    
    return `
=== REWARD CALCULATION VULNERABILITY REPORT ===

PROBLEM IDENTIFIED:
- Additive time factor allows dust positions to dominate rewards
- User staking $0.01 can earn ~90% of rewards compared to $10,000 staker
- Incentivizes creation of thousands of dust positions to exploit system

SCENARIO ANALYSIS:
${this.formatScenarioReport(largePos)}
${this.formatScenarioReport(dustPos)}
${this.formatScenarioReport(dustPos55)}

CRITICAL VULNERABILITY:
- Dust position ($0.01) earns ${dustPos.improvement.ratioToLargePosition}% of large position ($10,000) rewards
- After only 55 days, dust position earns ${dustPos55.improvement.ratioToLargePosition}% of large position rewards
- Time factor becomes larger than liquidity factor in just 55 days

SOLUTION IMPLEMENTED:
✅ Changed from additive to multiplicative time factor
✅ Time coefficient ranges from 60% to 100% of liquidity recognition
✅ Prevents dust position exploitation
✅ Maintains fair rewards for legitimate participants

SECURITY IMPROVEMENT:
- Dust position exploitation reduced by ${dustPos.improvement.exploitationReduction}%
- Rewards now properly proportional to actual liquidity contribution
- Gaming resistance increased by >90%

FORMULA CHANGE:
OLD: R_u = (w1 * L_u/T_total + w2 * D_u/365) * R/365
NEW: R_u = (L_u/T_total) * timeCoefficient * R/365

Where timeCoefficient = 0.6 + (0.4 * min(days/365, 1))
`;
  }

  /**
   * Format scenario report
   */
  private formatScenarioReport(comparison: RewardComparison): string {
    const { scenario, oldFormula, newFormula, improvement } = comparison;
    
    return `
${scenario.name}:
  Investment: $${scenario.investment.toLocaleString()}
  Pool Share: ${(scenario.investment / scenario.poolSize * 100).toFixed(4)}%
  Days Active: ${scenario.daysActive}
  
  OLD (Broken):
    Liquidity Weight: ${oldFormula.liquidityWeight}
    Time Weight: ${oldFormula.timeWeight}
    Total Score: ${oldFormula.totalScore}
    Daily Rewards: ${oldFormula.dailyRewards.toLocaleString()} KILT
  
  NEW (Fixed):
    Liquidity Weight: ${newFormula.liquidityWeight}
    Time Coefficient: ${newFormula.timeCoefficient}
    Total Score: ${newFormula.totalScore}
    Daily Rewards: ${newFormula.dailyRewards.toLocaleString()} KILT
  
  Improvement: ${improvement.exploitationReduction}% exploitation reduction
`;
  }
}

// Export instance for testing
export const rewardCalculationDemo = new RewardCalculationDemo();