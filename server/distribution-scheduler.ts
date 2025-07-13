import { automatedTokenDistribution } from './automated-token-distribution';

export class DistributionScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the automated distribution scheduler
   */
  start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      // Distribution scheduler is already running
      return;
    }

    // Starting distribution scheduler with configured intervals
    
    this.isRunning = true;
    
    // Run immediately on start
    this.runDistribution();
    
    // Schedule recurring distributions
    this.intervalId = setInterval(() => {
      this.runDistribution();
    }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds
  }

  /**
   * Stop the automated distribution scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    // Distribution scheduler stopped
  }

  /**
   * Run a single distribution cycle
   */
  private async runDistribution(): Promise<void> {
    try {
      // Running automated token distribution
      const results = await automatedTokenDistribution.processRewardDistributions();
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const totalAmount = results.reduce((sum, r) => sum + r.amount, 0);

      // Distribution completed with results recorded
      
      if (failed > 0) {
        console.warn(`${failed} distributions failed`);
        results.filter(r => !r.success).forEach(r => {
          console.error(`Failed to distribute ${r.amount} KILT to ${r.recipient}: ${r.error}`);
        });
      }
    } catch (error) {
      console.error('Error in distribution cycle:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; intervalId: NodeJS.Timeout | null } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId
    };
  }
}

export const distributionScheduler = new DistributionScheduler();