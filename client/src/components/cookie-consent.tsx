import { useState, useEffect } from 'react';
import { X, Cookie, Settings, Shield, BarChart3 } from 'lucide-react';
import { CookieManager, KiltCookieManager, COOKIE_CATEGORIES } from '../utils/cookie-manager';

interface CookieConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
}

export function CookieConsent({ onAccept, onDecline }: CookieConsentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always true, cannot be disabled
    performance: true,
    preferences: true,
    analytics: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consentStatus = CookieManager.get('kilt_cookie_consent');
    if (!consentStatus) {
      setIsVisible(true);
    } else {
      // Load saved preferences
      const savedPrefs = CookieManager.get('kilt_cookie_preferences');
      if (savedPrefs) {
        try {
          setPreferences(JSON.parse(savedPrefs));
        } catch {
          // Use defaults if parsing fails
        }
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      performance: true,
      preferences: true,
      analytics: true,
    };
    
    saveConsent(allAccepted);
    setIsVisible(false);
    onAccept?.();
  };

  const handleAcceptSelected = () => {
    saveConsent(preferences);
    setIsVisible(false);
    onAccept?.();
  };

  const handleDeclineAll = () => {
    const essentialOnly = {
      essential: true,
      performance: false,
      preferences: false,
      analytics: false,
    };
    
    saveConsent(essentialOnly);
    setIsVisible(false);
    onDecline?.();
  };

  const saveConsent = (prefs: typeof preferences) => {
    // Save consent status and preferences
    CookieManager.set('kilt_cookie_consent', 'true', {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });
    
    CookieManager.set('kilt_cookie_preferences', JSON.stringify(prefs), {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    });

    // Initialize cookies based on preferences
    if (prefs.essential) {
      KiltCookieManager.initializeEssentials();
    }
    
    if (prefs.performance) {
      // Enable performance tracking
      KiltCookieManager.trackPageLoad(performance.now());
    }
    
    if (prefs.preferences) {
      // Load user preferences
      const userPrefs = KiltCookieManager.getPreferences();
      // Apply preferences to UI
    }
  };

  const updatePreference = (category: keyof typeof preferences, enabled: boolean) => {
    if (category === 'essential') return; // Cannot disable essential cookies
    
    setPreferences(prev => ({
      ...prev,
      [category]: enabled,
    }));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 lg:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Cookie consent modal */}
      <div className="relative w-full max-w-2xl bg-black/80 backdrop-blur-sm border border-gray-800 rounded-lg shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <Cookie className="h-5 w-5 text-pink-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Cookie Preferences</h2>
            </div>
            
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              We use cookies to optimize your experience on the KILT Liquidity Portal. 
              Essential cookies are required for core functionality, while others enhance 
              performance and personalization.
            </p>

            {/* Cookie categories */}
            {!showDetails ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Essential</span>
                    </div>
                    <p className="text-xs text-gray-400">Required for core functionality</p>
                  </div>
                  
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">Performance</span>
                    </div>
                    <p className="text-xs text-gray-400">Optimize loading and caching</p>
                  </div>
                  
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Settings className="h-4 w-4 text-purple-400" />
                      <span className="text-sm font-medium text-purple-400">Preferences</span>
                    </div>
                    <p className="text-xs text-gray-400">Remember your settings</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Detailed cookie settings */}
                <div className="space-y-3">
                  <CookieCategory
                    title="Essential Cookies"
                    description="Required for wallet connection, security, and core app functionality"
                    icon={<Shield className="h-4 w-4" />}
                    enabled={preferences.essential}
                    required={true}
                    onChange={(enabled) => updatePreference('essential', enabled)}
                  />
                  
                  <CookieCategory
                    title="Performance Cookies"
                    description="Help us optimize loading times and cache management"
                    icon={<BarChart3 className="h-4 w-4" />}
                    enabled={preferences.performance}
                    onChange={(enabled) => updatePreference('performance', enabled)}
                  />
                  
                  <CookieCategory
                    title="Preference Cookies"
                    description="Remember your theme, language, and display settings"
                    icon={<Settings className="h-4 w-4" />}
                    enabled={preferences.preferences}
                    onChange={(enabled) => updatePreference('preferences', enabled)}
                  />
                  
                  <CookieCategory
                    title="Analytics Cookies"
                    description="Anonymous usage data to improve the platform"
                    icon={<BarChart3 className="h-4 w-4" />}
                    enabled={preferences.analytics}
                    onChange={(enabled) => updatePreference('analytics', enabled)}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-gray-800">
              {!showDetails && (
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Customize settings
                </button>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDeclineAll}
                  className="px-4 py-2 text-sm border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors rounded-lg"
                >
                  Essential Only
                </button>
                
                {showDetails && (
                  <button
                    onClick={handleAcceptSelected}
                    className="px-4 py-2 text-sm bg-pink-600 hover:bg-pink-700 text-white transition-colors rounded-lg"
                  >
                    Save Preferences
                  </button>
                )}
                
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors rounded-lg"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CookieCategoryProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  required?: boolean;
  onChange: (enabled: boolean) => void;
}

function CookieCategory({ title, description, icon, enabled, required, onChange }: CookieCategoryProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-gray-700 rounded">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-medium text-white">{title}</h4>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center">
        {required ? (
          <span className="text-xs text-emerald-400 font-medium">Required</span>
        ) : (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        )}
      </div>
    </div>
  );
}