import { BaseCrawler } from './base';
import {
  fetchPage,
  extractBankOffers,
  parseStructuredBankOffers,
  parsePrice,
  decodeHTML,
  isPlainText,
  sanitizeUrl,
  cleanExtractedTitle,
} from './utils';

async function fetchKeepa(asin) {
  try {
    const keepaUrl = `https://api.keepa.com/product?key=${process.env.KEEPA_API_KEY}&domain=4&asin=${asin}`;
    const res = await fetch(keepaUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.products?.[0]?.csv) {
        const csv = data.products[0].csv[1];
        if (Array.isArray(csv) && csv.length > 0) {
          let lowest = Infinity;
          for (let i = 1; i < csv.length; i += 2) {
            const p = csv[i];
            if (p > 0 && p < lowest) lowest = p;
          }
          if (lowest !== Infinity && lowest < 2000000) {
            return Math.floor(lowest / 100);
          }
        }
      }
    }
  } catch (e) {}
  return 0;
}

export class AmazonCrawler extends BaseCrawler {
  constructor() {
    super('Amazon', ['amazon.in', 'amazon.com', 'amzn.in', 'amzn.to']);
  }

  async scrape(productUrlInput) {
    const productUrl = sanitizeUrl(productUrlInput);
    const asin = productUrl.match(/\/dp\/([A-Z0-9]{10})/i)?.[1]
              || productUrl.match(/\/gp\/product\/([A-Z0-9]{10})/i)?.[1];

    let lowestEver = 0;
    if (asin && process.env.KEEPA_API_KEY) {
      lowestEver = await fetchKeepa(asin);
    }

    const html = await fetchPage(productUrl, 'amazon');

    let result;
    if (isPlainText(html)) {
      result = this.parseFromText(html, asin, productUrl);
    } else {
      result = this.parseFromHTML(html, asin, productUrl, lowestEver);
    }

    result.title = cleanExtractedTitle(result.title, productUrl);
    return result;
  }

  parseFromHTML(html, asin, productUrl, lowestEver) {
    const titleMatch = html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i);
    const title = titleMatch ? decodeHTML(titleMatch[1].replace(/<[^>]+>/g, '')) : '';

    let price = 0;
    const priceSelectors = [
      /<span[^>]+class=["']a-price-whole["'][^>]*>([\s\S]*?)<\/span>/i,
      /<span[^>]+id=["']priceblock_ourprice["'][^>]*>([\s\S]*?)<\/span>/i,
      /<span[^>]+id=["']priceblock_dealprice["'][^>]*>([\s\S]*?)<\/span>/i,
      /<span[^>]+class=["']a-size-medium a-color-price["'][^>]*>([\s\S]*?)<\/span>/i,
    ];

    for (const sel of priceSelectors) {
      const m = html.match(sel);
      if (m) {
        const p = parsePrice(m[1]);
        if (p > 50) { price = p; break; }
      }
    }

    if (!price && html.includes('a-color-price')) {
      const backupMatch = html.match(/₹\s*([\d,]+(?:\.\d+)?)/);
      if (backupMatch) {
        const p = parsePrice(backupMatch[1]);
        if (p > 50) price = p;
      }
    }

    // Original MRP
    let originalPrice = 0;
    const mrpMatch = html.match(/<span[^>]+class=["'][^"']*a-text-price[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i);
    if (mrpMatch) {
      originalPrice = parsePrice(mrpMatch[1]);
    }
    if (originalPrice < price) originalPrice = price;

    // Rating & Reviews
    let rating = 0;
    const ratingMatch = html.match(/([\d.]+)\s*out of 5 stars/i) || html.match(/class=["'][^"']*a-icon-star[^"']*["'][^>]*>([\d.]+)/i);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]) || 0;
    }

    let reviewCount = 0;
    const revMatch = html.match(/id=["']acrCustomerReviewText["'][^>]*>([\d,]+)/i);
    if (revMatch) {
      reviewCount = parsePrice(revMatch[1]);
    }

    // Seller Name
    let sellerName = '';
    const sellerMatch = html.match(/id=["']merchant-info["'][^>]*>[\s\S]*?Sold by\s*<a[^>]*>([^<]+)<\/a>/i) ||
                        html.match(/Sold by\s*:?\s*([^<\n,]+)/i);
    if (sellerMatch) {
      sellerName = sellerMatch[1].trim();
    }

    const isOutOfStock = price === 0 || /currently unavailable|out of stock/i.test(html);
    const availability = isOutOfStock ? 'out_of_stock' : 'in_stock';

    const stripped = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                         .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                         .replace(/<[^>]+>/g, ' ')
                         .replace(/\s+/g, ' ');

    const rawOffers = extractBankOffers(stripped);
    const bankOffers = parseStructuredBankOffers(rawOffers);

    let image = '';
    const imgMatch = html.match(/<img[^>]+id=["']landingImage["'][^>]+data-old-hires=["']([^"']+)["']/i) ||
                     html.match(/<img[^>]+id=["']landingImage["'][^>]+src=["']([^"']+)["']/i);
    if (imgMatch) image = imgMatch[1];

    return {
      url: productUrl,
      title,
      price,
      originalPrice,
      rating,
      reviewCount,
      availability,
      sellerName,
      image,
      asin,
      rawOffers,
      bankOffers,
      domain: 'amazon',
      lowestEver,
    };
  }

  parseFromText(text, asin, productUrl) {
    let title = '';
    const lines = text.split('\n');
    for (const line of lines.slice(0, 30)) {
      const clean = line.replace(/^[#*\->|\s]+/, '').trim();
      if (clean.length > 15 && clean.length < 200 && !/^\d/.test(clean)) {
        title = clean;
        break;
      }
    }

    let price = 0;
    const priceRe = /₹\s*([\d,]+)/g;
    let m;
    const prices = [];
    while ((m = priceRe.exec(text.slice(0, 2000))) !== null) {
      const p = parsePrice(m[1]);
      if (p > 50) prices.push(p);
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
      asin,
      rawOffers,
      bankOffers,
      domain: 'amazon',
      lowestEver: 0,
    };
  }
}

// Backward compatibility helper function export
export async function scrapeAmazon(productUrl) {
  const crawler = new AmazonCrawler();
  return crawler.scrape(productUrl);
}
