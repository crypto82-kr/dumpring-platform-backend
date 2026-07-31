export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // 운영 배포 도메인 환경인 경우 원격 서버 URL 사용
    if (hostname.includes("vercel.app") || hostname.includes("onrender.com") || hostname !== "localhost" && hostname !== "127.0.0.1") {
      return process.env.NEXT_PUBLIC_API_URL || "https://dumpring-api.onrender.com";
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
};
