import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: { "/**": ["./data/demo/**/*", "./data/seed/**/*"] },
};

export default nextConfig;
