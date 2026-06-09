import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@middleware.io/node-apm', '@pyroscope/nodejs', 'pprof'],
  images: {
    remotePatterns: [
      {protocol: 'https', hostname: 'images.unsplash.com'},
    ],
  },
};

export default nextConfig;
