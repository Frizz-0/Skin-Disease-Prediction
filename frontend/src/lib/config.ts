/**
 * Backend Configuration
 * Uses environment variable for production, falls back to localhost for development
 */

const getBackendURL = (): string => {
  // Use environment variable if available (set in .env for dev, in Vercel dashboard for production)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // If accessing from localhost, use localhost
  if (typeof window !== "undefined" && 
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:8000";
  }
  
  // If accessing from network, use same IP for backend
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8000`;
  }
  
  return "http://localhost:8000";
};

export const BACKEND_URL = getBackendURL();
console.log(`🔗 Backend URL: ${BACKEND_URL}`);