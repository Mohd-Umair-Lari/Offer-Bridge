export default function manifest() {
  return {
    name: 'OfferBridges — The Marketplace for Exclusive Card Benefits',
    short_name: 'OfferBridges',
    description:
      'Unlock credit card discounts, cashback, and exclusive perks across top e-commerce platforms.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
