import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App-minimal";
import "./index.css";

// Ultra-simple React mounting without any complex logic
const container = document.getElementById("root")!;
const root = createRoot(container);

// Basic error boundary
class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          backgroundColor: 'black', 
          color: 'white', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h2>App Error</h2>
          <button 
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Mount immediately
root.render(
  <SimpleErrorBoundary>
    <App />
  </SimpleErrorBoundary>
);

// Simple cookie setup after mount
setTimeout(() => {
  try {
    document.cookie = 'kilt_cache_version=2025.01.19.002; path=/; max-age=604800';
  } catch (e) {
    // Ignore cookie errors
  }
}, 500);