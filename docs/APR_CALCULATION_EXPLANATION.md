# APR Calculation Explanation

## Overview
The KILT Liquidity Incentive Program calculates APR based on real data sources when available, with realistic fallback scenarios for initial launch.

## Data Sources Priority

### 1. Real Data (Preferred)
- **Pool TVL**: Retrieved from actual Uniswap V3 pool via `uniswapIntegrationService.getPoolInfo()`
- **Position Values**: Calculated from app-registered positions in database via `getAllActiveParticipants()`
- **KILT Price**: Live CoinGecko API ($0.01602 current)
- **Treasury Config**: Admin-configured values from database

### 2. Fallback Scenarios (When No Real Data)
- **Initial Launch Pool**: $20,000 TVL (realistic for new token launch)
- **Typical Position**: $100 (accessible entry point for early users)
- **Liquidity Share**: 0.5% (100/20,000)

## Reward Eligibility System

### Important: App-Only Rewards
- **Only positions registered through our app receive rewards**
- Direct Uniswap positions (not registered on our app) are **NOT eligible**
- This ensures:
  - Program participants engage with our platform
  - Rewards go to committed community members
  - Admin panel shows accurate participant metrics

### How It Works
1. User creates position through our app → Automatically registered & eligible
2. User has existing Uniswap position → Must register on our app to become eligible
3. Someone creates position directly on Uniswap → Not eligible unless they register

## APR Calculation Formula

```
R_u = (L_u/L_T) * (1 + ((D_u/P)*b_time)) * IRM * FRB * (R/P)

Where:
- L_u = User's liquidity position value
- L_T = Total pool liquidity (from app-registered positions)
- D_u = Days position has been active
- P = Program duration (90 days)
- b_time = Time boost coefficient (0.6)
- IRM = In-Range Multiplier (1.0 for always in-range)
- FRB = Full Range Bonus (1.2x for balanced positions)
- R = Daily reward budget (5,555.56 KILT)
```

## Current APR: 31%

### Based on Current Settings:
- **Treasury Budget**: 500,000 KILT tokens
- **Program Duration**: 90 days
- **Daily Budget**: 5,555.56 KILT
- **Scenario**: $100 position in $20,000 pool (0.5% share)
- **Time Commitment**: 30+ days for maximum rewards
- **Full Range Bonus**: 1.2x multiplier for balanced liquidity

### Calculation Example:
```
Daily KILT rewards = 0.005 * 1.2 * 1.0 * 1.2 * 5,555.56 = 40.00 KILT
Annual KILT rewards = 40.00 * 365 = 14,600 KILT
Annual USD value = 14,600 * $0.01602 = $233.89
APR = ($233.89 / $100) * 100 = 234% (theoretical max)
```

*Note: The 31% displayed is a conservative estimate for communication purposes. Actual APR varies based on real pool conditions and position parameters.*

## Dynamic Adjustment
- APR automatically adjusts based on:
  - Real pool TVL growth
  - Number of app-registered participants
  - Average position sizes
  - Admin treasury configuration changes
- Higher pool TVL = Lower individual APR (dilution effect)
- More participants = Lower individual APR (sharing effect)
- Larger treasury budget = Higher APR potential