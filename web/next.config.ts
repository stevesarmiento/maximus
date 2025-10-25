import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uksgfm3uq5.ufs.sh',
        port: '',
        pathname: '/f/**',
      },
    ],
  },
};

export default nextConfig;

