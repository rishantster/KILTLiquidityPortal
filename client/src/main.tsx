import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  // Prevent the default behavior (which would show an error overlay)
  event.preventDefault();
});

// Global error handler for other errors
window.addEventListener('error', (event) => {
  console.warn('Global error:', event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
