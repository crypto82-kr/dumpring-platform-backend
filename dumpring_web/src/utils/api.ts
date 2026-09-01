export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Check if we are running in a deployed remote environment (Render, Vercel etc.)
    if (hostname.includes("onrender.com") || hostname.includes("vercel.app")) {
      return "https://dumpring-api.onrender.com";
    }
    // For local dev, localhost, 127.0.0.1, or local Wi-Fi/LAN IP (e.g. 192.168.x.x, 10.x.x.x)
    return `http://${hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
};
