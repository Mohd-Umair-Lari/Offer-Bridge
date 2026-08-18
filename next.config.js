const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['mongoose', 'bcryptjs', 'jsonwebtoken', 'playwright', 'playwright-core'],

  // Turbopack is the default in Next.js 16. Setting an empty config silences the
  // warning that arises when a webpack config is present alongside it.
  turbopack: {},

  // Keep the webpack config for non-Turbopack environments (e.g. CI or older builds)
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };

    // Playwright cannot run in Vercel serverless functions and must never be
    // bundled. Mark it as an external so webpack skips it entirely. A runtime
    // error is thrown by scraper.js if it is called in that environment.
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : []),
      ({ request }, callback) => {
        if (request === 'playwright' || request === 'playwright-core') {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      },
    ];

    return config;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*.media-amazon.com' },
      { protocol: 'https', hostname: '*.ssl-images-amazon.com' },
      { protocol: 'https', hostname: 'rukminim*.flixcart.com' },
      { protocol: 'https', hostname: 'assets.myntassets.com' },
    ],
  },

  // Allow the web manifest and static assets to load without CORS issues
  async headers() {
    return [
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
      {
        source: '/:icon(logo|icon-.*).png',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },

  poweredByHeader: false,
  compress: true,
};

module.exports = nextConfig;
