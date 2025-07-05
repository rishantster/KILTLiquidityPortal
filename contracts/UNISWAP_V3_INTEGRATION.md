# Real Uniswap V3 Contract Integration

This document outlines the comprehensive Uniswap V3 contract integration implemented for the KILT Liquidity Incentive Portal, providing real NFT position management capabilities using official Uniswap V3 contracts on Base network.

## Contract Addresses (Base Network)

- **NonfungiblePositionManager**: `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`
- **Factory**: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`
- **V3Staker**: `0x42bE4D6527829FeFA1493e1fb9F3676d2425C3C1`
- **KILT Token**: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8`
- **WETH**: `0x4200000000000000000000000000000000000006`

## Key Features

### NFT Position Management
- Complete lifecycle management for Uniswap V3 LP NFT positions
- Real-time position discovery and filtering for KILT/ETH pairs
- Position operations: mint, increase/decrease liquidity, collect fees, burn
- Comprehensive position data including liquidity, ticks, and accumulated fees

### Token Integration
- Real-time balance tracking for KILT and WETH
- Approval management for both ERC20 tokens and NFT positions
- Gas-optimized transaction batching and simulation

### Pool Integration
- Live pool data retrieval from Uniswap V3 contracts
- Current tick, liquidity, and fee tier information
- Pool existence validation and status monitoring

## Technical Implementation

The integration uses Viem for type-safe contract interactions with React Query for intelligent caching and state management. All contract addresses are verified and match official Uniswap deployments on Base network.

## Security Features

- Transaction simulation before execution
- Comprehensive error handling with user-friendly messages
- Granular approval management
- Contract verification on Basescan