import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone", // Forces Next.js 16 to package the app server correctly on Vercel
  reactStrictMode: true,
};

export default nextConfig;