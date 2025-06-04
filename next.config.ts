import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'agamix.fr',
        port: '',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true, // Correct placement: directly under 'images'
    contentDispositionType: 'inline', // Recommended for SVG to be displayed directly
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;", // Example CSP, adjust as needed
  },
};

export default nextConfig;
