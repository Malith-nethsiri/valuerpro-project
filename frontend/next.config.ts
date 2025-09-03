import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  turbopack: {
    // Enable Turbopack for faster builds
    rules: {
      // Enable TypeScript and CSS optimizations
      '*.ts': ['typescript'],
      '*.tsx': ['typescript'],
    },
  },
  
  // Server external packages
  serverExternalPackages: ['sharp'],
  
  // Compiler options for better performance
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
        port: '',
        pathname: '/maps/api/staticmap/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
  
  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config: any, { isServer }: any) => {
      if (!isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
        };
      }
      return config;
    },
  }),
  
  // TypeScript configuration
  typescript: {
    // Enable strict mode for better type checking
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    // Enable ESLint during builds
    ignoreDuringBuilds: false,
  },
  
  // Output configuration for better builds
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  
  // Power optimizations
  poweredByHeader: false,
  
  // Compression
  compress: true,
  
  // Asset optimization
  assetPrefix: process.env.ASSET_PREFIX ?? undefined,
};

export default nextConfig;
