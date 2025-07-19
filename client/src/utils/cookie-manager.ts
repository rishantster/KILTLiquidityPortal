// Cookie Management for KILT Liquidity Portal
// Optimized loading and user preference management

export interface CookieOptions {
  expires?: Date | number;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  httpOnly?: boolean;
}

export class CookieManager {
  private static readonly DEFAULT_OPTIONS: CookieOptions = {
    path: '/',
    secure: window.location.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  };

  // Set cookie with optimized defaults
  static set(name: string, value: string, options: CookieOptions = {}): void {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    
    if (opts.expires) {
      const expires = opts.expires instanceof Date ? opts.expires : new Date(Date.now() + opts.expires);
      cookieString += `; expires=${expires.toUTCString()}`;
    }
    
    if (opts.maxAge) {
      cookieString += `; max-age=${Math.floor(opts.maxAge / 1000)}`;
    }
    
    if (opts.domain) cookieString += `; domain=${opts.domain}`;
    if (opts.path) cookieString += `; path=${opts.path}`;
    if (opts.secure) cookieString += `; secure`;
    if (opts.sameSite) cookieString += `; samesite=${opts.sameSite}`;
    
    document.cookie = cookieString;
  }

  // Get cookie value
  static get(name: string): string | null {
    const cookies = document.cookie.split(';');
    
    for (let cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (decodeURIComponent(cookieName) === name) {
        return decodeURIComponent(cookieValue || '');
      }
    }
    
    return null;
  }

  // Remove cookie
  static remove(name: string, options: CookieOptions = {}): void {
    this.set(name, '', {
      ...options,
      expires: new Date(0),
      maxAge: 0,
    });
  }

  // Check if cookie exists
  static exists(name: string): boolean {
    return this.get(name) !== null;
  }

  // Get all cookies as object
  static getAll(): Record<string, string> {
    const cookies: Record<string, string> = {};
    const cookieList = document.cookie.split(';');
    
    for (let cookie of cookieList) {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[decodeURIComponent(name)] = decodeURIComponent(value);
      }
    }
    
    return cookies;
  }
}

// Performance-optimized cookie categories
export const COOKIE_CATEGORIES = {
  ESSENTIAL: 'essential',
  PERFORMANCE: 'performance', 
  PREFERENCES: 'preferences',
  ANALYTICS: 'analytics',
} as const;

// KILT Portal specific cookie keys
export const KILT_COOKIES = {
  // Essential cookies
  WALLET_ADDRESS: 'kilt_wallet_address',
  SESSION_ID: 'kilt_session_id',
  CSRF_TOKEN: 'kilt_csrf_token',
  
  // Performance cookies
  CACHE_VERSION: 'kilt_cache_version',
  LAST_VISIT: 'kilt_last_visit',
  PAGE_LOAD_TIME: 'kilt_page_load_time',
  
  // User preferences
  THEME_PREFERENCE: 'kilt_theme',
  LANGUAGE: 'kilt_language',
  CURRENCY_DISPLAY: 'kilt_currency',
  NOTIFICATION_SETTINGS: 'kilt_notifications',
  
  // Analytics and optimization
  USER_JOURNEY: 'kilt_user_journey',
  FEATURE_FLAGS: 'kilt_features',
  AB_TEST_GROUP: 'kilt_ab_group',
} as const;

