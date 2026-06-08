import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
  },
};
const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/your-route`);

export default nextConfig;
