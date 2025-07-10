# Uniswap V3 APR Excel Model - Complete Logic Dump

## Overview
This document provides the complete mathematical formulas and logic for calculating Uniswap V3 APR in Excel format.

## Excel Model Structure

### Sheet 1: Input Parameters
```
A1: Position Parameters
A2: Position Value (USD)         | B2: [INPUT: 10000]
A3: Min Price                    | B3: [INPUT: 0.008]
A4: Max Price                    | B4: [INPUT: 0.024]
A5: Fee Rate                     | B5: [INPUT: 0.003]
A6: Days Active                  | B6: [INPUT: 30]

A8: Pool Parameters
A9: Pool Volume 24h (USD)        | B9: [INPUT: 50000]
A10: Pool TVL (USD)              | B10: [INPUT: 500000]
A11: Current Price               | B11: [INPUT: 0.016]

A13: Incentive Parameters
A14: Daily Incentive Budget      | B14: [INPUT: 7960]
A15: Total Program Liquidity     | B15: [INPUT: 500000]
A16: Liquidity Weight           | B16: [INPUT: 0.6]
A17: Time Weight                | B17: [INPUT: 0.4]
A18: Program Duration (days)     | B18: [INPUT: 365]
```

### Sheet 2: Calculations

#### A. Basic Calculations
```
A1: Basic Metrics
A2: Liquidity Share              | B2: =B2/B10
A3: Time Factor                  | B3: =MIN(B6/B18, 1)
A4: Is In Range                  | B4: =AND(B11>=B3, B11<=B4)
A5: Days In Range (Historical)   | B5: [INPUT: 25]
A6: Time In Range Ratio          | B6: =B5/B6
```

#### B. Concentration Factor Calculation
```
A8: Concentration Factor
A9: Price Range                  | B9: =B4-B3
A10: Full Range Equivalent       | B10: =B11*2
A11: Concentration Factor        | B11: =MIN(MAX(B10/B9, 1), 10)
```

#### C. Trading Fee APR Calculation
```
A13: Trading Fee APR
A14: Daily Fee Share             | B14: =B9*B5*B2*B6*B11
A15: Annual Fee Earnings         | B15: =B14*365
A16: Trading Fee APR (%)         | B16: =(B15/B2)*100
```

#### D. Incentive APR Calculation
```
A18: Incentive APR
A19: Liquidity Component        | B19: =B16*B2
A20: Time Component             | B20: =B17*B3
A21: Base Component             | B21: =B19+B20
A22: Daily Incentive Rewards    | B22: =B21*B14
A23: Annual Incentive Rewards   | B23: =B22*365
A24: Incentive APR (%)          | B24: =(B23/B2)*100
```

#### E. Total APR
```
A26: Total APR
A27: Trading Fee APR            | B27: =B16
A28: Incentive APR              | B28: =B24
A29: Total APR (%)              | B29: =B27+B28
```

### Sheet 3: Advanced Formulas

#### A. Time-in-Range Historical Analysis
```
A1: Time-in-Range Analysis
A2: Day                         | B2: Price      | C2: In Range   | D2: Weight
A3: 1                          | B3: 0.015      | C3: =AND(B3>=Input!B3, B3<=Input!B4) | D3: 1
A4: 2                          | B4: 0.017      | C4: =AND(B4>=Input!B3, B4<=Input!B4) | D4: 1
...
A32: 30                        | B32: 0.014     | C32: =AND(B32>=Input!B3, B32<=Input!B4) | D32: 1

A34: Time-in-Range Ratio       | B34: =AVERAGE(C3:C32)
```

#### B. Concentration Factor by Range Strategy
```
A1: Range Strategy Analysis
A2: Strategy                   | B2: Min Price  | C2: Max Price  | D2: Concentration
A3: Narrow (±25%)             | B3: =Input!B11*0.75 | C3: =Input!B11*1.25 | D3: =MIN(MAX((Input!B11*2)/(C3-B3), 1), 10)
A4: Balanced (±50%)           | B4: =Input!B11*0.5  | C4: =Input!B11*1.5  | D4: =MIN(MAX((Input!B11*2)/(C4-B4), 1), 10)
A5: Wide (±100%)              | B5: =Input!B11*0.01 | C5: =Input!B11*2    | D5: =MIN(MAX((Input!B11*2)/(C5-B5), 1), 10)
A6: Full Range                | B6: 0               | C6: 999999          | D6: 1
```

