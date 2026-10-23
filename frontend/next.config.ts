import type { NextConfig } from "next";

const isExport = process.env.NODE_ENV === "production" || process.env.NEXT_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" } : {}),
  devIndicators: false,
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "192.168.189.234",
    "192.168.189.234:3000",
    "10.25.154.234",
    "10.25.154.234:3000",
  ],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/static/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/static/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    if (isExport) return [];
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
      {
        source: "/static/:path*",
        destination: "http://127.0.0.1:8000/static/:path*",
      },
    ];
  },
};

export default nextConfig;
