// @ts-nocheck
import { BaseCrawler } from './base.js';
import {
  fetchPage,
  extractBankOffers,
  parseStructuredBankOffers,
  parsePrice,
  decodeHTML,
  deepFind,
  isPlainText,
  sanitizeUrl,
  extractJsonLD,
  extractOG,
  extractTitleFromSlug,
  cleanExtractedTitle,
} from './utils.js';

export class MyntraCrawler extends BaseCrawler {
  constructor() {
    super('Myntra', ['myntra.com']);
  }

  async scrape(productUrlInput) {
    const productUrl = sanitizeUrl(productUrlInput);
    const styleId = productUrl.match(/\/(\d+)\/buy/i)?.[1] || productUrl.match(/[^\d](\d{6,10})(?:[^\d]|$)/)?.[1];
    let result = await fetchMyntraInternalApi(styleId, productUrl);
    if (!result) {
      const html = await fetchPage(productUrl, 'myntra');
      if (isPlainText(html)) {
        result = parseFromTextMyntra(html, productUrl);
      } else {
        result = parseMyntra(html, productUrl);
      }
    }
    result.title = cleanExtractedTitle(result.title, productUrl);
    if (result.title === 'E-Commerce Product' || (!result.price && result.availability !== 'out_of_stock')) {
      throw new Error('Myntra product details could not be extracted. The link may be expired, blocked, or not a product page.');
    }
    return this.normalizeProductData(result);
  }
}

async function fetchMyntraInternalApi(styleId, productUrl) {
  if (!styleId) return null;
  const endpoints = [
    `https://www.myntra.com/gateway/v2/product/${styleId}`,
    `https://www.myntra.com/gateway/v1/product/${styleId}`,
    // NEW: Additional endpoints
    `https://www.myntra.com/gateway/v2/product/${styleId}?fields=all`,
    `https://www.myntra.com/api/v2/product/${styleId}`,
  ];
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json',
    'x-myntra-app': 'myntra',
    'Accept-Language': 'en-IN,en;q=0.9',
  };
  for (const apiUrl of endpoints) {
    try {
      const res = await fetch(apiUrl, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const json = await res.json();
        const style = json?.style || json?.data?.style || json;
        const title = style?.name || style?.title || style?.brand?.name + ' ' + style?.name || '';
        let price = 0;
        let originalPrice = 0;
        
        // Try multiple price paths
        const pricePaths = [
          style?.price?.discounted,
          style?.price?.mrp,
          style?.discounted,
          style?.mrp,
          style?.price?.sellingPrice,
          json?.price?.discounted,
          json?.price?.mrp,
        ];
        for (const p of pricePaths) {
          if (p && p > 0) { price = parsePrice(String(p)); break; }
        }
        
        const mrpPaths = [
          style?.price?.mrp,
          style?.mrp,
          style?.price?.mrpPrice,
          json?.price?.mrp,
        ];
        for (const p of mrpPaths) {
          if (p && p > 0) { originalPrice = parsePrice(String(p)); break; }
        }
        if (originalPrice < price) originalPrice = price;
        
        let image = '';
        if (style?.media?.albums?.[0]?.images?.[0]?.src) {
          image = style.media.albums[0].images[0].src;
        } else if (style?.images?.[0]?.src) {
          image = style.images[0].src;
        }
        if (!image) {
          image = deepFind(json, ['imageURL', 'src', 'secureUrl', 'style.imageURL']);
        }
        
        // Rating
        let rating = parseFloat(style?.ratings?.average) || 
                    parseFloat(style?.rating) ||
                    parseFloat(json?.rating) || 0;
        let reviewCount = style?.ratings?.count || 
                         style?.reviewCount ||
                         json?.reviewCount || 0;
        
        // Availability
        const availability = style?.flags?.outOfStock || style?.outOfStock ? 'out_of_stock' : 'in_stock';
        
        // Seller
        const sellerName = style?.seller?.name || style?.brand?.name || '';
        
        // Offers from API
        let rawOffers = [];
        if (style?.offers) {
          for (const offer of style.offers) {
            if (offer?.description) rawOffers.push(offer.description);
            if (offer?.title) rawOffers.push(offer.title);
          }
        }
        if (json?.offers) {
          for (const offer of json.offers) {
            if (offer?.description) rawOffers.push(offer.description);
            if (offer?.title) rawOffers.push(offer.title);
          }
        }
        
        if (price > 10 && title.length > 3) {
          return {
            url: productUrl,
            title: decodeHTML(title),
            price,
            originalPrice,
            rating,
            reviewCount,
            availability,
            sellerName,
            image,
            rawOffers,
            bankOffers: parseStructuredBankOffers(rawOffers),
            domain: 'myntra',
            asin: null,
            lowestEver: 0,
          };
        }
      }
    } catch (e) {}
  }
  return null;
}

