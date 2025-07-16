/**
 * KILT Price Service - Real-time price fetching with background updates
 * Fetches KILT price from CoinGecko API every 30 seconds for accurate calculations
 */

class KiltPriceService {
  private static instance: KiltPriceService;
  private currentPrice: number = 0.01602; // Fallback price
  private lastUpdate: number = 0;
  private fetchInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly FALLBACK_PRICE = 0.01602;

  private constructor() {
    this.startBackgroundFetching();
  }

  static getInstance(): KiltPriceService {
    if (!KiltPriceService.instance) {
      KiltPriceService.instance = new KiltPriceService();
    }
    return KiltPriceService.instance;
  }

  /**
   * Start background fetching of KILT price every 30 seconds
   */
  private startBackgroundFetching(): void {
    // Fetch immediately on startup
    this.fetchKiltPrice();
    
    // Set up recurring fetch every 30 seconds
    this.fetchInterval = setInterval(() => {
      this.fetchKiltPrice();
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Fetch KILT price from CoinGecko API
   */
  private async fetchKiltPrice(): Promise<void> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=kilt-protocol&vs_currencies=usd');
      const data = await response.json();
      
      if (data && data['kilt-protocol'] && data['kilt-protocol'].usd) {
        this.currentPrice = data['kilt-protocol'].usd;
        this.lastUpdate = Date.now();
        console.log(`KILT Price updated: $${this.currentPrice.toFixed(8)} (${new Date().toLocaleTimeString()})`);
      } else {
        console.warn('Invalid KILT price data from CoinGecko, using fallback');
        this.currentPrice = this.FALLBACK_PRICE;
      }
    } catch (error) {
      console.error('Error fetching KILT price from CoinGecko:', error);
      this.currentPrice = this.FALLBACK_PRICE;
    }
  }

  /**
   * Get current KILT price (always returns cached value for performance)
   */
  getCurrentPrice(): number {
    return this.currentPrice;
  }

  /**
   * Get price info with metadata
   */
  getPriceInfo(): {
    price: number;
    lastUpdate: number;
    timeSinceUpdate: number;
    isStale: boolean;
  } {
    const now = Date.now();
    const timeSinceUpdate = now - this.lastUpdate;
    const isStale = timeSinceUpdate > this.UPDATE_INTERVAL * 2; // Stale if more than 1 minute old

    return {
      price: this.currentPrice,
      lastUpdate: this.lastUpdate,
      timeSinceUpdate,
      isStale
    };
  }

  /**
   * Force immediate price update (for testing or manual refresh)
   */
  async forceUpdate(): Promise<number> {
    await this.fetchKiltPrice();
    return this.currentPrice;
  }

  /**
   * Stop background fetching (for cleanup)
   */
  stopBackgroundFetching(): void {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval);
      this.fetchInterval = null;
    }
  }
}

export const kiltPriceService = KiltPriceService.getInstance();