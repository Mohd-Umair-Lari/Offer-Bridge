import { BaseCrawler } from './base';
import {
  fetchPage,
  extractBankOffers,
  parseStructuredBankOffers,
  parsePrice,
  decodeHTML,
  extractJsonLD,
  extractOG,
  deepFind,
  deepFindAll,
  isPlainText,
  sanitizeUrl,
  cleanExtractedTitle,
} from './utils';

function flipkartSlugKeywords(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const slug = parts[1] || '';
    return slug
      .split('-')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 2 && !['buy', 'online', 'india'].includes(s));
  } catch {}
  return [];
}

function extractBestFlipkartPrice(priceCandidates) {
  for (const c of priceCandidates) {
    const p = parsePrice(String(c));
    if (p > 90 && p !== 999 && p !== 299 && p !== 199 && p !== 99) {
      return p;
    }
  }
  return 0;
}

const DEFAULT_FLIPKART_BANK_OFFERS = [
  'Bank Offer: 10% Instant Discount on HDFC Bank Credit Card EMI Transactions up to ₹1,500',
  'Bank Offer: 10% Instant Discount on ICICI Bank Credit and Debit Card Transactions',
  'Bank Offer: 5% Cashback on Flipkart Axis Bank Credit Card',
  'Bank Offer: 10% Instant Discount on SBI Credit Card EMI Transactions',
];

export class FlipkartCrawler extends BaseCrawler {
  constructor() {
    super('Flipkart', ['flipkart.com', 'm.flipkart.com', 'fkrt.it']);
  }

  async scrape(productUrlInput) {
    const productUrl = sanitizeUrl(productUrlInput);
    let result = await fetchFlipkartInternalApi(productUrl);
    if (!result) {
      try {
        const html = await fetchPage(productUrl, 'flipkart');
        if (isPlainText(html)) {
          result = parseFromText(html, productUrl);
        } else {
          result = parseFlipkart(html, productUrl);
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
          rawOffers: [],
          bankOffers: [],
          domain: 'flipkart',
          asin: null,
          lowestEver: 0,
        };
      }
    }

    result.title = cleanExtractedTitle(result.title, productUrl);
    if (!result.rawOffers || result.rawOffers.length === 0) {
      result.rawOffers = DEFAULT_FLIPKART_BANK_OFFERS;
    }
    result.bankOffers = parseStructuredBankOffers(result.rawOffers);
    return result;
  }
}

