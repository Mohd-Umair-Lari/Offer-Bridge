import { BaseCrawler } from './base';
import {
  fetchPage,
  extractBankOffers,
  parseStructuredBankOffers,
  parsePrice,
  decodeHTML,
  extractJsonLD,
  isPlainText,
  sanitizeUrl,
  cleanExtractedTitle,
  extractTitleFromSlug,
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

async function fetchAmazonMetadataViaDDG(asin, url) {
  try {
    const query = asin ? `site:amazon.in ${asin}` : `site:amazon.in ${extractTitleFromSlug(url)}`;
    const ddgUrl = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const text = await res.text();

    let title = '';
    const titleMatch = text.match(/##\s*\[([^\]]+)\]\(https:\/\/[^)]*amazon\.in[^)]*\)/i) ||
                       text.match(/\[([^\]]{15,200})\]\(https:\/\/duckduckgo\.com\/l\/\?uddg=https%3A%2F%2Fwww\.amazon\.in/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/\s*-\s*Amazon(?:\.in)?$/i, '').trim();
    }

    let price = 0;
    // Exclude EMI lines when searching for price
    const cleanTextForPrice = text.replace(/EMI\s+starts\s+at[^\n]*/gi, '')
                                  .replace(/No\s+Cost\s+EMI[^\n]*/gi, '');
    const priceRe = /₹\s*([\d,]+)/g;
    let m;
    const prices = [];
    while ((m = priceRe.exec(cleanTextForPrice.slice(0, 4000))) !== null) {
      const p = parsePrice(m[1]);
      if (p > 500 && p !== 999 && p !== 299) prices.push(p);
    }
    if (prices.length > 0) price = Math.min(...prices);

    const rawOffers = extractBankOffers(text);

    return {
      title: title || extractTitleFromSlug(url),
      price,
      rawOffers,
    };
  } catch (e) {}
  return null;
}

const DEFAULT_AMAZON_BANK_OFFERS = [
  'Bank Offer: Upto ₹4,000.00 discount on select Credit Cards',
  'Bank Offer: Flat ₹1,500 Instant Discount on HDFC Bank Credit Card EMI',
  'Bank Offer: 10% Instant Discount up to ₹1,250 on ICICI Bank Credit Cards',
  'Bank Offer: 10% Instant Discount up to ₹1,000 on SBI Credit Card & Debit Card',
  'Bank Offer: 5% Unlimited Cashback on Amazon Pay ICICI Bank Credit Card',
];

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

    let result;
    try {
      const html = await fetchPage(productUrl, 'amazon');
      if (isPlainText(html)) {
        result = this.parseFromText(html, asin, productUrl);
      } else {
        result = this.parseFromHTML(html, asin, productUrl, lowestEver);
      }
    } catch (e) {
      result = {
        url: productUrl,
        title: '',
        price: 0,
        originalPrice: 0,
        rating: 0,
        reviewCount: 0,
        availability: 'in_stock',
        sellerName: '',
        image: '',
        asin,
        rawOffers: [],
        bankOffers: [],
        domain: 'amazon',
        lowestEver,
      };
    }

    const cleanTitle = cleanExtractedTitle(result.title, productUrl);
    if (!cleanTitle || cleanTitle === 'E-Commerce Product' || result.price === 0) {
      const ddgMeta = await fetchAmazonMetadataViaDDG(asin, productUrl);
      if (ddgMeta) {
        if (ddgMeta.title) result.title = ddgMeta.title;
        if (!result.price && ddgMeta.price) result.price = ddgMeta.price;
        if (!result.rawOffers?.length && ddgMeta.rawOffers?.length) {
          result.rawOffers = ddgMeta.rawOffers;
        }
      }
    }

    result.title = cleanExtractedTitle(result.title, productUrl);

    if (!result.rawOffers || result.rawOffers.length === 0) {
      result.rawOffers = DEFAULT_AMAZON_BANK_OFFERS;
    }
    result.bankOffers = parseStructuredBankOffers(result.rawOffers);

    return result;
  }

  parseFromHTML(html, asin, productUrl, lowestEver) {
    const ld = extractJsonLD(html);
    const titleMatch = html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i);
    const title = titleMatch ? decodeHTML(titleMatch[1].replace(/<[^>]+>/g, '')) : (ld?.name || '');

    let price = 0;
    let originalPrice = 0;

    // 1. Primary price selectors for Amazon selling price
    const primaryPriceSelectors = [
      /<span[^>]+class=["'][^"']*reinventPricePriceToPayMargin[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i,
      /<span[^>]+class=["'][^"']*priceToPay[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i,
      /<span[^>]+class=["'][^"']*apexPriceToPay[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i,
      /<span[^>]+class=["'][^"']*corePrice_desktop[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i,
      /<span[^>]+class=["']a-price-whole["'][^>]*>([\s\S]*?)<\/span>/i,
    ];

    for (const sel of primaryPriceSelectors) {
      const m = html.match(sel);
      if (m) {
        const p = parsePrice(m[1]);
        if (p > 500) {
          price = p;
          break;
        }
      }
    }

    if (!price && ld?.offers) {
      const offerObj = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      if (offerObj?.price) {
        const p = parsePrice(String(offerObj.price));
        if (p > 500) price = p;
      }
    }

    // 2. Extract MRP
    const mrpMatch = html.match(/<span[^>]+class=["'][^"']*a-text-price[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i) ||
                     html.match(/M\.?R\.?P\.?\s*:?\s*₹\s*([\d,]+)/i);
    if (mrpMatch) {
      originalPrice = parsePrice(mrpMatch[1]);
    }

    if (originalPrice > 0 && price === 0) price = originalPrice;
    if (price > 0 && originalPrice === 0) originalPrice = price;

    let rating = 0;
    const ratingMatch = html.match(/([\d.]+)\s*out of 5 stars/i) || html.match(/class=["'][^"']*a-icon-star[^"']*["'][^>]*>([\d.]+)/i);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]) || 0;
    }

    let reviewCount = 0;
    const revMatch = html.match(/id=["']acrCustomerReviewText["'][^>]*>([\d,]+)/i) || html.match(/\(([\d,]+)\s*ratings?\)/i);
    if (revMatch) {
      reviewCount = parsePrice(revMatch[1]);
    }

    let sellerName = '';
    const sellerMatch = html.match(/id=["']merchant-info["'][^>]*>[\s\S]*?Sold by\s*<a[^>]*>([^<]+)<\/a>/i) ||
                        html.match(/Sold by\s*:?\s*([^<\n,]+)/i);
    if (sellerMatch) {
      sellerName = sellerMatch[1].trim();
    }

    const isOutOfStock = price === 0 || /currently unavailable|out of stock/i.test(html);
    const availability = isOutOfStock ? 'out_of_stock' : 'in_stock';

    // Strip script and style tags before extracting bank offers
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
      if (clean.length > 15 && clean.length < 200 && !/^\d/.test(clean) && !/amazon|shopping|conditions|privacy/i.test(clean)) {
        title = clean;
        break;
      }
    }

    let price = 0;
    const cleanTextForPrice = text.replace(/EMI\s+starts\s+at[^\n]*/gi, '')
                                  .replace(/No\s+Cost\s+EMI[^\n]*/gi, '');
    const priceRe = /₹\s*([\d,]+)/g;
    let m;
    const prices = [];
    while ((m = priceRe.exec(cleanTextForPrice.slice(0, 3000))) !== null) {
      const p = parsePrice(m[1]);
      if (p > 500 && p !== 999 && p !== 299) prices.push(p);
    }
    if (prices.length > 0) price = Math.min(...prices);

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

export async function scrapeAmazon(productUrl) {
  const crawler = new AmazonCrawler();
  return crawler.scrape(productUrl);
}
