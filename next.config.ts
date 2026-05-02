import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd2m3jbnd2yzent.cloudfront.net',
      },
    ],
  },
}

export default nextConfig
