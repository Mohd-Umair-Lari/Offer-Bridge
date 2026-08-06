import {
  fetchPage, extractJsonLD, extractOG, extractBankOffers,
  parseStructuredBankOffers, parsePrice, decodeHTML, cleanExtractedTitle,
  deepFind, deepFindAll, isPlainText, sanitizeUrl,
  type ScrapedProduct,
} from './crawlerUtils';

const DEFAULT_FLIPKART_BANK_OFFERS = [
  'Bank Offer: 10% Instant Discount on HDFC Bank Credit Card EMI Transactions up to ₹1,500',
  'Bank Offer: 10% Instant Discount on ICICI Bank Credit and Debit Card Transactions',
  'Bank Offer: 5% Cashback on Flipkart Axis Bank Credit Card',
  'Bank Offer: 10% Instant Discount on SBI Credit Card EMI Transactions',
];

function flipkartSlugKeywords(url: string): string[] {
  try {
    const parts = new URL(url).pathname.split('/');
    const slug = parts[1] || '';
    return slug.split('-').map(s => s.trim().toLowerCase()).filter(s => s.length > 2 && !['buy', 'online', 'india'].includes(s));
  } catch {}
  return [];
}

function extractBestFlipkartPrice(candidates: unknown[]): number {
  for (const c of candidates) {
    const p = parsePrice(String(c));
    if (p > 90 && p !== 999 && p !== 299 && p !== 199 && p !== 99) return p;
  }
  return 0;
}

async function fetchFlipkartInternalApi(productUrl: string): Promise<ScrapedProduct | null> {
  const endpoints = [
    `https://1.rome.api.flipkart.com/api/4/page/fetch?url=${encodeURIComponent(new URL(productUrl).pathname)}`,
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
      const res = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(18000) });
      if (!res.ok) continue;
      const json = await res.json();

      const slugKws = flipkartSlugKeywords(productUrl);
      const titleCandidates = deepFindAll(json, ['title', 'name', 'productName', 'displayName', 'productTitle', 'shortTitle']) as string[];
      let title = '';
      let bestScore = -1;
      for (const t of titleCandidates) {
        if (typeof t === 'string' && t.length > 3) {
          const score = slugKws.length > 0 ? slugKws.reduce((acc, kw) => acc + (t.toLowerCase().includes(kw) ? 1 : 0), 0) : 1;
          if (score > bestScore) { bestScore = score; title = t; }
        }
      }
      if (slugKws.length > 0 && bestScore === 0) title = '';

      const priceCandidates = deepFindAll(json, ['specialPrice', 'finalPrice', 'sellingPrice', 'finalSellingPrice', 'discountedPrice', 'price', 'mrpPrice', 'basePrice', 'listingPrice']);
      let price = extractBestFlipkartPrice(priceCandidates);

      const img = deepFind(json, ['imageUrl', 'imageURL', 'image', 'primaryImageUrl', 'src']);
      const image = (img && typeof img === 'string' && img.startsWith('http')) ? img : '';

      let rawOffers: string[] = [];
      const offerTexts = deepFindAll(json, ['title', 'description', 'offerText']) as string[];
      for (const text of offerTexts) {
        if (text && typeof text === 'string' && text.length > 10) rawOffers.push(text);
      }
      const jsonStr = JSON.stringify(json);
      const extraOffers = extractBankOffers(jsonStr.replace(/\\n/g, ' ').replace(/\\"/g, '"'));
      rawOffers = [...new Set([...rawOffers, ...extraOffers])];

      // Fallback: scan raw JSON string for prices if deepFindAll missed them
      if (!price) {
        const jsonStr = JSON.stringify(json);
        for (const field of ['finalAmount','offerPrice','currentPrice','salePrice','discountPrice','promotionalPrice']) {
          const m = new RegExp(`"${field}"\\s*:\\s*(\\d+)`, 'i').exec(jsonStr);
          if (m) { const v = extractBestFlipkartPrice([parseInt(m[1])]); if (v) { price = v; break; } }
        }
      }
      // If still no price, search for ₹ in the JSON string
      if (!price) {
        const jsonStr = JSON.stringify(json);
        const m = /₹\s*([\d,]{4,})/.exec(jsonStr);
        if (m) { const v = parsePrice(m[1]); if (v > 90 && v !== 999) price = v; }
      }

      if (title && title.length > 3) {
        return {
          url: productUrl, title: decodeHTML(title), price, originalPrice: price,
          rating: 0, reviewCount: 0, availability: 'in_stock',
          sellerName: '', image, rawOffers,
          bankOffers: parseStructuredBankOffers(rawOffers),
          domain: 'flipkart', asin: null, lowestEver: 0,
        };
      }
    } catch {}
  }
  return null;
}

