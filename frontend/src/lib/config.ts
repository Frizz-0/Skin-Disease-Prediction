/**
 * Backend Configuration
 * Auto-detects correct IP for network access
 */

const getBackendURL = (): string => {
  // If accessing from localhost, use localhost
  if (typeof window !== "undefined" && 
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:8000";
  }
  
  // If accessing from network (10.178.2.32), use same IP for backend
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8000`;
  }
  
  return "http://localhost:8000";
};

export const BACKEND_URL = getBackendURL();
console.log(`🔗 Backend URL: ${BACKEND_URL}`);