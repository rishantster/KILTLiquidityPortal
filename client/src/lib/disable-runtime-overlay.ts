// Aggressive runtime error overlay disabling
// This completely prevents the Vite runtime error plugin from showing overlays

// Override the sendError function that triggers the overlay
const disableRuntimeErrorOverlay = () => {
  // Intercept and disable the specific runtime error function
  if (typeof window !== 'undefined') {
    // Override the global sendError function used by Vite's runtime error plugin
    (window as any).sendError = () => {
      // Do nothing - completely suppress overlay
    };

    // Override __vite_plugin_runtime_error_modal for direct plugin disabling
    (window as any).__vite_plugin_runtime_error_modal = {
      show: () => {},
      hide: () => {},
      sendError: () => {},
    };

    // Intercept console.error calls that trigger the overlay
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Block specific runtime error plugin messages
      if (
        message.includes('[plugin:runtime-error-plugin]') ||
        message.includes('runtime error') ||
        message.includes('sendError')
      ) {
        // Completely suppress these messages
        return;
      }
      
      // Allow other console.error messages through
      originalConsoleError.apply(console, args);
    };

    // Block error events from propagating to the runtime error plugin
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(type: string, listener: any, options?: any) {
      if (type === 'error' || type === 'unhandledrejection') {
        // Wrap the listener to prevent runtime error plugin from receiving events
        const wrappedListener = function(event: any) {
          // Check if this is the runtime error plugin trying to listen
          const listenerString = listener?.toString() || '';
          if (listenerString.includes('sendError') || listenerString.includes('runtime-error')) {
            // Block the runtime error plugin specifically
            return;
          }
          
          // Allow other error listeners to work normally
          if (typeof listener === 'function') {
            listener.call(window, event);
          }
        };
        
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      
      return originalAddEventListener.call(this, type, listener, options);
    };
  }
};

// Execute immediately when module loads
disableRuntimeErrorOverlay();

export default disableRuntimeErrorOverlay;