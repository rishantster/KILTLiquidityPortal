/**
 * Browser Compatibility and Error Handling Utilities
 * Addresses common Replit browser environment issues
 */

// Browser detection utilities
export const browserInfo = {
  isReplit: () => {
    return (
      window.location.hostname.includes('replit') ||
      window.location.hostname.includes('repl') ||
      Boolean(window.parent && window.parent !== window) // iframe detection
    );
  },

  isIframe: () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true; // If we can't access window.top, we're probably in an iframe
    }
  },

  getEnvironment: () => {
    if (browserInfo.isReplit()) return 'replit';
    if (browserInfo.isIframe()) return 'iframe';
    return 'standalone';
  }
};

// CSP-safe script loading
export const loadScript = (src: string, options: { async?: boolean; defer?: boolean } = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.src = src;
      script.async = options.async ?? true;
      script.defer = options.defer ?? false;
      
      script.onload = () => resolve(script);
      script.onerror = (error) => {
        console.warn(`Failed to load script: ${src}`, error);
        reject(error);
      };
      
      document.head.appendChild(script);
    } catch (error) {
      console.warn(`Script loading failed: ${src}`, error);
      reject(error);
    }
  });
};

// Enhanced fetch with better error handling for Replit environment
export const safeFetch = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: 'same-origin', // Use same-origin for better compatibility
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeout);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection');
      }
      
      // Network errors in Replit environment
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        console.warn('Network request failed, possibly due to browser environment restrictions');
      }
    }
    
    throw error;
  }
};

// Console error filtering for cleaner logs
export const setupConsoleFiltering = () => {
  const originalError = console.error;
  const originalWarn = console.warn;

  // Filter out known browser warnings that are harmless
  const ignoredPatterns = [
    /Unrecognized feature/,
    /sandbox attribute/,
    /Allow attribute will take precedence/,
    /Content Security Policy/,
    /Failed to load resource.*analytics/,
    /TikTok.*Failed to load/,
    /beacon\.js.*Failed to load/
  ];

  console.error = (...args) => {
    const message = args.join(' ');
    if (!ignoredPatterns.some(pattern => pattern.test(message))) {
      originalError.apply(console, args);
    }
  };

  console.warn = (...args) => {
    const message = args.join(' ');
    if (!ignoredPatterns.some(pattern => pattern.test(message))) {
      originalWarn.apply(console, args);
    }
  };
};

// WebAssembly compatibility check
export const checkWebAssemblySupport = () => {
  try {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
      return true;
    }
  } catch (e) {
    console.warn('WebAssembly not supported in this environment');
  }
  return false;
};

// Service Worker registration with error handling
export const registerServiceWorker = async (scriptUrl: string = '/sw.js') => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(scriptUrl);
    console.log('Service Worker registered successfully');
    
    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            console.log('New version available');
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.warn('Service Worker registration failed:', error);
    return null;
  }
};

// Initialize browser compatibility improvements
export const initializeBrowserCompatibility = () => {
  // Set up console filtering
  setupConsoleFiltering();

  // Log environment info
  console.log('Browser environment:', browserInfo.getEnvironment());
  console.log('WebAssembly support:', checkWebAssemblySupport());

  // Handle iframe-specific issues
  if (browserInfo.isIframe()) {
    // Disable certain features that don't work well in iframes
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // Disable PWA install prompt in iframe
    });
  }

  // Enhanced error handling
  window.addEventListener('error', (event) => {
    // Filter out known harmless errors
    const harmlessErrors = [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Script error'
    ];

    if (!harmlessErrors.some(pattern => event.message.includes(pattern))) {
      console.error('Unhandled error:', event.error);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Handle promise rejections gracefully
    console.warn('Unhandled promise rejection:', event.reason);
  });
};