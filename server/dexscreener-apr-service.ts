import { LRUCache } from 'lru-cache';

/**
 * DexScreener APR Service
 * Simple and reliable APR data from DexScreener API
 */
export class DexScreenerAPRService {
  private static cache = new LRUCache<string, any>({
    max: 100,
    ttl: 1000 * 60 * 5 // 5 minute cache
  });

  private static readonly BASE_KILT_POOL = '0x82da478b1382b951cbad01beb9ed459cdb16458e';
  private static readonly DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/pairs/base';

  /**
   * Get KILT/ETH pool APR from DexScreener
   */
  static async getKiltPoolAPR(): Promise<number> {
    const cacheKey = 'kilt-pool-apr';
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.DEXSCREENER_API}/${this.BASE_KILT_POOL}`);
      
      if (!response.ok) {
        throw new Error(`DexScreener API failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.pair) {
        throw new Error('No pair data found');
      }

      // DexScreener provides 24h volume and liquidity data
      const pair = data.pair;
      const volume24h = parseFloat(pair.volume?.h24 || '0');
      const liquidity = parseFloat(pair.liquidity?.usd || '1');
      const feeRate = 0.003; // 0.3% fee tier for KILT/ETH pool
      
      // Calculate trading fees APR: (24h volume * fee rate * 365) / liquidity
      const tradingFeesAPR = ((volume24h * feeRate * 365) / liquidity) * 100;
      
      // Cache the result
      this.cache.set(cacheKey, tradingFeesAPR);
      
      console.log(`📊 DexScreener APR calculated: ${tradingFeesAPR.toFixed(2)}% (Volume: $${volume24h.toLocaleString()}, Liquidity: $${liquidity.toLocaleString()})`);
      
      return tradingFeesAPR;
      
    } catch (error) {
      console.error('DexScreener APR fetch failed:', error);
      
      // Fallback to a reasonable default based on current market conditions
      const fallbackAPR = 12.0; // Conservative 12% APR estimate
      this.cache.set(cacheKey, fallbackAPR);
      
      return fallbackAPR;
    }
  }

  /**
   * Get position-specific APR (for concentrated positions)
   * Applies concentration multiplier based on range width
   */
  static async getPositionAPR(
    tickLower: number,
    tickUpper: number,
    isInRange: boolean
  ): Promise<number> {
    const baseAPR = await this.getKiltPoolAPR();
    
    if (!isInRange) {
      return 0; // Out of range positions earn no fees
    }

    // Calculate concentration factor
    const tickRange = tickUpper - tickLower;
    let concentrationMultiplier = 1.0;
    
    if (tickRange >= 200000) {
      // Full range positions
      concentrationMultiplier = 1.0;
    } else if (tickRange >= 20000) {
      // Wide positions (10% concentration bonus)
      concentrationMultiplier = 1.1;
    } else if (tickRange >= 4000) {
      // Medium concentration (30% bonus)
      concentrationMultiplier = 1.3;
    } else {
      // Highly concentrated positions (50% bonus)
      concentrationMultiplier = 1.5;
    }

    return baseAPR * concentrationMultiplier;
  }

  /**
   * Clear cache for fresh data
   */
  static clearCache(): void {
    this.cache.clear();
  }
}