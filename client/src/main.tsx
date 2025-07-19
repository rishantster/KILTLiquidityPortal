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

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
