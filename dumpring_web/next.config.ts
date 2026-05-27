import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "192.168.0.7",
    "192.168.0.7:3000",
    "localhost:3000",
    "*.loca.lt",
    "*.locallt.me"
  ]
};

export default nextConfig;
