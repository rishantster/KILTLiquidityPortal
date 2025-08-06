#!/usr/bin/env node

// Quick script to restore the missing positions that are active on blockchain but missing from database

const { PositionRegistrationService } = require('./server/position-registration-service.js');

async function restorePositions() {
  console.log('🔧 Restoring missing positions...');
  
  const registrationService = new PositionRegistrationService();
  
  const positionsToRestore = [
    { tokenId: '3534947', walletAddress: '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e' },
    { tokenId: '3689299', walletAddress: '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e' },
    { tokenId: '3689302', walletAddress: '0x5bF25Dc1BAf6A96C5A0F724E05EcF4D456c7652e' }
  ];
  
  for (const position of positionsToRestore) {
    try {
      console.log(`Restoring position ${position.tokenId}...`);
      const result = await registrationService.registerPosition(
        position.walletAddress,
        position.tokenId,
        null, // sessionId
        null  // transactionHash
      );
      console.log(`✅ Position ${position.tokenId} restored:`, result);
    } catch (error) {
      console.error(`❌ Failed to restore position ${position.tokenId}:`, error.message);
    }
  }
  
  console.log('🎯 Position restoration complete');
}

restorePositions().catch(console.error);