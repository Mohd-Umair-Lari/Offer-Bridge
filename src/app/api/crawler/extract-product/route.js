import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// ─────────────────────────────────────────────
// DB / Model
// ─────────────────────────────────────────────

const DB_NAME = 'offerbridge';
const env = (k) => process.env[k] || '';

async function getDB() {
  if (!global._mongooseCache) global._mongooseCache = { conn: null, promise: null };
  const cache = global._mongooseCache;
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured in environment variables.');
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { dbName: DB_NAME, bufferCommands: false, maxPoolSize: 10 })
      .then((m) => m)
      .catch((e) => { cache.promise = null; throw e; });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

async function getModel() {
  await getDB();
  if (mongoose.models.ScrapedProduct) return mongoose.models.ScrapedProduct;
  const schema = new mongoose.Schema(
    {
      url:       { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
      domain:    { type: String, enum: ['amazon', 'flipkart', 'myntra'], required: true },
      title:     { type: String, required: true },
      price:     { type: Number, required: true },
      asin:      { type: String, default: '' },
      image:     { type: String, default: '' },
      rawOffers: { type: [String], default: [] },
      bestOffer: {
        bestOfferBank:           { type: String,  default: '' },
        discountAmount:          { type: Number,  default: 0 },
        finalPriceAfterDiscount: { type: Number,  default: 0 },
        offerDescription:        { type: String,  default: '' },
      },
      lastScrapedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
  );
  schema.index({ updatedAt: -1 });
  return mongoose.model('ScrapedProduct', schema);
}

// ─────────────────────────────────────────────
// URL / ID Helpers
// ─────────────────────────────────────────────

function getMerchant(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes('amazon')) return 'amazon';
    if (h.includes('flipkart')) return 'flipkart';
    if (h.includes('myntra')) return 'myntra';
  } catch {}
  return null;
}

/**
 * FIX #5 — Tightened ASIN extraction.
 * Removed the greedy fallback that matched any 10-char path segment.
 */
function extractASIN(url) {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /\/gp\/product\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /[?&]asin=([A-Z0-9]{10})(?:&|$)/i,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]?.length === 10) return m[1].toUpperCase();
  }
  return null;
}

/**
 * FIX #9 — Better Myntra style ID extraction.
 * Handles `/buy` suffix, `/p/` prefix, and short-form URLs.
 */
function extractMyntraProductId(url) {
  try {
    const u = new URL(url);

    // 1. styleId query param
    const styleParam = u.searchParams.get('styleId');
    if (styleParam && /^\d+$/.test(styleParam)) return styleParam;

    const pathSegments = u.pathname.split('/').filter(Boolean);

    // 2. Numeric segment 5–10 digits (product ID in path)
    for (const seg of pathSegments) {
      if (/^\d{5,10}$/.test(seg)) return seg;
    }

    // 3. Short-form: last numeric token in the path (e.g. /product/buy/12345678)
    for (let i = pathSegments.length - 1; i >= 0; i--) {
      const cleaned = pathSegments[i].replace(/[^0-9]/g, '');
      if (/^\d{5,10}$/.test(cleaned)) return cleaned;
    }
  } catch {}
  return null;
}

// ─────────────────────────────────────────────
// Parsing Helpers
// ─────────────────────────────────────────────

function parsePrice(raw) {
  if (!raw && raw !== 0) return 0;
  const s = String(raw).replace(/[₹$,\s]/g, '').split('.')[0];
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function decodeHTML(s = '') {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractJsonLD(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const o = JSON.parse(m[1]);
      const arr = Array.isArray(o) ? o : [o];
      const prod = arr.find(
        (x) => x?.['@type'] === 'Product' || x?.['@type']?.includes?.('Product'),
      );
      if (prod) return prod;
    } catch {}
  }
  return null;
}

function extractOG(html, prop) {
  const re1 = new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i');
  return decodeHTML((html.match(re1) || html.match(re2))?.[1] || '');
}

/**
 * FIX #12 — Tightened bot-wall detection.
 * Now requires BOTH bot-language AND a <form> element (CAPTCHA form),
 * preventing false positives on normal pages that mention "automated" in copy.
 */
function isBotWall(html) {
  if (!html) return false;
  const lower = html.toLowerCase();

  // Hard signals — definitive captcha/block pages
  if (/robot\s*check|verify\s+you\s+are\s+human/i.test(html)) return true;
  if (/access\s+denied/i.test(html) && html.length < 5000) return true;

  // Soft signals — only flag if there's also a <form> (CAPTCHA challenge)
  const hasBotLanguage = /unusual\s+traffic|automated\s+access/i.test(html);
  const hasForm = /<form[\s>]/i.test(html);
  if (hasBotLanguage && hasForm) return true;

  // Captcha keyword requires an iframe or form (not just marketing text)
  const hasCaptcha = /captcha/i.test(html);
  if (hasCaptcha && (hasForm || /<iframe[\s>]/i.test(html))) return true;

  return false;
}

