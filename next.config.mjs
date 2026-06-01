/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,

  // Prevent Next.js from bundling playwright's native binary into webpack chunks.
  // playwright requires OS-level Chromium binaries — it must remain external.
  serverExternalPackages: ['playwright', 'playwright-core'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      // Allow Amazon and Flipkart product images on the frontend
      { protocol: 'https', hostname: '*.media-amazon.com' },
      { protocol: 'https', hostname: '*.ssl-images-amazon.com' },
      { protocol: 'https', hostname: 'rukminim*.flixcart.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // img-src 'self' https: covers Amazon/Flipkart CDN images in frontend components
          { key: 'Content-Security-Policy',   value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com;" },
        ],
      },
    ];
  },

  async rewrites() {
    return [];
  },

  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
