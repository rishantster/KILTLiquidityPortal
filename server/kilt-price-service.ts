/**
 * KILT Price Service - Real-time price fetching with background updates
 * Fetches KILT price from CoinGecko API every 30 seconds for accurate calculations
 */

class KiltPriceService {
  private static instance: KiltPriceService;
  private currentPrice: number = 0.01602; // Initial fallback price
  private lastSuccessfulPrice: number = 0.01602; // Last known good price
  private lastUpdate: number = 0;
  private fetchInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly INITIAL_FALLBACK_PRICE = 0.01602; // Conservative initial price
  private readonly MAX_PRICE_CHANGE_THRESHOLD = 0.5; // 50% max change per update (circuit breaker)

  private constructor() {
    this.loadPersistedPrice();
    this.startBackgroundFetching();
  }

  /**
   * Load last persisted price from environment or database
   */
  private loadPersistedPrice(): void {
    // In a production environment, this could load from database or Redis
    // For now, we'll just use the initial fallback
    // Load persisted price from storage
  }

  /**
   * Persist current price for server restarts
   */
  private async persistPrice(price: number): Promise<void> {
    // In production, this would save to database or Redis
    // For now, we just store in memory
    this.lastSuccessfulPrice = price;
    // Price persisted successfully
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
   * Fetch KILT price from CoinGecko API with intelligent fallback
   */
  private async fetchKiltPrice(): Promise<void> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=kilt-protocol&vs_currencies=usd');
      const data = await response.json();
      
      if (data && data['kilt-protocol'] && data['kilt-protocol'].usd) {
        const newPrice = data['kilt-protocol'].usd;
        
        // Circuit breaker: Detect unrealistic price changes
        if (this.lastSuccessfulPrice > 0) {
          const priceChange = Math.abs(newPrice - this.lastSuccessfulPrice) / this.lastSuccessfulPrice;
          
          if (priceChange > this.MAX_PRICE_CHANGE_THRESHOLD) {
            // Price change too large, using last successful price
            this.currentPrice = this.lastSuccessfulPrice;
            return;
          }
        }
        
        // Valid price update
        this.currentPrice = newPrice;
        this.lastUpdate = Date.now();
        await this.persistPrice(newPrice);
        // KILT price updated successfully
      } else {
        // Invalid price data, using fallback
        this.currentPrice = this.getIntelligentFallbackPrice();
      }
    } catch (error) {
      // CoinGecko API error, using fallback
      this.currentPrice = this.getIntelligentFallbackPrice();
    }
  }

  /**
   * Get intelligent fallback price - always uses last successfully fetched value
   */
  private getIntelligentFallbackPrice(): number {
    // Always use last successful price from CoinGecko, only use initial fallback if never fetched successfully
    if (this.lastSuccessfulPrice > 0) {
      return this.lastSuccessfulPrice;
    }
    
    return this.INITIAL_FALLBACK_PRICE;
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
    lastSuccessfulPrice: number;
    priceSource: 'live' | 'last-fetched' | 'circuit-breaker';
  } {
    const now = Date.now();
    const timeSinceUpdate = now - this.lastUpdate;
    const isStale = timeSinceUpdate > this.UPDATE_INTERVAL * 2; // Stale if more than 1 minute old
    
    let priceSource: 'live' | 'last-fetched' | 'circuit-breaker' = 'live';
    if (this.lastUpdate > 0 && this.currentPrice === this.lastSuccessfulPrice) {
      priceSource = 'live';
    } else if (this.lastUpdate === 0 && this.currentPrice === this.lastSuccessfulPrice) {
      priceSource = 'last-fetched';
    } else if (this.currentPrice === this.lastSuccessfulPrice) {
      priceSource = 'circuit-breaker';
    }

    return {
      price: this.currentPrice,
      lastUpdate: this.lastUpdate,
      timeSinceUpdate,
      isStale,
      lastSuccessfulPrice: this.lastSuccessfulPrice,
      priceSource
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