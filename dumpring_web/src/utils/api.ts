export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Check if we are running in a deployed remote environment
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return "https://dumpring-api.onrender.com";
    }
  }
  return "http://127.0.0.1:8000";
};