function parseMyntra(html, productUrl) {
  const ld = extractJsonLD(html) || {};
  let title = '';
  const titleMatch = html.match(/<h1[^>]*class=["'][^"']*pdp-title["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                     html.match(/<h1[^>]*class=["'][^"']*pdp-name["'][^>]*>([\s\S]*?)<\/h1>/i);
  if (titleMatch) title = decodeHTML(titleMatch[1].replace(/<[^>]+>/g, ''));

  if (!title) title = ld.name || extractOG(html, 'title');
  if (!title) title = extractTitleFromSlug(productUrl);

  let price = 0;
  const priceMatch = html.match(/class=["'][^"']*pdp-price["'][^>]*>(?:<strong>)?(?:Rs\.?)?\s*([\d,]+)/i);
  if (priceMatch) {
    const p = parsePrice(priceMatch[1]);
    if (p > 0) price = p;
  }
  if (!price && ld.offers) {
    const offer = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
    price = parsePrice(offer?.price || offer?.lowPrice || 0);
  }

  let image = '';
  const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (imgMatch) image = imgMatch[1];

  const stripped = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                       .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/\s+/g, ' ');
  const rawOffers = extractBankOffers(stripped);
  const bankOffers = parseStructuredBankOffers(rawOffers);

  return {
    url: productUrl,
    title,
    price,
    originalPrice: Math.max(price, parsePrice(ld.offers?.highPrice || 0)),
    rating: 0,
    reviewCount: 0,
    availability: price > 0 ? 'in_stock' : 'out_of_stock',
    sellerName: '',
    image,
    rawOffers,
    bankOffers,
    domain: 'myntra',
    asin: null,
    lowestEver: 0,
  };
}

function parseFromTextMyntra(text, productUrl) {
  let title = '';
  const titleMeta = text.match(/^Title:\s+(.+)$/im);
  if (titleMeta?.[1]?.trim().length > 5) {
    title = titleMeta[1].trim();
  }
  if (!title) title = extractTitleFromSlug(productUrl);

  let price = 0;
  const priceRe = /₹\s*([\d,]+)/g;
  let m;
  const prices = [];
  while ((m = priceRe.exec(text.slice(0, 2000))) !== null) {
    const p = parsePrice(m[1]);
    if (p > 0) prices.push(p);
  }
  if (prices.length > 0) price = prices[0];

  const rawOffers = extractBankOffers(text);
  const bankOffers = parseStructuredBankOffers(rawOffers);

  return {
    url: productUrl,
    title,
    price,
    originalPrice: price,
    rating: 0,
    reviewCount: 0,
    availability: price > 0 ? 'in_stock' : 'out_of_stock',
    sellerName: '',
    image: '',
    rawOffers,
    bankOffers,
    domain: 'myntra',
    asin: null,
    lowestEver: 0,
  };
}

export async function scrapeMyntra(productUrl) {
  const crawler = new MyntraCrawler();
  return crawler.scrape(productUrl);
}
