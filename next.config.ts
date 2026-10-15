import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: { "/**": ["./data/demo/**/*"] },
};

export default nextConfig;
