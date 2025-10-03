import type { NextConfig } from "next";

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN &&
  process.env.NEXT_PUBLIC_API_ORIGIN !== "relative"
    ? process.env.NEXT_PUBLIC_API_ORIGIN.replace(/\/$/, "")
    : "https://api.dexter.cash";

const nextConfig: NextConfig = {
  // Force Next.js to treat this directory as the root so dev server stays isolated.
  outputFileTracingRoot: __dirname,
  // Keep stack traces human-readable even in production builds.
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thumbnails.pump.fun",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/auth/config", destination: `${API_ORIGIN}/auth/config` },
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
    ];
  },
};

export default nextConfig;
