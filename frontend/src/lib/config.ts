const configuredBackendURL = (
  import.meta.env.VITE_GRADCAM_API_URL || import.meta.env.VITE_API_URL
)?.trim().replace(/\/+$/, "");
const isLocalDevelopment =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export const GRADCAM_API_URL =
  configuredBackendURL || (isLocalDevelopment ? "http://localhost:8000" : "");
export const GRADCAM_API_STATUS = configuredBackendURL
  ? "REMOTE API"
  : isLocalDevelopment
    ? "LOCAL API"
    : "NOT CONFIGURED";