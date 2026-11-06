// @ts-nocheck
import { BaseCrawler } from './base.js';
import {
  fetchPage, extractBankOffers, parseStructuredBankOffers, parsePrice,
  decodeHTML, extractJsonLD, extractOG, isPlainText, sanitizeUrl,
} from './utils.js';

function textFromHtml(html) {
  return decodeHTML(html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '));
}

function firstPrice(values) {
  for (const value of values) {
    const price = parsePrice(value);
    if (price >= 10 && price <= 10000000) return price;
  }
  return 0;
}

export class MeeshoCrawler extends BaseCrawler {
  constructor() { super('Meesho', ['meesho.com', 'www.meesho.com']); }

  async scrape(productUrlInput) {
    const productUrl = sanitizeUrl(productUrlInput);
    const html = await fetchPage(productUrl, 'meesho');
    const result = isPlainText(html)
      ? this.parseText(html, productUrl)
      : this.parseHtml(html, productUrl);

    if (!result.title || result.price <= 0) {
      throw new Error('Meesho returned an incomplete product page. Please use the full product URL and try again.');
    }
    return this.normalizeProductData(result);
  }

  parseHtml(html, url) {
    const ld = extractJsonLD(html) || {};
    const visible = textFromHtml(html);
    const title = ld.name ||
      html.match(/<meta[^>]+(?:property|name)=["'](?:og:title|twitter:title)["'][^>]+content=["']([^"']+)/i)?.[1] ||
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, ' ') || '';
    const offers = Array.isArray(ld.offers) ? ld.offers[0] : (ld.offers || {});
    const price = firstPrice([offers.price, offers.lowPrice,
      html.match(/(?:₹|Rs\.?)[\s]*([\d,]+)/i)?.[1],
      visible.match(/(?:₹|Rs\.?)[\s]*([\d,]+)/i)?.[1]]);
    const originalPrice = Math.max(price, firstPrice([
      html.match(/(?:MRP|original price|strike)[^₹\d]{0,30}(?:₹|Rs\.?)?\s*([\d,]+)/i)?.[1],
      offers.highPrice,
    ]));
    const image = (Array.isArray(ld.image) ? ld.image[0] : ld.image) || extractOG(html, 'image');
    const rating = parseFloat(ld.aggregateRating?.ratingValue) ||
      parseFloat(visible.match(/([1-5](?:\.\d)?)\s*(?:out of 5|★)/i)?.[1]) || 0;
    const reviewCount = parsePrice(ld.aggregateRating?.reviewCount || ld.aggregateRating?.ratingCount ||
      visible.match(/([\d,]+)\s*(?:ratings|reviews)/i)?.[1]);
    const rawOffers = extractBankOffers(visible);
    return {
      url, title, price, originalPrice, rating, reviewCount,
      availability: /sold\s*out|out\s+of\s+stock|currently\s+unavailable/i.test(visible) ? 'out_of_stock' : 'in_stock',
      sellerName: ld.brand?.name || '', image, rawOffers,
      bankOffers: parseStructuredBankOffers(rawOffers), domain: 'meesho', asin: null, lowestEver: 0,
    };
  }

  parseText(text, url) {
    const title = text.match(/^Title:\s*(.+)$/im)?.[1]?.trim() || '';
    const prices = [...String(text).matchAll(/(?:₹|Rs\.?)\s*([\d,]+)/gi)].map((m) => parsePrice(m[1]));
    const price = firstPrice(prices);
    const rawOffers = extractBankOffers(text);
    return { url, title, price, originalPrice: Math.max(price, prices[1] || price), rating: 0, reviewCount: 0,
      availability: price > 0 ? 'in_stock' : 'out_of_stock', sellerName: '', image: '', rawOffers,
      bankOffers: parseStructuredBankOffers(rawOffers), domain: 'meesho', asin: null, lowestEver: 0 };
  }
}

export async function scrapeMeesho(productUrl) { return new MeeshoCrawler().scrape(productUrl); }
