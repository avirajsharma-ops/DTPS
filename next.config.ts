import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const noCacheHeaders = [
  { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
  { key: 'Pragma', value: 'no-cache' },
  { key: 'Expires', value: '0' },
];

const nextConfig: NextConfig = {
  // Docker deployment configuration
  output: 'standalone',

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Build optimizations
  reactStrictMode: false,

  // Disable ESLint and TypeScript checking during build for faster builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 2592000, // 30 days for image cache
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react', 
      'recharts',
      'date-fns',
      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-progress',
      '@radix-ui/react-switch',
      'firebase',
      'firebase/app',
      'firebase/messaging',
      'emoji-picker-react',
      'html2canvas',
      'jspdf',
      'sonner',
    ],
    // Client-side router cache — keep prefetched pages alive longer
    staleTimes: {
      dynamic: 30,  // Cache dynamic pages for 30s on client router
      static: 300,  // Cache static pages for 5min on client router
    },
  } as any,

  // Webpack optimizations for better build performance
  webpack: (config, { dev, isServer }) => {
    // Optimize for production builds
    if (!dev && !isServer) {
      // Optimize module resolution
      config.resolve.modules = ['node_modules'];
      config.resolve.symlinks = false;
    }

    // Optimize for development builds — use native filesystem events (not polling)
    if (dev) {
      config.watchOptions = {
        ignored: /node_modules/,
        aggregateTimeout: 300,
      };
    }

    return config;
  },

  // Allow embedding in iframes from any origin (app-level)
  headers: async () => {
    return [
      // Disable caching for ALL API routes — ensures fresh data
      {
        source: '/api/:path*',
        headers: noCacheHeaders,
      },
      // Disable caching for all authenticated app pages (staff + clients)
      {
        source: '/(admin|dashboard|dietician|health-counselor|messages|appointments|clients|recipes|meal-plans|meal-plan-templates|billing|subscriptions|analytics|profile|settings|revenue-report|user)/:path*',
        headers: noCacheHeaders,
      },
      // Cache static assets aggressively
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "mw-futuretech",

  project: "dtps-sentry",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
