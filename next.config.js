const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['mongoose', 'bcryptjs', 'jsonwebtoken', 'playwright', 'playwright-core'],

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
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
  // (prevents Vercel SSO from blocking the manifest fetch)
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
