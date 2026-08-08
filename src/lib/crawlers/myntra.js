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
    return this.normalizeProductData(result);
  }
}

async function fetchMyntraInternalApi(styleId, productUrl) {
  if (!styleId) return null;
  const endpoints = [
    `https://www.myntra.com/gateway/v2/product/${styleId}`,
    `https://www.myntra.com/gateway/v1/product/${styleId}`,
  ];
  for (const apiUrl of endpoints) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'x-myntra-app': 'myntra',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const json = await res.json();
        const style = json?.style || json;
        const title = style?.name || style?.title || '';
        let price = 0;
        const p1 = style?.price?.discounted || style?.price?.mrp || 0;
        if (p1 > 0) price = p1;
        if (price === 0) {
          const v = deepFind(json, ['discounted', 'mrp', 'price', 'sellingPrice']);
          if (v) price = parsePrice(String(v));
        }
        let image = '';
        if (style?.media?.albums?.[0]?.images?.[0]?.src) {
          image = style.media.albums[0].images[0].src;
        }
        if (!image) {
          image = deepFind(json, ['imageURL', 'src', 'secureUrl']);
        }
        if (price > 10 && title.length > 3) {
          return {
            url: productUrl,
            title: decodeHTML(title),
            price,
            originalPrice: style?.price?.mrp || price,
            rating: parseFloat(style?.ratings?.average) || 0,
            reviewCount: style?.ratings?.count || 0,
            availability: 'in_stock',
            sellerName: style?.seller?.name || '',
            image,
            rawOffers: [],
            bankOffers: [],
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
  let title = '';
  const titleMatch = html.match(/<h1[^>]*class=["'][^"']*pdp-title["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                     html.match(/<h1[^>]*class=["'][^"']*pdp-name["'][^>]*>([\s\S]*?)<\/h1>/i);
  if (titleMatch) title = decodeHTML(titleMatch[1].replace(/<[^>]+>/g, ''));

  if (!title) {
    const metaTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (metaTitle) {
      title = decodeHTML(metaTitle[1].split('|')[0].replace('Buy', '').trim());
    }
  }

  let price = 0;
  const priceMatch = html.match(/class=["'][^"']*pdp-price["'][^>]*>(?:<strong>)?(?:Rs\.?)?\s*([\d,]+)/i);
  if (priceMatch) {
    const p = parsePrice(priceMatch[1]);
    if (p > 0) price = p;
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
    originalPrice: price,
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