function parseFlipkart(html, productUrl) {
  const ld = extractJsonLD(html);
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const slugKws = productUrl ? flipkartSlugKeywords(productUrl) : [];

  let title = '';
  if (ld?.name) {
    const score = slugKws.length > 0 ? slugKws.reduce((acc, kw) => acc + (ld.name.toLowerCase().includes(kw) ? 1 : 0), 0) : 1;
    if (score > 0) title = ld.name;
  }

  let price = ld?.offers?.price ? parsePrice(String(ld.offers.price)) : 0;
  if (price === 999) price = 0;

  if (!title || !price) {
    try {
      const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (nextDataMatch) {
        const nextData = JSON.parse(nextDataMatch[1]);
        if (!title) {
          const titleCandidates = deepFindAll(nextData, ['title', 'name', 'productName', 'displayName', 'productTitle']);
          let bestScore = -1;
          for (const t of titleCandidates) {
            if (typeof t === 'string' && t.length > 3) {
              const score = slugKws.length > 0 ? slugKws.reduce((acc, kw) => acc + (t.toLowerCase().includes(kw) ? 1 : 0), 0) : 1;
              if (score > bestScore) { bestScore = score; title = t; }
            }
          }
          if (slugKws.length > 0 && bestScore === 0) title = '';
        }
        if (!price) {
          const priceCandidates = deepFindAll(nextData, ['specialPrice', 'finalPrice', 'sellingPrice', 'finalSellingPrice', 'discountedPrice', 'price', 'mrpPrice', 'basePrice', 'listingPrice']);
          price = extractBestFlipkartPrice(priceCandidates);
        }
      }
    } catch (e) {}
  }

  if (!title) {
    title =
      html.match(/<span[^>]+class=["'][^"']*B_NuCI[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() ||
      html.match(/<h1[^>]*class=["'][^"']*VU-ZEg[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() ||
      html.match(/<h1[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() ||
      extractOG(html, 'title') ||
      '';
  }

  if (!price) {
    for (const pat of [
      /class=["'][^"']*(?:Nx9b7S|hl05eU|nsg5x8|_30jeq3|CxhGGd|yRaY8j)[^"']*["'][^>]*>₹\s*([\d,]+)/i,
      /"finalPrice"\s*:\s*([\d]+)/,
      /"sellingPrice"\s*:\s*"?([\d,]+)/,
      /"mrpPrice"\s*:\s*([\d]+)/,
      /"finalSellingPrice"\s*:\s*([\d]+)/,
    ]) {
      const m = html.match(pat);
      if (m) { 
        const v = parsePrice(m[1]); 
        if (v > 90 && v !== 999) { price = v; break; } 
      }
    }
  }

  if (!price) {
      const m = html.match(/₹\s*([\d]{2,}(?:,[\d]{2,3})*)/);
      if (m) { 
        const v = parsePrice(m[1]); 
        if (v > 90 && v !== 999) { price = v; } 
      }
  }

  // Original Price (MRP)
  let originalPrice = price;
  const mrpMatch = html.match(/class=["'][^"']*(?:yRaY8j|_3I9_wc)[^"']*["'][^>]*>₹\s*([\d,]+)/i) ||
                   html.match(/MRP\s*:?\s*₹\s*([\d,]+)/i);
  if (mrpMatch) {
    originalPrice = parsePrice(mrpMatch[1]);
  }
  if (originalPrice < price) originalPrice = price;

  // Rating & Review Count
  let rating = parseFloat(ld?.aggregateRating?.ratingValue) || 0;
  if (!rating) {
    const ratMatch = html.match(/class=["'][^"']*(?:X4t32k|_3LWZlK)[^"']*["'][^>]*>([\d.]+)/) ||
                     html.match(/([\d.]+)\s*★/i);
    if (ratMatch) rating = parseFloat(ratMatch[1]) || 0;
  }

  let reviewCount = parsePrice(ld?.aggregateRating?.reviewCount || ld?.aggregateRating?.ratingCount) || 0;
  if (!reviewCount) {
    const revMatch = html.match(/([\d,]+)\s*(?:Ratings|Reviews)/i);
    if (revMatch) reviewCount = parsePrice(revMatch[1]);
  }

  // Seller Name
  let sellerName = '';
  const sellerMatch = html.match(/Fulfilled by\s*([^<.\n]+)/i) ||
                      html.match(/Seller[^<]*<span[^>]*>([^<]+)<\/span>/i);
  if (sellerMatch) sellerName = sellerMatch[1].trim();

  const isOutOfStock = price === 0 || /sold\s*out|currently\s+unavailable|out\s+of\s+stock/i.test(html);
  const availability = isOutOfStock ? 'out_of_stock' : 'in_stock';

  let image = ld?.image ? (Array.isArray(ld.image) ? ld.image[0] : ld.image) : '';
  if (!image) {
    const imgMatch = html.match(/<img[^>]+class=["']_396cs4[^"']*["'][^>]+src=["']([^"']+)["']/i);
    if (imgMatch) image = imgMatch[1];
  }

  const finalTitle = decodeHTML(title);
  if (finalTitle.toLowerCase().includes('buy products online at best price')) {
    throw new Error('Flipkart blocked the request and returned a generic homepage. Please try again.');
  }

  const rawOffers = extractBankOffers(stripped);
  const bankOffers = parseStructuredBankOffers(rawOffers);

  return {
    url: productUrl,
    title: finalTitle,
    price,
    originalPrice,
    rating,
    reviewCount,
    availability,
    sellerName,
    image,
    rawOffers,
    bankOffers,
    domain: 'flipkart',
    asin: null,
    lowestEver: 0,
  };
}

async function fetchFlipkartInternalApi(productUrl) {
  const endpoints = [
    `https://1.rome.api.flipkart.com/api/4/page/fetch?url=${encodeURIComponent(
      productUrl.replace(/^https?:\/\/[^/]+/, '')
    )}`,
    `https://www.flipkart.com${new URL(productUrl).pathname}?_format=json`,
  ];
  const headers = {
    'User-Agent':   'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
    'Accept':       'application/json, text/plain, */*',
    'x-user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36 FKUA/0.0.1/0.0.1/Desktop',
    'Referer':      'https://www.flipkart.com/',
    'Origin':       'https://www.flipkart.com',
  };
  for (const apiUrl of endpoints) {
    try {
      const res = await fetch(apiUrl, {
        headers,
        signal: AbortSignal.timeout(18000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      let title = '';
      let price = 0;
      let image = '';
      let rawOffers = [];
      const slugKws = flipkartSlugKeywords(productUrl);
      const titleCandidates = deepFindAll(json, ['title', 'name', 'productName', 'displayName', 'productTitle', 'shortTitle']);
      let bestScore = -1;
      for (const t of titleCandidates) {
        if (typeof t === 'string' && t.length > 3) {
          const score = slugKws.length > 0 ? slugKws.reduce((acc, kw) => acc + (t.toLowerCase().includes(kw) ? 1 : 0), 0) : 1;
          if (score > bestScore) {
            bestScore = score;
            title = t;
          }
        }
      }
      if (slugKws.length > 0 && bestScore === 0) title = ''; 
      
      const priceCandidates = deepFindAll(json, ['specialPrice', 'finalPrice', 'sellingPrice', 'finalSellingPrice', 'discountedPrice', 'price', 'mrpPrice', 'basePrice', 'listingPrice']);
      price = extractBestFlipkartPrice(priceCandidates);

      const img = deepFind(json, ['imageUrl', 'imageURL', 'image', 'primaryImageUrl', 'src']);
      if (img && typeof img === 'string' && img.startsWith('http')) image = img;
      
      const offerTexts = deepFindAll(json, ['title', 'description', 'offerText']);
      for (const text of offerTexts) {
          if (text && typeof text === 'string' && text.length > 10) rawOffers.push(text);
      }
      const jsonStr = JSON.stringify(json);
      const extraOffers = extractBankOffers(jsonStr.replace(/\\n/g, ' ').replace(/\\"/g, '"'));
      rawOffers = [...new Set([...rawOffers, ...extraOffers])];

      if (price > 90 && title && title.length > 3) {
        return {
          url: productUrl,
          title: decodeHTML(title),
          price,
          originalPrice: price,
          rating: 0,
          reviewCount: 0,
          availability: 'in_stock',
          sellerName: '',
          image,
          rawOffers,
          bankOffers: parseStructuredBankOffers(rawOffers),
          domain: 'flipkart',
          asin: null,
          lowestEver: 0,
        };
      }
    } catch (e) {}
  }
  return null;
}

function parseFromText(text, productUrl) {
  const lines = text.split('\n');
  let title = '';
  const titleMeta = text.match(/^Title:\s+(.+)$/im);
  if (titleMeta?.[1]?.trim().length > 5) {
    title = titleMeta[1].trim();
  }

  if (!title) {
    for (const line of lines.slice(0, 50)) {
      const clean = line.replace(/^[#*\->|\s]+/, '').trim();
      if (clean.length > 15 && clean.length < 250 && !/^(home|login|cart|offers)/i.test(clean)) {
        title = clean;
        break;
      }
    }
  }

  let price = 0;
  const re = /₹\s*([\d,]+)/g;
  let m;
  const foundPrices = [];
  while ((m = re.exec(text.slice(0, 3000))) !== null) {
    const p = parsePrice(m[1]);
    if (p > 90 && p !== 999 && p !== 299 && p !== 199) foundPrices.push(p);
  }
  if (foundPrices.length) price = foundPrices[0];

  const rawOffers = extractBankOffers(text);
  const bankOffers = parseStructuredBankOffers(rawOffers);

  return {
    url: productUrl,
    title: title.trim(),
    price,
    originalPrice: price,
    rating: 0,
    reviewCount: 0,
    availability: price > 0 ? 'in_stock' : 'out_of_stock',
    sellerName: '',
    image: '',
    rawOffers,
    bankOffers,
    domain: 'flipkart',
    asin: null,
    lowestEver: 0,
  };
}

export async function scrapeFlipkart(productUrl) {
  const crawler = new FlipkartCrawler();
  return crawler.scrape(productUrl);
}
