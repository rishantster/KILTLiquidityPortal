import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";

// Simple, safe cookie setup
setTimeout(() => {
  try {
    document.cookie = 'kilt_cache_version=2025.01.19.002; path=/; max-age=604800';
    document.cookie = 'kilt_last_visit=' + Date.now() + '; path=/; max-age=2592000';
  } catch (e) {
    // Silent fail for cookie issues
  }
}, 100);

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

// Ensure DOM is ready before mounting
const initApp = () => {
  const container = document.getElementById("root");
  if (!container) {
    console.error("Root container missing in index.html");
    return;
  }

  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

// Mount when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
