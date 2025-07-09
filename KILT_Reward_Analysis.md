# KILT Liquidity Incentive Program - Reward Scenarios Analysis

## Executive Summary

This analysis covers 26 different scenarios for the KILT Top 100 ranking system, showing how rewards are distributed based on:
- **Liquidity Amount**: $1,000 to $1,000,000
- **Days Active**: 1 to 365 days
- **Ranking Position**: 1 to 100+

**Key Findings:**
- **Best Case APR**: 233.60% (Small Veteran with $5K, 365 days, rank 50)
- **Worst Case APR**: 0.0% (Outside top 100)
- **Most Realistic APR**: 3-7% for medium positions

## Formula Used
```
R_u = (w1 × L_u/T_top100 + w2 × D_u/365) × R/365/100 × (1 - (rank-1)/99)
```

## Scenario Categories

### 🏆 BEST CASE SCENARIOS (Ranks 1-10)

#### 1. **Early Adopter Whale** (Rank #1)
- **Liquidity**: $500,000
- **Days Active**: 365 days
- **Daily Rewards**: 43.78 KILT
- **Effective APR**: 3.20%
- **90-Day Accumulation**: 3,940 KILT ($63.13)

#### 2. **Whale Newcomer** (Rank #1)
- **Liquidity**: $1,000,000
- **Days Active**: 30 days
- **Daily Rewards**: 26.43 KILT
- **Effective APR**: 0.96%
- **Key Insight**: Large liquidity compensates for short time

#### 3. **Small Veteran** (Rank #50)
- **Liquidity**: $5,000
- **Days Active**: 365 days
- **Daily Rewards**: 32.00 KILT
- **Effective APR**: 233.60%
- **Key Insight**: Time factor creates exceptional returns for small long-term positions

### 📊 AVERAGE CASE SCENARIOS (Ranks 30-50)

#### 4. **Balanced Portfolio** (Rank #45)
- **Liquidity**: $55,000
- **Days Active**: 105 days
- **Daily Rewards**: 10.51 KILT
- **Effective APR**: 6.97%
- **90-Day Accumulation**: 946 KILT ($15.17)

#### 5. **Average Case** (Rank #30)
- **Liquidity**: $80,000
- **Days Active**: 90 days
- **Daily Rewards**: 9.87 KILT
- **Effective APR**: 4.50%

### 📉 WORST CASE SCENARIOS (Ranks 90-100+)

#### 6. **Worst Case** (Rank #100)
- **Liquidity**: $10,000
- **Days Active**: 5 days
- **Daily Rewards**: 0.56 KILT
- **Effective APR**: 2.04%
- **90-Day Accumulation**: 50 KILT ($0.81)

#### 7. **Outside Top 100** (Rank #101)
- **Liquidity**: $25,000
- **Days Active**: 100 days
- **Daily Rewards**: 0.0 KILT
- **Effective APR**: 0.0%
- **Key Insight**: No rewards outside top 100

## Key Insights

### 🎯 Optimal Strategies

1. **Early Entry Advantage**: Join early to accumulate days active
2. **Size Matters**: Larger liquidity = better ranking
3. **Time Multiplier**: Long-term positions get exponentially better rewards
4. **Ranking Competition**: Stay in top 100 to earn anything

### 📈 APR Distribution Patterns

- **Ranks 1-10**: 0.9% - 21.8% APR
- **Ranks 11-30**: 3.2% - 7.2% APR  
- **Ranks 31-60**: 2.7% - 6.8% APR
- **Ranks 61-90**: 3.8% - 4.1% APR
- **Ranks 91-100**: 2.0% - 227.9% APR (wide variance)

### 🔄 Replacement Mechanism

Users outside top 100 must have:
`L_new × D_new > L_100 × D_100`

**Example**: To replace rank #100 with $2,500 × 180 days = 450,000 score
- New user needs: $25,000 × 20 days = 500,000 score ✅

### 💰 Treasury Economics

- **Daily Budget**: 7,960 KILT
- **Per User Average**: ~79.6 KILT
- **Actual Distribution**: Heavily skewed toward top ranks
- **90-Day Lock**: All rewards locked for 90 days

## Realistic Scenarios for Different User Types

### Small Retail Investor ($1,000 - $10,000)
- **Best Case**: Stay active 365 days, achieve rank 80-100
- **Expected APR**: 2% - 228%
- **Strategy**: Focus on time factor since liquidity is limited

### Medium Investor ($10,000 - $100,000)
- **Best Case**: Achieve rank 20-60 with 60+ days
- **Expected APR**: 3% - 7%
- **Strategy**: Balance liquidity size with time commitment

### Large Investor ($100,000+)
- **Best Case**: Secure top 20 ranking
- **Expected APR**: 1% - 22%
- **Strategy**: Maximize liquidity amount for guaranteed ranking

## Risk Factors

1. **Replacement Risk**: Can be pushed out by larger positions
2. **Time Decay**: New entrants start with 0 days active
3. **Liquidity Competition**: Rankings change as others add/remove liquidity
4. **90-Day Lock**: Cannot access rewards immediately

## Conclusion

The KILT Top 100 system creates a competitive environment where:
- **Early adopters** get significant time advantages
- **Large positions** secure better rankings
- **Long-term commitment** is heavily rewarded
- **Small positions** can achieve high APRs through time
- **Outside top 100** = zero rewards

This design incentivizes both liquidity size and long-term participation, creating a sustainable liquidity mining program.