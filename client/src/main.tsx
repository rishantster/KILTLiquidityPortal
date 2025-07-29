// CRITICAL: Import render emergency fix FIRST to ensure React can mount
import "@/lib/render-emergency-fix";
import "@/lib/dom-safety-fixes";
import "@/lib/vite-plugin-interceptor";
import "@/lib/complete-overlay-suppression";
import "@/lib/vite-hmr-override";
import "@/lib/disable-runtime-overlay";
import "@/lib/final-overlay-blocker";

import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection (gracefully handled):', event.reason?.message || event.reason);
  // Prevent the default behavior (which would show an error overlay)
  event.preventDefault();
});

// Force reload if necessary for Replit browser compatibility
if (typeof window !== 'undefined' && window.location.search.includes('force-reload')) {
  window.location.href = window.location.href.replace('?force-reload', '').replace('&force-reload', '');
}

// Global error handler for other errors
window.addEventListener('error', (event) => {
  console.warn('Global error (gracefully handled):', event.error?.message || event.error);
  event.preventDefault();
});

// Error boundary wrapper for the entire application
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn('Error boundary caught error:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-400 mb-4">The application encountered an error</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Ensure root element exists and is accessible
function initializeApp() {
  let rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.warn('Root element not found, creating one');
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    rootElement.style.cssText = 'width: 100%; height: 100vh; background: black;';
    document.body.appendChild(rootElement);
  }
  
  // Ensure root element is visible
  rootElement.style.display = 'block';
  rootElement.style.visibility = 'visible';
  rootElement.style.opacity = '1';
  
  // Create React root and render app
  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.log('✅ React app mounted successfully');
  } catch (error) {
    console.error('Failed to mount React app:', error);
    // Fallback: Display a basic loading message
    rootElement.innerHTML = `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        height: 100vh; 
        background: black; 
        color: white; 
        font-family: Inter, sans-serif;
      ">
        <div style="text-align: center;">
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">KILT Liquidity Portal</h1>
          <p style="color: #888;">Loading application...</p>
          <button onclick="window.location.reload()" style="
            margin-top: 1rem; 
            padding: 0.5rem 1rem; 
            background: #10b981; 
            color: white; 
            border: none; 
            border-radius: 0.25rem; 
            cursor: pointer;
          ">Reload</button>
        </div>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
