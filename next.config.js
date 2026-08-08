/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing from src/lib/crawlers (JS files without type declarations)
  transpilePackages: [],
  // External packages that should not be bundled in server components
  serverExternalPackages: ['mongoose', 'bcryptjs', 'jsonwebtoken'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'rukminim2.flixcart.com',
      },
      {
        protocol: 'https',
        hostname: 'rukminim1.flixcart.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.myntassets.com',
      },
    ],
  },
};

module.exports = nextConfig;
