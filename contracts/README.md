# MultiTokenTreasuryPool Smart Contract Testing Guide

## Overview

This guide covers comprehensive testing of the MultiTokenTreasuryPool smart contract before deployment to Base network. The testing framework ensures all functionality works correctly and securely.

## Testing Framework

### Prerequisites

```bash
# Install dependencies
cd contracts
npm install

# Required packages:
# - hardhat: Ethereum development environment
# - @openzeppelin/contracts: Security-audited smart contract library
# - chai: Testing assertion library
# - ethers: Ethereum JavaScript library
```

### Test Structure

```
contracts/
├── test/
│   ├── MultiTokenTreasuryPool.test.js  # Comprehensive test suite
│   └── MockERC20.sol                   # Mock tokens for testing
├── scripts/
│   ├── deploy.js                       # Production deployment script
│   └── test-deployment.js              # Interactive test deployment
├── hardhat.config.js                   # Hardhat configuration
└── package.json                        # Dependencies and scripts
```

## Running Tests

### 1. Compile Contracts
```bash
npm run compile
```

### 2. Run Full Test Suite
```bash
npm run test
```

### 3. Run Tests with Gas Reporting
```bash
npm run test:gas
```

### 4. Run Coverage Analysis
```bash
npm run test:coverage
```

### 5. Interactive Test Deployment
```bash
# Start local Hardhat network
npm run node

# In another terminal, run interactive test
npm run deploy:local
```

## Test Coverage

### Core Functionality Tests

#### ✅ Deployment Tests
- Contract initialization
- Primary token setup
- Admin authorization
- Supported tokens list

#### ✅ Token Management Tests
- Adding supported tokens (WBTC, WETH, SOL, BNB, DOT)
- Removing tokens (emergency only)
- Duplicate token prevention
- Access control validation

#### ✅ Treasury Funding Tests
- Multi-token funding (KILT, WBTC, WETH)
- Admin authorization checks
- Unsupported token rejection
- Balance tracking accuracy

#### ✅ Position Registration Tests
- Uniswap V3 position registration
- Duplicate position prevention
- User position tracking
- Admin-only access control

#### ✅ Reward Management Tests
- Multi-token reward creation
- Lock period enforcement (7 days)
- Reward unlocking logic
- Treasury balance validation

#### ✅ Claim System Tests
- Batch claiming multiple tokens
- Lock period validation
- Duplicate claim prevention
- Balance transfer verification

#### ✅ Emergency Function Tests
- Contract pause/unpause
- Emergency withdrawal
- Admin management
- Lock period updates

#### ✅ View Function Tests
- Treasury balance queries
- Supported token listing
- User reward tracking
- Claimable reward calculation

### Security Tests

#### 🔒 Access Control
- Owner-only functions
- Admin-only functions
- User permission validation
- Unauthorized access prevention

#### 🔒 Reentrancy Protection
- ReentrancyGuard implementation
- Multiple call prevention
- State consistency validation

#### 🔒 Input Validation
- Zero address checks
- Amount validation
- Token support verification
- Lock period constraints

#### 🔒 Emergency Controls
- Pause functionality
- Emergency withdrawal limits
- Admin revocation capability

## Test Results Example

```
MultiTokenTreasuryPool
  ✓ Should set the correct primary token (45ms)
  ✓ Should authorize initial admin (38ms)
  ✓ Should add primary token to supported tokens (42ms)
  ✓ Should allow owner to add supported tokens (67ms)
  ✓ Should allow admin to fund treasury with KILT (89ms)
  ✓ Should allow admin to fund treasury with multiple tokens (156ms)
  ✓ Should allow admin to register positions (78ms)
  ✓ Should allow admin to add KILT rewards (94ms)
  ✓ Should allow admin to add multi-token rewards (245ms)
  ✓ Should allow claiming unlocked rewards (189ms)
  ✓ Should show correct claimable rewards (156ms)
  ✓ Should allow owner to emergency withdraw (123ms)
  ✓ Should allow owner to pause contract (67ms)

  33 passing (2.1s)
```

## Gas Usage Analysis

```
·--------------------------------|----------------------------|-------------|------|
|      Solc version: 0.8.19      ·  Optimizer enabled: true   ·  Runs: 200  ·      │
·································|····························|·············|······│
|  Methods                       ·               Gas Usage     ·             ·      │
·················|···············|·············|··············|·············|······│
|  Contract      ·  Method       ·  Min        ·  Max         ·  Avg        ·  #   │
·················|···············|·············|··············|·············|······│
|  Treasury      ·  addReward    ·      89,234  ·     106,234  ·     97,734  ·  12  │
·················|···············|·············|··············|·············|······│
|  Treasury      ·  claimRewards ·     134,567  ·     187,423  ·    160,995  ·   8  │
·················|···············|·············|··············|·············|······│
|  Treasury      ·  fundTreasury ·      67,890  ·      89,456  ·     78,673  ·  15  │
·················|···············|·············|··············|·············|······│
```

## Local Testing Environment

### Start Local Network
```bash
# Terminal 1: Start Hardhat network
npx hardhat node

# Terminal 2: Deploy and test
npm run deploy:local
```

### Test with Forked Base Network
```bash
# Set environment variables
export BASE_RPC_URL="https://mainnet.base.org"
export FORK_BLOCK_NUMBER="latest"

# Run tests against forked network
npx hardhat test --network hardhat
```

## Pre-Deployment Checklist

### ✅ Contract Validation
- [ ] All tests passing (33/33)
- [ ] Gas usage within acceptable limits
- [ ] No security vulnerabilities detected
- [ ] Code coverage > 95%

### ✅ Integration Testing
- [ ] Mock token interactions working
- [ ] Multi-token reward flow complete
- [ ] Emergency functions operational
- [ ] Access controls enforced

### ✅ Configuration Verification
- [ ] KILT token address correct
- [ ] Admin addresses authorized
- [ ] Lock period configured (7 days)
- [ ] Supported tokens added

### ✅ Documentation Complete
- [ ] Deployment guide updated
- [ ] API documentation current
- [ ] Security considerations documented
- [ ] Upgrade procedures defined

## Deployment to Base Network

Once all tests pass successfully:

```bash
# Set environment variables
export PRIVATE_KEY="your_private_key"
export BASE_RPC_URL="https://mainnet.base.org"
export INITIAL_ADMIN_ADDRESS="0x..."
export BASESCAN_API_KEY="your_api_key"

# Deploy to Base
npm run deploy:base

# Verify contract on BaseScan
npm run verify:base -- CONTRACT_ADDRESS
```

## Post-Deployment Testing

After deployment to Base network:

1. **Verify Contract Source**: Check BaseScan verification
2. **Test Admin Functions**: Add tokens, fund treasury
3. **Register Test Position**: Small liquidity amount
4. **Add Test Reward**: Minimal KILT amount
5. **Validate Treasury**: Check balances and security

The smart contract is thoroughly tested and ready for production deployment when all tests pass successfully! 🚀

## Support

For questions or issues with testing:
- Review test logs for specific failures
- Check Hardhat documentation for environment issues
- Verify OpenZeppelin contract versions
- Ensure Base network RPC connectivity