#### C. Dynamic APR Calculation
```
A1: Dynamic APR Model
A2: Volume Scenario            | B2: Low (25K)  | C2: Med (50K)  | D2: High (100K)
A3: Trading Fee APR           | B3: =(B2*Input!B5*Calc!B2*Calc!B6*Calc!B11*365)/Input!B2*100
A4: Trading Fee APR           | C4: =(C2*Input!B5*Calc!B2*Calc!B6*Calc!B11*365)/Input!B2*100
A5: Trading Fee APR           | D5: =(D2*Input!B5*Calc!B2*Calc!B6*Calc!B11*365)/Input!B2*100
```

## Complete Excel Formulas

### Master Formula for Total APR
```excel
=((PoolVolume24h * FeeRate * LiquidityShare * TimeInRangeRatio * ConcentrationFactor * 365) / PositionValue * 100) + 
 ((((LiquidityWeight * LiquidityShare) + (TimeWeight * TimeFactor)) * DailyIncentiveBudget * 365) / PositionValue * 100)
```

### Cell References Version
```excel
=((B9*B5*B2*B6*B11*365)/B2*100) + ((((B16*B2)+(B17*B3))*B14*365)/B2*100)
```

## Key Formulas Breakdown

### 1. Liquidity Share
```excel
=PositionValue / PoolTVL
=B2/B10
```

### 2. Time-in-Range Ratio
```excel
=DaysInRange / TotalDays
=B5/B6
```

### 3. Concentration Factor
```excel
=MIN(MAX((CurrentPrice*2)/(MaxPrice-MinPrice), 1), 10)
=MIN(MAX((B11*2)/(B4-B3), 1), 10)
```

### 4. Trading Fee Daily Earnings
```excel
=PoolVolume24h * FeeRate * LiquidityShare * TimeInRangeRatio * ConcentrationFactor
=B9*B5*B2*B6*B11
```

### 5. Incentive Daily Rewards
```excel
=((LiquidityWeight * LiquidityShare) + (TimeWeight * TimeFactor)) * DailyIncentiveBudget
=((B16*B2)+(B17*B3))*B14
```

### 6. APR Calculation
```excel
=(DailyEarnings * 365) / PositionValue * 100
```

## Excel Model Validation

### Test Cases
```
A1: Test Case                  | B1: Expected APR | C1: Calculated APR | D1: Difference
A2: Narrow Range, High Volume  | B2: 45%         | C2: [Formula]      | D2: =C2-B2
A3: Balanced Range, Med Volume | B3: 25%         | C3: [Formula]      | D3: =C3-B3
A4: Wide Range, Low Volume     | B4: 15%         | C4: [Formula]      | D4: =C4-B4
A5: Full Range, Med Volume     | B5: 8%          | C5: [Formula]      | D5: =C5-B5
```

## Advanced Excel Features

### 1. Dynamic Charts
Create charts that update based on:
- Volume scenarios
- Price range strategies
- Time-in-range variations

### 2. Scenario Analysis
```excel
=SCENARIOS(Volume: {25000, 50000, 100000}, TimeInRange: {0.5, 0.7, 0.9}, ConcentrationFactor: {1, 2, 4})
```

### 3. Sensitivity Analysis
```excel
=SENSITIVITY(APR, {Volume, TimeInRange, ConcentrationFactor}, {±20%, ±30%, ±50%})
```

## Data Validation Rules

### Input Validation
```excel
Position Value: >0
Min Price: >0
Max Price: >Min Price
Fee Rate: 0.0005, 0.003, or 0.01
Days Active: >=0
Pool Volume: >0
Pool TVL: >0
Time In Range: 0-1
```

### Calculation Checks
```excel
Liquidity Share: 0-1
Time Factor: 0-1
Concentration Factor: 1-10
APR: 0-200%
```

## Implementation Notes

1. **Data Sources**: Pool metrics should come from Uniswap V3 subgraph or direct contract calls
2. **Time-in-Range**: Use historical price data for accurate calculations
3. **Concentration Factor**: Cap at 10x to prevent unrealistic values
4. **APR Caps**: Implement reasonable caps (e.g., 200% max APR)
5. **Error Handling**: Use IFERROR() for division by zero and invalid inputs

This Excel model provides a complete framework for calculating and analyzing Uniswap V3 APR with both trading fees and incentive rewards.