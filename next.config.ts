import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/mythos-handshake',
        destination: '/api/well-known/mythos-handshake',
      },
    ];
  },
};

export default nextConfig;
