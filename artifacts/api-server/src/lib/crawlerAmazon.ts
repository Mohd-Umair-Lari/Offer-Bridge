import {
  fetchPage, fetchAmazonMetadataViaDDG, extractJsonLD, extractBankOffers,
  parseStructuredBankOffers, parsePrice, decodeHTML, cleanExtractedTitle,
  extractTitleFromSlug, isBotWall, isPlainText, sanitizeUrl,
  type ScrapedProduct,
} from './crawlerUtils';

const DEFAULT_AMAZON_BANK_OFFERS = [
  'Bank Offer: Upto ₹4,000.00 discount on select Credit Cards',
  'Bank Offer: Flat ₹1,500 Instant Discount on HDFC Bank Credit Card EMI',
  'Bank Offer: 10% Instant Discount up to ₹1,250 on ICICI Bank Credit Cards',
  'Bank Offer: 10% Instant Discount up to ₹1,000 on SBI Credit Card & Debit Card',
  'Bank Offer: 5% Unlimited Cashback on Amazon Pay ICICI Bank Credit Card',
];

function parseFromHTML(html: string, asin: string | null, productUrl: string, lowestEver: number): ScrapedProduct {
  const ld = extractJsonLD(html);

  const titleMatch = html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i);
  const title = titleMatch ? decodeHTML(titleMatch[1].replace(/<[^>]+>/g, '')) : ((ld?.name as string) || '');

  let price = 0;
  let originalPrice = 0;

  const primarySelectors = [
    /<span[^>]+class=["'][^"']*reinventPricePriceToPayMargin[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i,
    /<span[^>]+class=["'][^"']*priceToPay[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i,
    /<span[^>]+class=["'][^"']*apexPriceToPay[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i,
    /<span[^>]+class=["'][^"']*corePrice_desktop[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i,
    /<span[^>]+class=["']a-price-whole["'][^>]*>([\s\S]*?)<\/span>/i,
  ];

  for (const sel of primarySelectors) {
    const m = html.match(sel);
    if (m) { const p = parsePrice(m[1]); if (p > 1000) { price = p; break; } }
  }

  if (!price && ld?.offers) {
    const offerObj = (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers) as Record<string, unknown>;
    if (offerObj?.price) { const p = parsePrice(String(offerObj.price)); if (p > 1000) price = p; }
  }

  const mrpMatch = html.match(/<span[^>]+class=["'][^"']*a-text-price[^"']*["'][^>]*>[\s\S]*?₹\s*([\d,]+)/i) ||
                   html.match(/M\.?R\.?P\.?\s*:?\s*₹\s*([\d,]+)/i);
  if (mrpMatch) originalPrice = parsePrice(mrpMatch[1]);

  if (originalPrice > 0 && price === 0) price = originalPrice;
  if (price > 0 && originalPrice === 0) originalPrice = price;

  let rating = 0;
  const ratingMatch = html.match(/([\d.]+)\s*out of 5 stars/i) || html.match(/class=["'][^"']*a-icon-star[^"']*["'][^>]*>([\d.]+)/i);
  if (ratingMatch) rating = parseFloat(ratingMatch[1]) || 0;

  let reviewCount = 0;
  const revMatch = html.match(/id=["']acrCustomerReviewText["'][^>]*>([\d,]+)/i) || html.match(/\(([\d,]+)\s*ratings?\)/i);
  if (revMatch) reviewCount = parsePrice(revMatch[1]);

  let sellerName = '';
  const sellerMatch = html.match(/id=["']merchant-info["'][^>]*>[\s\S]*?Sold by\s*<a[^>]*>([^<]+)<\/a>/i) ||
                      html.match(/Sold by\s*:?\s*([^<\n,]+)/i);
  if (sellerMatch) sellerName = sellerMatch[1].trim();

  const isOOS = price === 0 || /currently unavailable|out of stock/i.test(html);

  const stripped = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  const rawOffers = extractBankOffers(stripped);

  let image = '';
  const imgMatch = html.match(/<img[^>]+id=["']landingImage["'][^>]+data-old-hires=["']([^"']+)["']/i) ||
                   html.match(/<img[^>]+id=["']landingImage["'][^>]+src=["']([^"']+)["']/i);
  if (imgMatch) image = imgMatch[1];

  return {
    url: productUrl, title, price, originalPrice, rating, reviewCount,
    availability: isOOS ? 'out_of_stock' : 'in_stock',
    sellerName, image, asin, rawOffers,
    bankOffers: parseStructuredBankOffers(rawOffers),
    domain: 'amazon', lowestEver,
  };
}

function parseFromText(text: string, asin: string | null, productUrl: string): ScrapedProduct {
  let title = '';
  const lines = text.split('\n');
  for (const line of lines.slice(0, 40)) {
    const clean = line.replace(/^[#*\->|\s]+/, '').trim();
    if (clean.length > 15 && clean.length < 220 && !/^\d/.test(clean) &&
        !/amazon|shopping|conditions|privacy|sign in|cart|wishlist/i.test(clean)) {
      title = clean;
      break;
    }
  }

  // Strip offer/discount lines before searching for the selling price
  const textWithoutOffers = text.replace(/(?:bank\s+offer|credit\s+card|debit\s+card|emi|cashback|buy\s+for|save|discount)[^\n]*/gi, '');
  const priceRe = /(?:₹|Rs\.?)\s*([\d,]+)/g;
  let m: RegExpExecArray | null;
  const prices: number[] = [];
  while ((m = priceRe.exec(textWithoutOffers.slice(0, 5000))) !== null) {
    const p = parsePrice(m[1]);
    if (p > 100 && p !== 999 && p !== 299) prices.push(p);
  }
  // Also scan for patterns like "**₹79,900**" (markdown bold) used by Jina
  const mdPriceRe = /\*{1,2}(?:₹|Rs\.?)\s*([\d,]+)\*{0,2}/g;
  while ((m = mdPriceRe.exec(text.slice(0, 5000))) !== null) {
    const p = parsePrice(m[1]);
    if (p > 100 && p !== 999 && p !== 299) prices.push(p);
  }
  const price = prices.length ? Math.min(...prices) : 0;
  const rawOffers = extractBankOffers(text);

  return {
    url: productUrl, title, price, originalPrice: price, rating: 0, reviewCount: 0,
    availability: price > 0 ? 'in_stock' : 'out_of_stock',
    sellerName: '', image: '', asin, rawOffers,
    bankOffers: parseStructuredBankOffers(rawOffers),
    domain: 'amazon', lowestEver: 0,
  };
}

export async function scrapeAmazon(productUrlInput: string): Promise<ScrapedProduct> {
  const productUrl = sanitizeUrl(productUrlInput);
  const asin = productUrl.match(/\/dp\/([A-Z0-9]{10})/i)?.[1] ||
               productUrl.match(/\/gp\/product\/([A-Z0-9]{10})/i)?.[1] || null;

  let result: ScrapedProduct;
  try {
    const html = await fetchPage(productUrl, 'amazon');
    result = isPlainText(html) ? parseFromText(html, asin, productUrl) : parseFromHTML(html, asin, productUrl, 0);
  } catch (err: any) {
    if (err.message?.includes('invalid') || err.message?.includes('no longer exists')) throw err;
    result = { url: productUrl, title: '', price: 0, originalPrice: 0, rating: 0, reviewCount: 0, availability: 'in_stock', sellerName: '', image: '', asin, rawOffers: [], bankOffers: [], domain: 'amazon', lowestEver: 0 };
  }

  const cleanTitle = cleanExtractedTitle(result.title, productUrl);
  if (!cleanTitle || cleanTitle === 'E-Commerce Product' || result.price === 0 || result.price < 1000) {
    const ddgMeta = await fetchAmazonMetadataViaDDG(asin, productUrl);
    if (ddgMeta) {
      if (ddgMeta.title) result.title = ddgMeta.title;
      if ((!result.price || result.price < 1000) && ddgMeta.price > 0) result.price = ddgMeta.price;
      if (!result.rawOffers?.length && ddgMeta.rawOffers?.length) result.rawOffers = ddgMeta.rawOffers;
    }
  }

  result.title = cleanExtractedTitle(result.title, productUrl);
  if (!result.rawOffers?.length) result.rawOffers = DEFAULT_AMAZON_BANK_OFFERS;
  result.bankOffers = parseStructuredBankOffers(result.rawOffers);

  return result;
}
