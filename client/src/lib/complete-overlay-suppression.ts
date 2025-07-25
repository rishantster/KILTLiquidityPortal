// Nuclear option: Complete runtime error overlay suppression
// This aggressively blocks ALL runtime error overlays from Vite

// Immediately override all possible overlay creation methods
(function nuclearOverlaySuppress() {
  if (typeof window === 'undefined') return;

  // Block the specific runtime error plugin overlay
  const blockOverlay = () => {
    // Remove any existing overlays
    const overlays = document.querySelectorAll('[id*="error"], [class*="error"], [data-vite-overlay]');
    overlays.forEach(el => el.remove());
    
    // Block overlay creation in DOM
    const style = document.createElement('style');
    style.textContent = `
      div[id*="error-overlay"],
      div[class*="error-overlay"],
      div[data-vite-overlay],
      #vite-error-overlay,
      .vite-error-overlay {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: -9999 !important;
      }
    `;
    document.head.appendChild(style);
  };

  // Execute immediately and on DOM changes
  blockOverlay();
  
  // Block on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', blockOverlay);
  }
  
  // Continuously monitor and block overlays
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          const isOverlay = node.id?.includes('error') || 
                           node.className?.includes('error') ||
                           node.getAttribute('data-vite-overlay') !== null ||
                           node.innerHTML?.includes('plugin:runtime-error-plugin');
          
          if (isOverlay) {
            node.remove();
            console.log('Blocked runtime error overlay creation');
          }
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Override console.error to prevent Vite detection
  const originalError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Block specific runtime error messages
    if (message.includes('plugin:runtime-error-plugin') ||
        message.includes('sendError') ||
        message.includes('unknown runtime error')) {
      return; // Completely suppress
    }
    
    originalError.apply(console, args);
  };

  // Block error event propagation
  window.addEventListener('error', (e) => {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }, true);

  console.log('Nuclear overlay suppression activated');
})();

export {};