function parseFlipkartHTML(html: string, productUrl: string): ScrapedProduct {
  const ld = extractJsonLD(html);
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const slugKws = flipkartSlugKeywords(productUrl);

  let title = '';
  if (ld?.name) {
    const score = slugKws.length > 0 ? slugKws.reduce((acc, kw) => acc + ((ld.name as string).toLowerCase().includes(kw) ? 1 : 0), 0) : 1;
    if (score > 0) title = ld.name as string;
  }

  let price = ld?.offers ? parsePrice(String((ld.offers as any)?.price || 0)) : 0;
  if (price === 999) price = 0;

  if (!title || !price) {
    try {
      const nextMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (nextMatch) {
        const nextData = JSON.parse(nextMatch[1]);
        if (!title) {
          const titleCandidates = deepFindAll(nextData, ['title', 'name', 'productName', 'displayName', 'productTitle']) as string[];
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
          const pCandidates = deepFindAll(nextData, ['specialPrice', 'finalPrice', 'sellingPrice', 'finalSellingPrice', 'discountedPrice', 'price', 'mrpPrice', 'basePrice', 'listingPrice']);
          price = extractBestFlipkartPrice(pCandidates);
        }
      }
    } catch {}
  }

  if (!title) {
    title = html.match(/<span[^>]+class=["'][^"']*B_NuCI[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ||
            html.match(/<h1[^>]*class=["'][^"']*VU-ZEg[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ||
            html.match(/<h1[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ||
            extractOG(html, 'title') || '';
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
      if (m) { const v = parsePrice(m[1]); if (v > 90 && v !== 999) { price = v; break; } }
    }
  }
  if (!price) {
    const m = html.match(/₹\s*([\d]{2,}(?:,[\d]{2,3})*)/);
    if (m) { const v = parsePrice(m[1]); if (v > 90 && v !== 999) price = v; }
  }

  let originalPrice = price;
  const mrpMatch = html.match(/class=["'][^"']*(?:yRaY8j|_3I9_wc)[^"']*["'][^>]*>₹\s*([\d,]+)/i) ||
                   html.match(/MRP\s*:?\s*₹\s*([\d,]+)/i);
  if (mrpMatch) originalPrice = parsePrice(mrpMatch[1]);
  if (originalPrice < price) originalPrice = price;

  let rating = parseFloat(String(((ld as any)?.aggregateRating?.ratingValue) || 0)) || 0;
  if (!rating) {
    const ratMatch = html.match(/class=["'][^"']*(?:X4t32k|_3LWZlK)[^"']*["'][^>]*>([\d.]+)/) || html.match(/([\d.]+)\s*★/i);
    if (ratMatch) rating = parseFloat(ratMatch[1]) || 0;
  }

  let reviewCount = 0;
  const revMatch = html.match(/([\d,]+)\s*(?:Ratings|Reviews)/i);
  if (revMatch) reviewCount = parsePrice(revMatch[1]);

  let sellerName = '';
  const sellerMatch = html.match(/Fulfilled by\s*([^<.\n]+)/i) || html.match(/Seller[^<]*<span[^>]*>([^<]+)<\/span>/i);
  if (sellerMatch) sellerName = sellerMatch[1].trim();

  const isOOS = price === 0 || /sold\s*out|currently\s+unavailable|out\s+of\s+stock/i.test(html);

  const ldImage = (ld as any)?.image;
  let image = ldImage ? (Array.isArray(ldImage) ? ldImage[0] : ldImage) : '';
  if (!image) {
    const imgMatch = html.match(/<img[^>]+class=["']_396cs4[^"']*["'][^>]+src=["']([^"']+)["']/i);
    if (imgMatch) image = imgMatch[1];
  }

  const finalTitle = decodeHTML(title);
  if (finalTitle.toLowerCase().includes('buy products online at best price')) {
    throw new Error('Flipkart returned a generic page — please try again in a moment.');
  }

  const rawOffers = extractBankOffers(stripped);

  return {
    url: productUrl, title: finalTitle, price, originalPrice, rating, reviewCount,
    availability: isOOS ? 'out_of_stock' : 'in_stock',
    sellerName, image, rawOffers,
    bankOffers: parseStructuredBankOffers(rawOffers),
    domain: 'flipkart', asin: null, lowestEver: 0,
  };
}

function parseFromText(text: string, productUrl: string): ScrapedProduct {
  let title = '';
  const titleMeta = text.match(/^Title:\s+(.+)$/im);
  if (titleMeta?.[1]?.trim().length > 5) title = titleMeta[1].trim();

  if (!title) {
    for (const line of text.split('\n').slice(0, 50)) {
      const clean = line.replace(/^[#*\->|\s]+/, '').trim();
      if (clean.length > 15 && clean.length < 250 && !/^(home|login|cart|offers)/i.test(clean)) {
        title = clean;
        break;
      }
    }
  }

  const re = /₹\s*([\d,]+)/g;
  let m: RegExpExecArray | null;
  const prices: number[] = [];
  while ((m = re.exec(text.slice(0, 3000))) !== null) {
    const p = parsePrice(m[1]);
    if (p > 90 && p !== 999 && p !== 299 && p !== 199) prices.push(p);
  }
  const price = prices.length ? prices[0] : 0;
  const rawOffers = extractBankOffers(text);

  return {
    url: productUrl, title: title.trim(), price, originalPrice: price,
    rating: 0, reviewCount: 0, availability: price > 0 ? 'in_stock' : 'out_of_stock',
    sellerName: '', image: '', rawOffers,
    bankOffers: parseStructuredBankOffers(rawOffers),
    domain: 'flipkart', asin: null, lowestEver: 0,
  };
}

export async function scrapeFlipkart(productUrlInput: string): Promise<ScrapedProduct> {
  const productUrl = sanitizeUrl(productUrlInput);

  // Try internal API first (fastest path) — often gets title but not price
  const apiResult = await fetchFlipkartInternalApi(productUrl);

  // Always also fetch the page text to get price + richer offers
  let pageResult: ScrapedProduct | null = null;
  try {
    const html = await fetchPage(productUrl, 'flipkart');
    pageResult = isPlainText(html) ? parseFromText(html, productUrl) : parseFlipkartHTML(html, productUrl);
  } catch (err: any) {
    if (!apiResult) {
      // Nothing worked — propagate the error
      if (err.message?.includes('invalid') || err.message?.includes('no longer exists') || err.message?.includes('blocking')) throw err;
    }
    // We have apiResult, so a page fetch failure is acceptable
  }

  // Merge: prefer API title (cleaner), prefer page price (more reliable), merge offers
  const result: ScrapedProduct = {
    url: productUrl,
    title: apiResult?.title || pageResult?.title || '',
    price: (apiResult?.price && apiResult.price > 0) ? apiResult.price : (pageResult?.price || 0),
    originalPrice: (apiResult?.originalPrice && apiResult.originalPrice > 0) ? apiResult.originalPrice : (pageResult?.originalPrice || 0),
    rating: pageResult?.rating || apiResult?.rating || 0,
    reviewCount: pageResult?.reviewCount || apiResult?.reviewCount || 0,
    availability: pageResult?.availability || apiResult?.availability || 'in_stock',
    sellerName: pageResult?.sellerName || apiResult?.sellerName || '',
    image: apiResult?.image || pageResult?.image || '',
    rawOffers: [...new Set([...(apiResult?.rawOffers || []), ...(pageResult?.rawOffers || [])])],
    bankOffers: [],
    domain: 'flipkart',
    asin: null,
    lowestEver: 0,
  };
  if (!result.originalPrice) result.originalPrice = result.price;

  result.title = cleanExtractedTitle(result.title, productUrl);
  if (!result.rawOffers?.length) result.rawOffers = DEFAULT_FLIPKART_BANK_OFFERS;
  result.bankOffers = parseStructuredBankOffers(result.rawOffers);
  return result;
}
