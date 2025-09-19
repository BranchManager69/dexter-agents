import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force Next.js to treat this directory as the root so dev server stays isolated.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