/**
 * FIX #6 — Expanded bank offer extraction.
 * Allows periods within offer text, adds more banks, covers Myntra's format.
 */
function extractBankOffers(text) {
  const seen = new Set();
  const result = [];
  const patterns = [
    // Bank Offer label with multi-sentence body (allow . inside)
    /Bank\s+Offer\s*[:\-]?\s*.{15,350}?(?=Bank Offer|Credit Card Offer|Debit Card Offer|$|\n\n)/gi,
    // Flat / Get / Extra / Upto discounts
    /(?:Get|Flat|Extra|Avail|Upto|Up\s+to)\s+(?:₹[\d,]+|\d+%)\s*.{10,280}/gi,
    // Named bank offers (including Paytm, NAVI, Jupiter)
    /(?:HDFC|ICICI|SBI|AXIS|Kotak|IndusInd|RBL|HSBC|Federal\s+Bank|Yes\s+Bank|BOB|Union\s+Bank|IDFC|Amex|AU\s+Small|OneCard|Citi|Paytm|NAVI|Jupiter)[^!\n;]{10,280}?(?:off|cashback|discount|EMI|reward)[^!\n;]{0,120}/gi,
    // Percentage-based offers
    /\d+%\s*(?:instant\s+)?(?:discount|off|cashback)[^!\n;]{10,220}/gi,
    // No Cost EMI
    /No\s+Cost\s+EMI[^!\n;]{10,220}/gi,
    // Myntra style "10% off on HDFC Credit Card" compact format
    /(?:\d+%|₹[\d,]+)\s+(?:off|discount|cashback)\s+(?:on|with|using)\s+\w+[^!\n;]{5,180}/gi,
  ];
  for (const pat of patterns) {
    for (const m of text.match(pat) || []) {
      const clean = m.replace(/\s+/g, ' ').trim().slice(0, 320);
      const key   = clean.slice(0, 60).toLowerCase();
      if (clean.length > 12 && !seen.has(key)) { seen.add(key); result.push(clean); }
    }
  }
  return result.slice(0, 15);
}

// ─────────────────────────────────────────────
// Fetch Layer
// ─────────────────────────────────────────────

/**
 * Browser profiles for direct fetch rotation.
 * Uses realistic Chrome/Safari UAs to avoid basic bot fingerprinting.
 */
const BROWSER_PROFILES = [
  {
    'User-Agent':              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Accept':                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language':         'en-IN,en-GB;q=0.9,en;q=0.8',
    'Accept-Encoding':         'gzip, deflate, br, zstd',
    'sec-ch-ua':               '"Google Chrome";v="127", "Chromium";v="127", "Not.A/Brand";v="24"',
    'sec-ch-ua-mobile':        '?0',
    'sec-ch-ua-platform':      '"Windows"',
    'sec-fetch-dest':          'document',
    'sec-fetch-mode':          'navigate',
    'sec-fetch-site':          'none',
    'sec-fetch-user':          '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control':           'max-age=0',
  },
  {
    'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'sec-fetch-dest':  'document',
    'sec-fetch-mode':  'navigate',
    'sec-fetch-site':  'none',
    'Upgrade-Insecure-Requests': '1',
  },
  {
    // Android mobile UA – useful for Flipkart's mobile-optimised HTML
    'User-Agent':         'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
    'Accept':             'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language':    'en-IN,hi;q=0.9,en;q=0.8',
    'Accept-Encoding':    'gzip, deflate, br',
    'sec-ch-ua':          '"Chromium";v="127", "Android WebView";v="127"',
    'sec-ch-ua-mobile':   '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest':     'document',
    'sec-fetch-mode':     'navigate',
    'sec-fetch-site':     'none',
    'sec-fetch-user':     '?1',
    'Upgrade-Insecure-Requests': '1',
  },
];

/**
 * FIX #1 — Flipkart mobile URL uses m.flipkart.com (dl.flipkart.com does not exist).
 */
function toMobileFlipkartUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('flipkart') && !u.hostname.startsWith('m.')) {
      u.hostname = 'm.flipkart.com';
      return u.toString();
    }
  } catch {}
  return url;
}

/**
 * FIX #11 — Domain-specific Referer headers.
 * Amazon blocks requests that lack a valid google.com or amazon.in referer.
 */
function getDomainReferer(merchant) {
  if (merchant === 'amazon')   return 'https://www.amazon.in/';
  if (merchant === 'flipkart') return 'https://www.flipkart.com/';
  if (merchant === 'myntra')   return 'https://www.myntra.com/';
  return 'https://www.google.com/';
}

