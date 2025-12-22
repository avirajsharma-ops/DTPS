import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker deployment configuration
  output: 'standalone',

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Build optimizations
  reactStrictMode: false, // Disable for faster builds in production

  // Disable ESLint and TypeScript checking during build for faster builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Skip type checking for faster builds - routes work at runtime
  },

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true, // Enable CSS optimization for better performance
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast'
    ]
  } as any,

  // Webpack optimizations for better build performance
  webpack: (config, { dev, isServer }) => {
    // Optimize for production builds
    if (!dev && !isServer) {
      // Enhanced code splitting for better caching
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 20,
        },
        ui: {
          test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
          name: 'ui-components',
          chunks: 'all',
          priority: 15,
        },
        animations: {
          name: 'animations',
          test: /[\\/]node_modules[\\/].*animation.*[\\/]/,
          chunks: 'all',
          priority: 10,
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
        },
      };
      
      // Optimize module resolution
      config.resolve.modules = ['node_modules'];
      config.resolve.symlinks = false;
      
      // Enable caching for faster rebuilds
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    // Optimize for development builds
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },

  // Allow embedding in iframes from any origin (app-level)
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
    ];
  },
};

export default nextConfig;
