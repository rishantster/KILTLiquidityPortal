/**
 * POSITION LIFECYCLE SERVICE
 * Automatically manages position states for all users:
 * - Detects burned/closed positions and updates database
 * - Identifies positions needing Step 2 token collection
 * - Handles position state transitions dynamically
 */

import { storage } from "./storage";

interface PositionStateChange {
  tokenId: string;
  userId: number;
  oldState: 'active' | 'inactive' | 'unknown';
  newState: 'active' | 'inactive' | 'burned';
  needsStep2: boolean;
  reason: string;
}

class PositionLifecycleService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start automatic position lifecycle management
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Position Lifecycle Service started - monitoring all user positions');
    
    // Run initial check
    this.checkAllUserPositions();
    
    // Run every 2 minutes to detect position changes
    this.intervalId = setInterval(() => {
      this.checkAllUserPositions();
    }, 2 * 60 * 1000);
  }

  /**
   * Stop the automatic position lifecycle management
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Position Lifecycle Service stopped');
  }

  /**
   * Check positions for all users in the system
   */
  private async checkAllUserPositions() {
    try {
      console.log('🔍 Scanning all user positions for lifecycle changes...');
      
      // Get all users with registered positions
      const allUsers = await storage.getAllUsers();
      const usersWithPositions = [];
      
      for (const user of allUsers) {
        // Skip users with invalid wallet addresses
        if (!user.address || user.address === 'undefined' || !user.address.startsWith('0x')) {
          continue;
        }
        
        const positions = await storage.getLpPositionsByUserId(user.id);
        if (positions.length > 0) {
          usersWithPositions.push({
            user,
            positions: positions // Check ALL positions, not just active ones
          });
        }
      }
      
      console.log(`👥 Found ${usersWithPositions.length} users with ${usersWithPositions.reduce((sum, u) => sum + u.positions.length, 0)} active positions to check`);
      
      // Process users in batches to avoid overwhelming the blockchain
      const batchSize = 3;
      for (let i = 0; i < usersWithPositions.length; i += batchSize) {
        const batch = usersWithPositions.slice(i, i + batchSize);
        await Promise.all(batch.map(({ user, positions }) => 
          this.checkUserPositions(user.address, user.id, positions)
        ));
        
        // Small delay between batches
        if (i + batchSize < usersWithPositions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
    } catch (error) {
      console.error('❌ Error in position lifecycle check:', error);
    }
  }

  /**
   * Check positions for a specific user
   */
  private async checkUserPositions(userAddress: string, userId: number, dbPositions: any[]) {
    try {
      const { uniswapIntegrationService } = await import('./uniswap-integration-service');
      
      // Get current blockchain state
      const blockchainPositions = await uniswapIntegrationService.getUserPositions(userAddress);
      const blockchainPositionMap = new Map(
        blockchainPositions.map(p => [p.tokenId, p])
      );
      
      const stateChanges: PositionStateChange[] = [];
      
      // Check each registered position
      for (const dbPosition of dbPositions) {
        const tokenId = dbPosition.nftTokenId;
        const blockchainPosition = blockchainPositionMap.get(tokenId);
        
        if (!blockchainPosition) {
          // Position not found on blockchain - likely burned
          stateChanges.push({
            tokenId,
            userId,
            oldState: 'active',
            newState: 'burned',
            needsStep2: false,
            reason: 'Position not found on blockchain (burned/transferred)'
          });
        } else {
          // Position exists - check liquidity state AND USD value
          const hasLiquidity = blockchainPosition.liquidity && BigInt(blockchainPosition.liquidity) > 0n;
          const hasUnclaimedTokens = this.hasUnclaimedTokens(blockchainPosition);
          
          // Get current position from database to check USD value
          const dbPosition = dbPositions.find(p => p.nftTokenId === tokenId);
          const hasSignificantValue = dbPosition?.currentValueUSD && parseFloat(dbPosition.currentValueUSD.toString()) > 100;
          
          // UNIVERSAL FIX: Position should remain active if it has ANY USD value OR liquidity
          // This ensures ALL valid positions remain active for rewards
          const hasAnyValue = dbPosition?.currentValueUSD && parseFloat(dbPosition.currentValueUSD.toString()) > 0.01;
          
          if (hasLiquidity || hasAnyValue) {
            // Position has liquidity OR any meaningful value - keep it active for rewards
            console.log(`🔄 LIFECYCLE: Keeping position ${tokenId} active (liquidity: ${hasLiquidity}, value: $${dbPosition?.currentValueUSD})`);
            // CRITICAL: No state change needed - keep position active and reward eligible
            continue; // Skip to next position - don't mark as inactive
          } else if (!hasLiquidity && hasUnclaimedTokens) {
            // Position needs Step 2 completion
            stateChanges.push({
              tokenId,
              userId,
              oldState: 'active',
              newState: 'inactive',
              needsStep2: true,
              reason: 'Zero liquidity with unclaimed tokens (Step 2 needed)'
            });
          } else if (!hasLiquidity && !hasUnclaimedTokens) {
            // Position completely closed
            stateChanges.push({
              tokenId,
              userId,
              oldState: 'active',
              newState: 'inactive',
              needsStep2: false,
              reason: 'Position fully closed with no remaining tokens'
            });
          }
          // If hasLiquidity OR hasSignificantValue, position remains active - no change needed
        }
      }
      
      // Apply state changes
      if (stateChanges.length > 0) {
        await this.applyStateChanges(stateChanges);
      }
      
    } catch (error) {
      console.error(`❌ Error checking positions for user ${userAddress}:`, error);
    }
  }

  /**
   * Check if a position has unclaimed tokens (fees or remaining tokens)
   */
  private hasUnclaimedTokens(position: any): boolean {
    try {
      // Check if position has unclaimed fees
      if (position.fees) {
        const token0Fees = parseFloat(position.fees.token0 || '0');
        const token1Fees = parseFloat(position.fees.token1 || '0');
        if (token0Fees > 0 || token1Fees > 0) {
          return true;
        }
      }
      
      // Check for tokensOwed (remaining tokens after liquidity removal)
      if (position.tokensOwed0 && BigInt(position.tokensOwed0) > 0n) return true;
      if (position.tokensOwed1 && BigInt(position.tokensOwed1) > 0n) return true;
      
      return false;
    } catch (error) {
      console.warn(`⚠️ Error checking unclaimed tokens for position ${position.tokenId}:`, error);
      return false;
    }
  }

  /**
   * Apply detected state changes to the database
   */
  private async applyStateChanges(stateChanges: PositionStateChange[]) {
    try {
      console.log(`🔄 Applying ${stateChanges.length} position state changes:`);
      
      for (const change of stateChanges) {
        console.log(`   ${change.tokenId}: ${change.oldState} → ${change.newState} (${change.reason})`);
        
        if (change.newState === 'burned') {
          // Only burned positions should be fully deactivated
          await storage.updateLpPositionStatus(change.tokenId, false);
          await storage.updateLpPositionRewardEligibility(change.tokenId, false);
          console.log(`🔥 Position ${change.tokenId} marked as burned and ineligible for rewards`);
        } else if (change.newState === 'inactive') {
          // CRITICAL FIX: Don't mark positions with USD value as reward ineligible
          // Only update status but preserve reward eligibility for positions with value
          await storage.updateLpPositionStatus(change.tokenId, false);
          
          // Check if position has meaningful value before removing reward eligibility
          const position = await storage.getLpPositionByTokenId(change.tokenId);
          const hasValue = position?.currentValueUSD && parseFloat(position.currentValueUSD.toString()) > 0.01;
          
          if (!hasValue) {
            await storage.updateLpPositionRewardEligibility(change.tokenId, false);
            console.log(`❌ Position ${change.tokenId} marked as inactive and ineligible (no value)`);
          } else {
            console.log(`⚠️ Position ${change.tokenId} marked as inactive but kept reward eligible (value: $${position?.currentValueUSD})`);
          }
        }
        
        // Log Step 2 notifications for monitoring
        if (change.needsStep2) {
          console.log(`💡 Position ${change.tokenId} needs Step 2 completion - user will see notification in UI`);
        }
      }
      
      console.log(`✅ Successfully applied ${stateChanges.length} position state changes`);
      
    } catch (error) {
      console.error('❌ Error applying position state changes:', error);
    }
  }

  /**
   * Manually trigger position check for a specific user
   */
  async checkSpecificUser(userAddress: string) {
    try {
      const user = await storage.getUserByAddress(userAddress);
      if (!user) {
        console.log(`❌ User not found: ${userAddress}`);
        return;
      }
      
      const positions = await storage.getLpPositionsByUserId(user.id);
      const activePositions = positions.filter(p => p.isActive === true);
      
      if (activePositions.length === 0) {
        console.log(`📍 No active positions found for user ${userAddress}`);
        return;
      }
      
      console.log(`🔍 Checking ${activePositions.length} active positions for user ${userAddress}`);
      await this.checkUserPositions(userAddress, user.id, activePositions);
      
    } catch (error) {
      console.error(`❌ Error checking specific user ${userAddress}:`, error);
    }
  }

  /**
   * Get current service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.intervalId !== null
    };
  }
}

// Create singleton instance
export const positionLifecycleService = new PositionLifecycleService();

// Auto-start the service when the module is imported
positionLifecycleService.start();