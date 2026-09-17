import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  // Allow Arena/E2B live-preview hosts in dev (proxied under *.e2b.app)
  allowedDevOrigins: ["*.e2b.app"],
};

export default nextConfig;
