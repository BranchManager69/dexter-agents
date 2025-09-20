import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Next.js to treat this directory as the root so dev server stays isolated.
  outputFileTracingRoot: __dirname,
  // Keep stack traces human-readable even in production builds.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
