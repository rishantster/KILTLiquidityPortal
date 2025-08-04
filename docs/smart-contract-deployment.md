# Smart Contract Deployment Guide

## DynamicTreasuryPool Contract

### Deployment Parameters
- **Network**: Base (Chain ID: 8453)
- **KILT Token**: `0x5d0dd05bb095fdd6af4865a1adf97c39c85ad2d8`
- **Owner**: `0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e`

### Contract Features
- Zero-restriction reward claiming
- Signature-based security validation
- Gas-optimized operations with unchecked arithmetic
- OpenZeppelin v5 compatible
- Reentrancy protection with pause functionality

### Post-Deployment Steps
1. Authorize backend calculator addresses
2. Deposit initial KILT treasury funds
3. Test signature generation and validation
4. Configure frontend with contract address

### Security Features
- Cryptographic signature validation
- Owner-only emergency controls
- Time-based replay protection (1-hour windows)
- CEI pattern for state changes

See `/contracts/DynamicTreasuryPool.sol` for complete implementation.