/**
 * FIX #10 — withRetry: retries a network call once on transient errors (5xx, timeout).
 */
async function withRetry(fn, maxAttempts = 2, delayMs = 800) {
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const isTransient = e.message?.includes('504')
        || e.message?.includes('503')
        || e.message?.includes('502')
        || e.message?.includes('ETIMEDOUT')
        || e.message?.includes('timeout')
        || e.message?.includes('network');
      if (!isTransient || attempt === maxAttempts - 1) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function tryFetch(url, profile, merchant, timeoutMs = 20000) {
  const referer = getDomainReferer(merchant);
  const res = await fetch(url, {
    headers: { ...profile, Referer: referer },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('Response too small — blocked');
  return html;
}

async function fetchViaScraperAPI(url) {
  const key = env('SCRAPER_API_KEY');
  if (!key) throw new Error('No ScraperAPI key');
  const params = new URLSearchParams({ api_key: key, url, country_code: 'in', render: 'false' });
  const res = await fetch(`https://api.scraperapi.com/?${params}`, {
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`ScraperAPI HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('ScraperAPI returned empty response');
  return html;
}

async function fetchViaJina(url) {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const jinaKey = env('JINA_API_KEY');
  const headers = {
    Accept:       'text/plain, */*',
    'X-Timeout':  '30',
    'X-No-Cache': 'true',
    ...(jinaKey ? { Authorization: `Bearer ${jinaKey}` } : {}),
  };
  const res = await fetch(jinaUrl, { headers, signal: AbortSignal.timeout(40000) });
  if (!res.ok) throw new Error(`Jina HTTP ${res.status}`);
  const text = await res.text();
  if (!text || text.length < 300) throw new Error('Jina returned too short response');
  if (/E00[0-9]|Something went wrong|Please try again/i.test(text.slice(0, 500)))
    throw new Error('Jina service error: ' + text.slice(0, 100));
  console.log(`[Jina] Fetched ${text.length} chars for ${url}`);
  return text;
}

async function fetchViaAllOrigins(url) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&charset=UTF-8`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(28000) });
  if (!res.ok) throw new Error(`AllOrigins HTTP ${res.status}`);
  const json = await res.json();
  const html = json?.contents;
  if (!html || html.length < 500) throw new Error('AllOrigins returned empty or too-small response');
  if (isBotWall(html)) throw new Error('AllOrigins: bot wall on response');
  console.log(`[AllOrigins] Fetched ${html.length} chars for ${url}`);
  return html;
}

/**
 * High-reliability fetch waterfall:
 * 1. ScraperAPI (if key present)
 * 2. Direct fetch with browser profile rotation (+ retry)
 * 3. Jina AI Reader
 * 4. AllOrigins proxy
 */
async function fetchPage(url, merchant) {
  const scraperKey = env('SCRAPER_API_KEY');
  const siteName   = merchant === 'amazon' ? 'Amazon' : merchant === 'flipkart' ? 'Flipkart' : 'Myntra';

  // 1. ScraperAPI
  if (scraperKey) {
    try { return await withRetry(() => fetchViaScraperAPI(url)); } catch (e) {
      console.warn('[ScraperAPI] Failed:', e.message, '— trying next method');
    }
  }

  // 2. Direct fetch with profile rotation
  let directUrls = [url];
  if (merchant === 'flipkart') {
    directUrls = [toMobileFlipkartUrl(url), url];
  } else if (merchant === 'amazon') {
    const asin = extractASIN(url);
    if (asin) {
      const cleanUrl = `https://www.amazon.in/dp/${asin}?th=1&psc=1`;
      if (cleanUrl.toLowerCase() !== url.toLowerCase()) directUrls = [cleanUrl, url];
    }
  }

  let lastErr;
  for (const targetUrl of directUrls) {
    for (const profile of BROWSER_PROFILES) {
      try {
        const html = await withRetry(() => tryFetch(targetUrl, profile, merchant), 2, 600);
        if (!isBotWall(html)) return html;
        throw new Error('Bot wall detected on direct fetch');
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
      }
    }
  }

  // 3. Jina AI Reader
  console.log(`[Crawler] Direct fetch failed (${lastErr?.message}). Trying Jina AI for: ${url}`);
  try { return await withRetry(() => fetchViaJina(url)); } catch (jinaErr) {
    console.warn('[Jina] Failed:', jinaErr.message, '— trying AllOrigins');
  }

  // 4. AllOrigins
  console.log(`[Crawler] Jina failed. Trying AllOrigins for: ${url}`);
  try { return await withRetry(() => fetchViaAllOrigins(url)); } catch (originsErr) {
    console.warn('[AllOrigins] Failed:', originsErr.message);
    throw new Error(
      `${siteName} is blocking automated access from this server. ` +
      `Add a SCRAPER_API_KEY to your environment for reliable bypass, or use the Chrome Extension instead.`,
    );
  }
}

// ─────────────────────────────────────────────
// Keepa (Amazon price history)
// ─────────────────────────────────────────────

async function fetchKeepa(asin) {
  const key = env('KEEPA_API_KEY');
  if (!key || !asin) return null;
  try {
    const url = `https://api.keepa.com/product?key=${key}&domain=10&asin=${asin}&stats=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const { products } = await res.json();
    const p = products?.[0];
    if (!p) return null;
    const toINR = (v) => (v > 0 ? Math.round(v / 100) : 0);
    return {
      title:      p.title || '',
      price:      toINR(p.stats?.current?.[0] ?? -1),
      image:      p.imagesCSV
        ? `https://images-na.ssl-images-amazon.com/images/I/${p.imagesCSV.split(',')[0]}`
        : '',
      lowestEver: toINR(p.stats?.min?.[0] ?? -1),
    };
  } catch (e) {
    console.warn('[Keepa] Failed:', e.message);
    return null;
  }
}

// ─────────────────────────────────────────────
// Platform Parsers
// ─────────────────────────────────────────────

/**
 * FIX #4 — Amazon: added corePriceDisplay + apex_desktop patterns for newer PDPs.
 */
function parseAmazon(html, asin) {
  const ld      = extractJsonLD(html);
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // --- Title ---
  let title =
    html.match(/<span[^>]+id=["']productTitle["'][^>]*>\s*([\s\S]*?)\s*<\/span>/i)?.[1]
      ?.replace(/<[^>]+>/g, '').trim()
    || ld?.name
    || extractOG(html, 'title')
    || '';
  title = decodeHTML(title);

  // --- Price ---
  let price = 0;

  // 1. JSON-LD offers price (most reliable when present)
  if (!price && ld?.offers?.price) price = parsePrice(ld.offers.price);

  // 2. a-offscreen span (universal, most common)
  if (!price) {
    const m = html.match(/<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>₹\s*([\d,]+)/i);
    if (m) price = parsePrice(m[1]);
  }

  // 3. corePriceDisplay section (2024+ Amazon PDP layout)
  if (!price) {
    const coreSection = html.match(
      /id=["']corePriceDisplay_desktop_feature_div["'][^>]*>([\s\S]{0,2000})/i,
    )?.[1] || '';
    const m = coreSection.match(/₹\s*([\d,]+)/);
    if (m) price = parsePrice(m[1]);
  }

  // 4. apex_desktop section (alternative 2024 layout)
  if (!price) {
    const apexSection = html.match(
      /id=["']apex_desktop_priceToPaySection["'][^>]*>([\s\S]{0,1500})/i,
    )?.[1] || '';
    const m = apexSection.match(/₹\s*([\d,]+)/);
    if (m) price = parsePrice(m[1]);
  }

  // 5. priceblock (legacy layout)
  if (!price) {
    const m = html.match(
      /id=["']priceblock_(?:ourprice|dealprice|saleprice)["'][^>]*>[\s₹]*([\d,]+)/i,
    );
    if (m) price = parsePrice(m[1]);
  }

  // 6. JSON in page scripts
  if (!price) {
    const m =
      html.match(/"priceAmount"\s*:\s*([\d.]+)/i) ||
      html.match(/"displayPrice"\s*:\s*"₹\s*([\d,]+)"/i);
    if (m) price = parsePrice(m[1]);
  }

  // 7. OG description fallback
  if (!price) {
    const desc = extractOG(html, 'description');
    const m    = desc.match(/₹\s*([\d,]+)/);
    if (m) price = parsePrice(m[1]);
  }

  // 8. Last resort: first ₹ amount in stripped text
  if (!price) {
    const m = stripped.match(/₹\s*([\d]{2,}(?:,[\d]{2,3})*)/);
    if (m) price = parsePrice(m[1]);
  }

  if (price === 0 && /currently\s+unavailable|out\s+of\s+stock/i.test(html))
    throw new Error('Product is currently out of stock on Amazon.');

  const image =
    extractOG(html, 'image') ||
    html.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/i)?.[1] ||
    html.match(/id=["']imgBlkFront["'][^>]+src=["']([^"']+)["']/i)?.[1] ||
    '';

  return { title, price, image, rawOffers: extractBankOffers(stripped), asin: asin || '' };
}

/**
 * Deep search for a value matching any of `keys` in a nested JS object.
 */
function deepFind(obj, keys, max = 14, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > max) return undefined;
  for (const key of keys) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined) {
      const v = obj[key];
      if (typeof v === 'number' && v > 0) return v;
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  for (const child of Array.isArray(obj) ? obj : Object.values(obj)) {
    if (child && typeof child === 'object') {
      const r = deepFind(child, keys, max, depth + 1);
      if (r !== undefined) return r;
    }
  }
  return undefined;
}

/**
 * FIX #2 & #3 — Flipkart parser.
 * Now parses __NEXT_DATA__ (newer Flipkart build) alongside __INITIAL_STATE__.
 * Expanded price CSS class patterns. Offer extraction uses state JSON keys.
 */
function parseFlipkart(html) {
  const ld       = extractJsonLD(html);
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  let title = ld?.name || '';
  let price = ld?.offers?.price ? parsePrice(String(ld.offers.price)) : 0;
  let image = (Array.isArray(ld?.image) ? ld.image[0] : ld?.image) || extractOG(html, 'image') || '';

  // --- Try __NEXT_DATA__ (newer Flipkart pages) ---
  if (!price || !title) {
    try {
      const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (nextDataMatch) {
        const nextData = JSON.parse(nextDataMatch[1]);
        if (!title) {
          const t = deepFind(nextData, ['title', 'name', 'productName', 'displayName', 'productTitle']);
          if (t && typeof t === 'string' && t.length > 3) title = t;
        }
        if (!price) {
          const v = deepFind(nextData, ['finalPrice', 'sellingPrice', 'mrpPrice', 'finalSellingPrice', 'basePrice', 'price', 'discountedPrice', 'listingPrice']);
          if (v) { const p = parsePrice(String(v)); if (p > 50) price = p; }
        }
      }
    } catch (e) { console.warn('[Flipkart] __NEXT_DATA__ parse error:', e.message); }
  }

  // --- Try __INITIAL_STATE__ (older Flipkart pages) ---
  if (!price || !title) {
    try {
      const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      let sm;
      while ((sm = scriptRe.exec(html)) !== null) {
        const block = sm[1];
        if (!block.includes('__INITIAL_STATE__')) continue;

        let state = null;

        const ea = block.match(/window\.__INITIAL_STATE__\s*=\s*JSON\.parse\("((?:[^"\\]|\\.)*)"\)/);
        if (ea) { try { state = JSON.parse(JSON.parse(`"${ea[1]}"`)); } catch {} }

        if (!state) {
          const eb = block.match(/window\.__INITIAL_STATE__\s*=\s*JSON\.parse\('((?:[^'\\]|\\.)*)'\)/);
          if (eb) { try { state = JSON.parse(eb[1]); } catch {} }
        }

        if (!state) {
          const idx  = block.indexOf('__INITIAL_STATE__');
          const open = idx !== -1 ? block.indexOf('{', idx) : -1;
          if (open !== -1) {
            let d = 0, inStr = false, esc = false, end = open;
            for (let i = open; i < Math.min(block.length, open + 3_000_000); i++) {
              const c = block[i];
              if (esc)              { esc = false; continue; }
              if (c === '\\' && inStr){ esc = true;  continue; }
              if (c === '"')         { inStr = !inStr; continue; }
              if (!inStr) {
                if (c === '{') d++;
                else if (c === '}') { if (--d === 0) { end = i; break; } }
              }
            }
            if (end > open) { try { state = JSON.parse(block.slice(open, end + 1)); } catch {} }
          }
        }

        if (state) {
          if (!price) {
            const v = deepFind(state, ['finalPrice', 'sellingPrice', 'mrpPrice', 'finalSellingPrice', 'basePrice', 'price', 'discountedPrice', 'listingPrice']);
            if (v) { const p = parsePrice(String(v)); if (p > 50) price = p; }
          }
          if (!title) {
            const t = deepFind(state, ['title', 'name', 'productName', 'displayName', 'productTitle']);
            if (t && typeof t === 'string' && t.length > 3) title = t;
          }
          break;
        }
      }
    } catch (e) { console.warn('[Flipkart] __INITIAL_STATE__ parse error:', e.message); }
  }

  // --- HTML fallbacks ---
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
      // Current obfuscated class patterns
      /class=["'][^"']*Nx9b7S[^"']*["'][^>]*>₹\s*([\d,]+)/i,
      /class=["'][^"']*hl05eU[^"']*["'][^>]*>₹\s*([\d,]+)/i,
      /class=["'][^"']*nsg5x8[^"']*["'][^>]*>₹\s*([\d,]+)/i,
      // Legacy class
      /class=["'][^"']*_30jeq3[^"']*["'][^>]*>₹\s*([\d,]+)/i,
      // JSON strings in page
      /"finalPrice"\s*:\s*([\d]+)/,
      /"sellingPrice"\s*:\s*"?([\d,]+)/,
      /"mrpPrice"\s*:\s*([\d]+)/,
      /"finalSellingPrice"\s*:\s*([\d]+)/,
      // Any ₹ amount
      /₹\s*([\d]{2,}(?:,[\d]{2,3})*)/,
    ]) {
      const m = html.match(pat);
      if (m) { const v = parsePrice(m[1]); if (v > 50) { price = v; break; } }
    }
  }

  if (price === 0 && /sold\s*out|currently\s+unavailable|out\s+of\s+stock/i.test(html))
    throw new Error('Product is currently out of stock on Flipkart.');

  return { title: decodeHTML(title), price, image, rawOffers: extractBankOffers(stripped), asin: null };
}

/**
 * FIX #7 — Improved Myntra internal API fetch.
 * Added correct headers, tries two API endpoint versions.
 */
async function fetchMyntraInternalApi(styleId) {
  if (!styleId) return null;

  const endpoints = [
    `https://www.myntra.com/gateway/v2/product/${styleId}`,
    `https://www.myntra.com/gateway/v1/product/${styleId}`,
  ];

  for (const apiUrl of endpoints) {
    try {
      console.log(`[Myntra API] Trying: ${apiUrl}`);
      const res = await fetch(apiUrl, {
        headers: {
          Accept:              'application/json, text/plain, */*',
          'User-Agent':        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
          'x-myntraweb':       'true',
          'x-myntra-web':      'true',
          'x-location-context': 'pincode=400001;source=IP',
          Referer:             `https://www.myntra.com/${styleId}/buy`,
          Origin:              'https://www.myntra.com',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        console.warn(`[Myntra API] ${res.status} from ${apiUrl}`);
        continue;
      }

      const json = await res.json();
      const pdp  = json?.pdpData || json?.data || json;

      if (pdp && (pdp.name || pdp.title || pdp.brand)) {
        const brand = pdp.brand?.name || '';
        const name  = pdp.name || pdp.title || '';
        const title = brand && name ? `${brand} - ${name}` : (brand || name);

        let price = parsePrice(
          pdp.price?.discounted || pdp.price?.mrp || pdp.priceInfo?.discountedPrice || 0,
        );

        let image = '';
        if (pdp.media?.albums?.[0]?.images?.[0]?.imageURL) {
          image = pdp.media.albums[0].images[0].imageURL;
        } else if (pdp.media?.albums?.[0]?.images?.[0]?.src) {
          image = pdp.media.albums[0].images[0].src;
        }

        // Extract offers from various Myntra API shapes
        const rawOffers = [];
        const offerSources = [pdp.offers, pdp.bankOffers, pdp.cashbackOffers, pdp.couponOffers];
        for (const src of offerSources) {
          if (Array.isArray(src)) {
            src.forEach((o) => {
              const text = typeof o === 'string'
                ? o
                : (o.title || o.description || o.offerText || o.heading || '');
              if (text && text.length > 5) rawOffers.push(text);
            });
          }
        }

        if (price > 0 && title) {
          console.log(`[Myntra API] ✓ "${title}" @ ₹${price} via ${apiUrl}`);
          return { title, price, image, rawOffers, domain: 'myntra', asin: null, lowestEver: 0 };
        }
      }
    } catch (e) {
      console.warn(`[Myntra API] Failed (${apiUrl}):`, e.message);
    }
  }
  return null;
}

/**
 * FIX #8 — Myntra HTML parser.
 * Now also tries window.__NEXT_DATA__ (used in newer Myntra builds).
 */
function parseMyntra(html) {
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  let pdpData = null;

  // 1. Try window.__NEXT_DATA__ (newer Myntra)
  try {
    const nd = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (nd) {
      const nextData = JSON.parse(nd[1]);
      pdpData = deepFind(nextData, ['pdpData', 'productDetail', 'productData']);
      if (pdpData && !pdpData.name && !pdpData.brand) pdpData = null;
    }
  } catch (e) { console.warn('[Myntra] __NEXT_DATA__ parse error:', e.message); }

  // 2. Try window.__myx / window.pdpData (older Myntra)
  if (!pdpData) {
    try {
      const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      let sm;
      while ((sm = scriptRe.exec(html)) !== null) {
        const block = sm[1];
        if (!block.includes('window.__myx') && !block.includes('window.pdpData')) continue;
        const match = block.match(
          /(?:window\.__myx\s*=\s*|window\.pdpData\s*=\s*)(\{[\s\S]*?\})(?:;|$)/,
        );
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            pdpData = parsed.pdpData || parsed;
            if (pdpData && (pdpData.name || pdpData.title)) break;
          } catch {}
        }
      }
    } catch (e) { console.warn('[Myntra] window.__myx parse error:', e.message); }
  }

  let title = '';
  let price  = 0;
  let image  = '';

  if (pdpData) {
    const brandName = pdpData.brand?.name || '';
    const prodName  = pdpData.name || pdpData.title || '';
    title = brandName && prodName ? `${brandName} - ${prodName}` : (brandName || prodName || '');
    if (pdpData.price) {
      price = parsePrice(
        pdpData.price.discounted || pdpData.price.mrp || pdpData.priceInfo?.discountedPrice || 0,
      );
    }
    if (pdpData.media?.albums?.[0]?.images?.[0]?.imageURL) {
      image = pdpData.media.albums[0].images[0].imageURL;
    }
  }

  // HTML fallbacks
  if (!title) {
    const brand =
      html.match(/<h1[^>]+class=["']pdp-title["'][^>]*>\s*([\s\S]*?)\s*<\/h1>/i)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() || '';
    const name =
      html.match(/<h1[^>]+class=["']pdp-name["'][^>]*>\s*([\s\S]*?)\s*<\/h1>/i)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() ||
      html.match(/<p[^>]+class=["']pdp-name["'][^>]*>\s*([\s\S]*?)\s*<\/p>/i)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() || '';
    title = brand && name ? `${brand} - ${name}` : (brand || name || extractOG(html, 'title') || '');
  }

  if (!price) {
    const m =
      html.match(/class=["']pdp-price["'][^>]*>([\s\S]*?)<\/span>/i) ||
      html.match(/class=["']pdp-price["'][^>]*>([\s\S]*?)<\/strong>/i);
    if (m) {
      const clean    = m[1].replace(/<[^>]+>/g, '').replace(/[,\s]/g, '');
      const numMatch = clean.match(/\d+/);
      if (numMatch) price = parseInt(numMatch[0], 10) || 0;
    }
  }

  if (!price) {
    const m = stripped.match(/(?:Rs\.?|₹)\s*([\d,]+)/i);
    if (m) price = parsePrice(m[1]);
  }

  if (price === 0 && /out\s+of\s+stock|sold\s+out/i.test(html))
    throw new Error('Product is currently out of stock on Myntra.');

  if (!image) {
    image =
      extractOG(html, 'image') ||
      html.match(/<img[^>]+class=["']image-grid-image["'][^>]+src=["']([^"']+)["']/i)?.[1] ||
      '';
  }

  return { title: decodeHTML(title), price, image, rawOffers: extractBankOffers(stripped), asin: null };
}

// ─────────────────────────────────────────────
// Main scrape orchestrator
// ─────────────────────────────────────────────

async function scrapeProduct(productUrl, merchant) {
  const asin = merchant === 'amazon' ? extractASIN(productUrl) : null;

  // Amazon: try Keepa first (price history API, bypasses bot blocks entirely)
  if (merchant === 'amazon') {
    const keepa = await fetchKeepa(asin);
    if (keepa?.price > 0) {
      let rawOffers = [];
      try {
        const targetUrl = asin ? `https://www.amazon.in/dp/${asin}` : productUrl;
        const html = await fetchPage(targetUrl, 'amazon');
        if (html && !isBotWall(html))
          rawOffers = extractBankOffers(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
      } catch {}
      return { title: keepa.title, price: keepa.price, image: keepa.image, rawOffers, asin, domain: 'amazon', lowestEver: keepa.lowestEver || 0 };
    }

    const targetUrl = asin ? `https://www.amazon.in/dp/${asin}?th=1&psc=1` : productUrl;
    const html      = await fetchPage(targetUrl, 'amazon');
    if (isBotWall(html))
      throw new Error('Amazon is blocking automated access from this server. Add SCRAPER_API_KEY to your env for reliable bypass, or use the Chrome Extension.');
    const parsed = parseAmazon(html, asin);
    return { ...parsed, domain: 'amazon', lowestEver: 0 };
  }

  // Flipkart
  if (merchant === 'flipkart') {
    const html = await fetchPage(productUrl, 'flipkart');
    if (isBotWall(html))
      throw new Error('Flipkart is blocking automated access from this server. Add SCRAPER_API_KEY to your env for reliable bypass, or use the Chrome Extension.');
    const parsed = parseFlipkart(html);
    return { ...parsed, domain: 'flipkart', lowestEver: 0 };
  }

  // Myntra: try internal API first (fastest, no bot issues)
  if (merchant === 'myntra') {
    const styleId = extractMyntraProductId(productUrl);
    if (styleId) {
      const apiResult = await fetchMyntraInternalApi(styleId);
      if (apiResult) return apiResult;
    }

    const html = await fetchPage(productUrl, 'myntra');
    if (isBotWall(html))
      throw new Error('Myntra is blocking automated access from this server. Add SCRAPER_API_KEY to your env for reliable bypass, or use the Chrome Extension.');
    const parsed = parseMyntra(html);
    return { ...parsed, domain: 'myntra', lowestEver: 0 };
  }

  throw new Error('Unsupported merchant.');
}

// ─────────────────────────────────────────────
// LLM Offer Evaluation
// ─────────────────────────────────────────────

async function evaluateOffers(price, rawOffers) {
  if (!rawOffers?.length)
    return { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: price, offerDescription: 'No card discount available' };
  try {
    const { evaluateBestOffer } = await import('@/lib/llmService');
    return await evaluateBestOffer(price, rawOffers);
  } catch (e) {
    console.warn('[LLM] Evaluation failed:', e.message);
    return { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: price, offerDescription: 'Offers found — LLM evaluation unavailable' };
  }
}

// ─────────────────────────────────────────────
// Cache-aware entry point
// ─────────────────────────────────────────────

async function getOrScrapeProduct(productUrl) {
  const merchant = getMerchant(productUrl);
  if (!merchant)
    return { success: false, message: 'Unsupported URL. Only Amazon.in, Flipkart.com, and Myntra.com links are accepted.' };

  const normalizedUrl   = productUrl.trim().toLowerCase();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  let ScrapedProduct = null;
  try {
    ScrapedProduct = await getModel();
    const cached = await ScrapedProduct.findOne({ url: normalizedUrl, updatedAt: { $gte: twelveHoursAgo } });
    if (cached) return buildResponse(cached, merchant, true);
  } catch (e) {
    console.warn('[Crawler] Cache lookup failed (scraping fresh):', e.message);
  }

  const scraped = await scrapeProduct(normalizedUrl, merchant);

  if (!scraped.title)
    throw new Error('Could not extract product title. The link may be invalid or the page was blocked.');
  if (!scraped.price)
    throw new Error('Could not extract product price. The product may be unavailable or the page was blocked.');

  const bestOffer = await evaluateOffers(scraped.price, scraped.rawOffers);

  let doc = { ...scraped, bestOffer, updatedAt: new Date() };
  if (ScrapedProduct) {
    try {
      doc = await ScrapedProduct.findOneAndUpdate(
        { url: normalizedUrl },
        {
          url:           normalizedUrl,
          domain:        scraped.domain,
          title:         scraped.title,
          price:         scraped.price,
          asin:          scraped.asin   || '',
          image:         scraped.image  || '',
          rawOffers:     scraped.rawOffers || [],
          bestOffer,
          lastScrapedAt: new Date(),
        },
        { new: true, upsert: true },
      );
    } catch (e) { console.error('[Crawler] MongoDB save failed:', e.message); }
  }

  return buildResponse({ ...scraped, bestOffer, lowestEver: scraped.lowestEver, updatedAt: new Date() }, merchant, false);
}

function buildResponse(doc, merchant, cached) {
  return {
    success: true,
    cached,
    product: {
      title:      doc.title  || '',
      price:      doc.price  || 0,
      currency:   'INR',
      image:      doc.image  || '',
      asin:       doc.asin   || null,
      lowestEver: doc.lowestEver || 0,
    },
    best_card: {
      bank:            doc.bestOffer?.bestOfferBank           || '',
      discount_amount: doc.bestOffer?.discountAmount          || 0,
      final_price:     doc.bestOffer?.finalPriceAfterDiscount || doc.price || 0,
      card_name:       doc.bestOffer?.offerDescription        || 'No card discount available',
    },
    raw_offers: doc.rawOffers || [],
    merchant,
    timestamp: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────
// Route Handlers
// ─────────────────────────────────────────────

export async function POST(request) {
  try {
    const body       = await request.json().catch(() => ({}));
    const productUrl = (body.productUrl || '').trim();
    if (!productUrl)
      return NextResponse.json({ success: false, message: 'productUrl is required in the request body' }, { status: 400 });
    const result = await getOrScrapeProduct(productUrl);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    console.error('[extract-product POST ERROR]', err.message);
    const status = err.message?.includes('out of stock') ? 422
      : (err.message?.includes('blocking') || err.message?.includes('blocked') || err.message?.includes('bot')) ? 503
      : err.message?.includes('MONGODB_URI') ? 503
      : 500;
    return NextResponse.json({ success: false, message: err.message || 'An unexpected server error occurred.' }, { status });
  }
}

export async function GET(request) {
  try {
    const productUrl = (new URL(request.url).searchParams.get('url') || '').trim();
    if (!productUrl)
      return NextResponse.json({ success: false, message: 'url query parameter is required' }, { status: 400 });
    const result = await getOrScrapeProduct(productUrl);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    console.error('[extract-product GET ERROR]', err.message);
    const status = err.message?.includes('out of stock') ? 422
      : (err.message?.includes('blocking') || err.message?.includes('blocked') || err.message?.includes('bot')) ? 503
      : 500;
    return NextResponse.json({ success: false, message: err.message || 'An unexpected server error occurred.' }, { status });
  }
}
