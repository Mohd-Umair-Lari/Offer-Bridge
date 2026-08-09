// @ts-nocheck
import { BaseCrawler } from './base.js';
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
} from './utils.js';

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
          if (lowest !== Infinity && lowest < 20000000) {
            return Math.floor(lowest / 100);
          }
        }
      }
    }
  } catch (e) {}
  return 0;
}

function extractPriceFromTextHero(text) {
  if (!text) return { price: 0, originalPrice: 0 };

  let price = 0;
  let originalPrice = 0;

  // 1. Highest-confidence: explicit buybox/deal price right before delivery/stock info
  const buyboxContextMatch =
    text.match(/(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)\s*(?:\n[^\n]{0,30}\n)?\s*(?:FREE delivery|In stock|Order within|Delivering to|Add to cart)/i);
  if (buyboxContextMatch) {
    const p = parsePrice(buyboxContextMatch[1]);
    if (p > 0) price = p;
  }

  // 2. Savings/deal price line e.g. "₹799.00 with 77 percent savings"
  if (!price) {
    const dealSavingsMatch =
      text.match(/(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)\s+with\s+\d+%\s+savings/i) ||
      text.match(/(?:Deal\s+Price|With\s+deal|Payable\s+Amount)\s*[:\s]*(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
    if (dealSavingsMatch) {
      const p = parsePrice(dealSavingsMatch[1]);
      if (p > 0) price = p;
    }
  }

  // 3. MRP / original price
  const mrpMatch = text.match(/(?:M\.?R\.?P\.?|List\s+Price|Original\s+Price)\s*[:\s]*(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
  if (mrpMatch) {
    const p = parsePrice(mrpMatch[1]);
    if (p > 0) originalPrice = p;
  }

  // 4. Subtotal fallback
  if (!price) {
    const subtotalMatch =
      text.match(/Subtotal\s*(?:\n|\r\n)\s*(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i) ||
      text.match(/Price\s*\(₹[\d,.]+\s*x\)\s*(?:\n|\r\n)\s*(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
    if (subtotalMatch) {
      const p = parsePrice(subtotalMatch[1]);
      if (p > 0) price = p;
    }
  }

  // 5. Line-by-line scanning — last resort, strict filters
  if (!price) {
    const lines = text.slice(0, 3500).split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Skip lines that clearly belong to EMI tables, savings, discounts, offers, etc.
      if (/emi|per\s+month|\/month|monthly\s+payment|x\s+\d+m/i.test(line)) continue;
      if (/save\s+₹|savings?|upto|discount|cashback|off\s+on|exchange|protect|warranty|sponsored|fee|loan|no-cost/i.test(line)) continue;
      if (/bank\s+offer|credit\s+card|debit\s+card|instant\s+discount|hdfc|icici|sbi|axis/i.test(line)) continue;
      // Only match standalone price lines (₹X or Rs.X with nothing else)
      const m = line.match(/^(?:₹|Rs\.?)\s*([\d,]+(?:\.\d{2})?)$/i);
      if (m) {
        const p = parsePrice(m[1]);
        // Sanity: must be between ₹50 and ₹1,00,00,000
        if (p >= 50 && p <= 10000000) {
          price = p;
          break;
        }
      }
    }
  }

  // If we found an MRP but no sale price, use MRP as price
  if (originalPrice > 0 && !price) price = originalPrice;
  // If sale price exists but no MRP, set MRP = sale price
  if (price > 0 && !originalPrice) originalPrice = price;
  // Sanity: if sale price > MRP, something is wrong, swap
  if (originalPrice > 0 && price > originalPrice) originalPrice = price;

  return { price, originalPrice };
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

    const { price, originalPrice } = extractPriceFromTextHero(text);
    const rawOffers = extractBankOffers(text);

    return {
      title: title || extractTitleFromSlug(url),
      price,
      originalPrice,
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
        if (!result.price && ddgMeta.price > 0) {
          result.price = ddgMeta.price;
          result.originalPrice = ddgMeta.originalPrice || ddgMeta.price;
        }
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

    return this.normalizeProductData(result);
  }

  parseFromHTML(html, asin, productUrl, lowestEver) {
    const ld = extractJsonLD(html);
    const titleMatch = html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i);
    const title = titleMatch ? decodeHTML(titleMatch[1].replace(/<[^>]+>/g, '')) : (ld?.name || '');

    let price = 0;
    let originalPrice = 0;

    // Priority-ordered selectors: specific buybox containers first, then broader fallbacks.
    // The a-price-whole selector is intentionally LAST because it also matches EMI/card-price spans.
    const primaryPriceSelectors = [
      // Highest confidence: the "price to pay" container used in modern Amazon India layouts
      /class=["'][^"']*reinventPricePriceToPayMargin[^"']*["'][^>]*>[\s\S]{0,200}?₹\s*([\d,]+)/i,
      /class=["'][^"']*priceToPay[^"']*["'][^>]*>[\s\S]{0,200}?₹\s*([\d,]+)/i,
      /class=["'][^"']*apexPriceToPay[^"']*["'][^>]*>[\s\S]{0,200}?₹\s*([\d,]+)/i,
      /class=["'][^"']*corePrice_desktop[^"']*["'][^>]*>[\s\S]{0,200}?₹\s*([\d,]+)/i,
      // Legacy priceblock IDs
      /id=["']priceblock_dealprice["'][^>]*>[\s\S]{0,200}?₹\s*([\d,]+)/i,
      /id=["']priceblock_ourprice["'][^>]*>[\s\S]{0,200}?₹\s*([\d,]+)/i,
      /id=["']priceblock_saleprice["'][^>]*>[\s\S]{0,200}?₹\s*([\d,]+)/i,
      // Buybox block: look for the first a-price-whole INSIDE the corePriceDisplay section only
      /id=["']corePriceDisplay[^"']*["'][^>]*>[\s\S]{0,600}?class=["']a-price-whole["'][^>]*>([\d,]+)/i,
      // Very last resort: any a-price-whole span — may catch EMI, so validate later
      /class=["']a-price-whole["'][^>]*>([\d,]+)/i,
    ];

    for (const sel of primaryPriceSelectors) {
      const m = html.match(sel);
      if (m) {
        const p = parsePrice(m[1]);
        // Sanity: price must be >= ₹10 and <= ₹1 crore
        if (p >= 10 && p <= 10000000) {
          price = p;
          break;
        }
      }
    }

    if (!price && ld?.offers) {
      const offerObj = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      if (offerObj?.price) {
        const p = parsePrice(String(offerObj.price));
        if (p > 0) price = p;
      }
    }

    const mrpMatch = html.match(/<span[^>]+class=["'][^"']*a-text-price[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i) ||
                     html.match(/M\.?R\.?P\.?\s*:?\s*₹\s*([\d,]+)/i) ||
                     html.match(/List\s+Price\s*:?\s*₹\s*([\d,]+)/i);
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

    const stripped = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                         .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                         .replace(/<[^>]+>/g, ' ')
                         .replace(/\s+/g, ' ');

    const rawOffers = extractBankOffers(stripped);
    const bankOffers = parseStructuredBankOffers(rawOffers);

    let image = '';
    const imgMatch = html.match(/<img[^>]+id=["']landingImage["'][^>]+data-old-hires=["']([^"']+)["']/i) ||
                     html.match(/<img[^>]+id=["']landingImage["'][^>]+src=["']([^"']+)["']/i) ||
                     html.match(/<img[^>]+id=["']imgBlkFront["'][^>]+src=["']([^"']+)["']/i);
    if (imgMatch) image = imgMatch[1];
    if (!image && ld?.image) {
      image = Array.isArray(ld.image) ? ld.image[0] : (typeof ld.image === 'string' ? ld.image : (ld.image?.url || ''));
    }

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
    const titleMeta = text.match(/^Title:\s*(.+)$/im);
    if (titleMeta?.[1]?.trim().length > 5) {
      title = titleMeta[1].trim()
        .replace(/\s*:\s*Amazon\.in\s*:.*$/i, '')
        .replace(/\s*-\s*Amazon(?:\.in)?$/i, '')
        .replace(/\s*:\s*Amazon(?:\.in)?$/i, '')
        .trim();
    }

    if (!title) {
      const lines = text.split('\n');
      for (const line of lines.slice(0, 30)) {
        const clean = line.replace(/^[#*\->|\s]+/, '').trim();
        if (clean.length > 15 && clean.length < 250 && !/^\d/.test(clean) && !/amazon|shopping|conditions|privacy/i.test(clean)) {
          title = clean;
          break;
        }
      }
    }

    const { price, originalPrice } = extractPriceFromTextHero(text);

    // Rating & Review Count
    let rating = 0;
    const ratingMatch = text.match(/\[([\d.]+)\s*(?:_[\d.]+\s*out of 5 stars_|out of 5 stars)\]/i)
      || text.match(/([\d.]+)\s*out of 5 stars/i);
    if (ratingMatch) {
      rating = parseFloat(ratingMatch[1]) || 0;
    }

    let reviewCount = 0;
    const revMatch = text.match(/\[\(([\d,]+)\)\]/i)
      || text.match(/\(([\d,]+)\s*ratings?\)/i);
    if (revMatch) {
      reviewCount = parsePrice(revMatch[1]);
    }

    // Seller Name
    let sellerName = '';
    const sellerMatch = text.match(/Sold by\s*(?:\n|\r\n)?\s*\[?([^\]\n<\(\)]+?)(?:\]|\n|\r|Payment|Ships|$)/i);
    if (sellerMatch && !sellerMatch[1].toLowerCase().includes('http') && !sellerMatch[1].toLowerCase().includes('amazon')) {
      sellerName = sellerMatch[1].trim();
    }

    // Image
    let image = '';
    const imgMatch = text.match(/https:\/\/m\.media-amazon\.com\/images\/I\/([A-Za-z0-9+_-]+)\._SX\d+_\.jpg/i)
      || text.match(/https:\/\/m\.media-amazon\.com\/images\/I\/([A-Za-z0-9+_-]+)\.jpg/i);
    if (imgMatch) {
      image = `https://m.media-amazon.com/images/I/${imgMatch[1]}._SX679_.jpg`;
    }

    const isOutOfStock = /currently unavailable|out of stock/i.test(text);
    const availability = isOutOfStock || price === 0 ? 'out_of_stock' : 'in_stock';

    const rawOffers = extractBankOffers(text);
    const bankOffers = parseStructuredBankOffers(rawOffers);

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
      lowestEver: 0,
    };
  }
}

export async function scrapeAmazon(productUrl) {
  const crawler = new AmazonCrawler();
  return crawler.scrape(productUrl);
}
