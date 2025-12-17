import type { NextConfig } from "next";

/**
 * Next.js configuration
 * - Images: Allow Steam profile pictures
 * - Rewrites: Proxy /api/* to backend (dev only, production uses nginx)
 */
const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.steamusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'community.cloudflare.steamstatic.com',
      },
    ],
  },
  // Allow larger file uploads (100MB) for sync
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  async rewrites() {
    // In production, nginx handles /api proxying
    // These rewrites are only for local development
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