// Optimized cookie management for KILT Portal
export class KiltCookieManager {
  // Initialize essential cookies for optimal loading
  static initializeEssentials(): void {
    // Set cache version for cache busting
    const currentVersion = '2025.01.19.001';
    if (CookieManager.get(KILT_COOKIES.CACHE_VERSION) !== currentVersion) {
      CookieManager.set(KILT_COOKIES.CACHE_VERSION, currentVersion, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      // Clear old cache when version changes
      this.clearPerformanceCache();
    }
    
    // Track last visit for performance optimization
    const lastVisit = CookieManager.get(KILT_COOKIES.LAST_VISIT);
    const now = Date.now().toString();
    
    if (!lastVisit) {
      // First visit - optimize for new users
      CookieManager.set(KILT_COOKIES.LAST_VISIT, now);
      this.setNewUserOptimizations();
    } else {
      // Returning user - optimize for known preferences
      CookieManager.set(KILT_COOKIES.LAST_VISIT, now);
      this.setReturningUserOptimizations();
    }
  }

  // Set wallet address with security
  static setWalletAddress(address: string): void {
    CookieManager.set(KILT_COOKIES.WALLET_ADDRESS, address, {
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  // Get wallet address
  static getWalletAddress(): string | null {
    return CookieManager.get(KILT_COOKIES.WALLET_ADDRESS);
  }

  // Set user preferences for faster loading
  static setPreferences(preferences: {
    theme?: string;
    currency?: string;
    language?: string;
    notifications?: boolean;
  }): void {
    Object.entries(preferences).forEach(([key, value]) => {
      if (value !== undefined) {
        const cookieKey = `kilt_${key}`;
        CookieManager.set(cookieKey, String(value), {
          maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        });
      }
    });
  }

  // Get user preferences
  static getPreferences(): {
    theme: string | null;
    currency: string | null;
    language: string | null;
    notifications: boolean;
  } {
    return {
      theme: CookieManager.get(KILT_COOKIES.THEME_PREFERENCE) || 'dark',
      currency: CookieManager.get(KILT_COOKIES.CURRENCY_DISPLAY) || 'USD',
      language: CookieManager.get(KILT_COOKIES.LANGUAGE) || 'en',
      notifications: CookieManager.get(KILT_COOKIES.NOTIFICATION_SETTINGS) === 'true',
    };
  }

  // Performance tracking
  static trackPageLoad(loadTime: number): void {
    CookieManager.set(KILT_COOKIES.PAGE_LOAD_TIME, loadTime.toString(), {
      maxAge: 60 * 60 * 1000, // 1 hour
    });
  }

  // New user optimizations
  private static setNewUserOptimizations(): void {
    // Set default preferences for optimal first experience
    this.setPreferences({
      theme: 'dark',
      currency: 'USD',
      language: 'en',
      notifications: true,
    });
    
    // Preload critical resources for new users
    CookieManager.set('kilt_preload_critical', 'true', {
      maxAge: 60 * 60 * 1000, // 1 hour
    });
  }

  // Returning user optimizations
  private static setReturningUserOptimizations(): void {
    // Enable performance features for returning users
    CookieManager.set('kilt_enable_caching', 'true', {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Track user journey for optimization
    const journey = CookieManager.get(KILT_COOKIES.USER_JOURNEY) || '[]';
    try {
      const journeyData = JSON.parse(journey);
      journeyData.push({
        timestamp: Date.now(),
        page: window.location.pathname,
      });
      
      // Keep only last 10 visits
      const recentJourney = journeyData.slice(-10);
      CookieManager.set(KILT_COOKIES.USER_JOURNEY, JSON.stringify(recentJourney));
    } catch {
      // Reset on parse error
      CookieManager.set(KILT_COOKIES.USER_JOURNEY, '[]');
    }
  }

  // Clear performance cache
  private static clearPerformanceCache(): void {
    const performanceCookies = [
      KILT_COOKIES.PAGE_LOAD_TIME,
      'kilt_preload_critical',
      'kilt_enable_caching',
    ];
    
    performanceCookies.forEach(cookie => {
      CookieManager.remove(cookie);
    });
  }

  // Get performance data
  static getPerformanceData(): {
    isNewUser: boolean;
    lastVisit: string | null;
    cacheEnabled: boolean;
    userJourney: any[];
  } {
    const lastVisit = CookieManager.get(KILT_COOKIES.LAST_VISIT);
    const journey = CookieManager.get(KILT_COOKIES.USER_JOURNEY) || '[]';
    
    return {
      isNewUser: !lastVisit,
      lastVisit,
      cacheEnabled: CookieManager.get('kilt_enable_caching') === 'true',
      userJourney: JSON.parse(journey),
    };
  }

  // Clean expired cookies
  static cleanup(): void {
    const allCookies = CookieManager.getAll();
    const now = Date.now();
    
    Object.keys(allCookies).forEach(cookieName => {
      if (cookieName.startsWith('kilt_')) {
        // Check if cookie should be cleaned based on age or other criteria
        const value = allCookies[cookieName];
        
        // Remove very old session data
        if (cookieName.includes('session') && value) {
          try {
            const timestamp = parseInt(value);
            if (now - timestamp > 7 * 24 * 60 * 60 * 1000) { // 7 days
              CookieManager.remove(cookieName);
            }
          } catch {
            CookieManager.remove(cookieName);
          }
        }
      }
    });
  }
}