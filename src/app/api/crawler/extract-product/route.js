import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { evaluateBestOffer } from '@/lib/llmService';
import mongoose from 'mongoose';

// ──────────────────────────────────────────────────────────────────────────────
// ScrapedProduct model (inline to avoid import-resolution issues in prod build)
// ──────────────────────────────────────────────────────────────────────────────
const ScrapedProductSchema = new mongoose.Schema({
  url:           { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  domain:        { type: String, enum: ['amazon', 'flipkart'], required: true },
  title:         { type: String, required: true },
  price:         { type: Number, required: true },
  asin:          { type: String, default: '' },
  image:         { type: String, default: '' },
  rawOffers:     { type: [String], default: [] },
  bestOffer: {
    bestOfferBank:          { type: String, default: '' },
    discountAmount:         { type: Number, default: 0 },
    finalPriceAfterDiscount:{ type: Number, default: 0 },
    offerDescription:       { type: String, default: '' },
  },
  lastScrapedAt: { type: Date, default: Date.now },
}, { timestamps: true });
ScrapedProductSchema.index({ updatedAt: -1 });

function getModel() {
  return mongoose.models.ScrapedProduct || mongoose.model('ScrapedProduct', ScrapedProductSchema);
}

// ──────────────────────────────────────────────────────────────────────────────
// ENV CONFIG
// ──────────────────────────────────────────────────────────────────────────────
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';   // scraperapi.com
const KEEPA_API_KEY   = process.env.KEEPA_API_KEY   || '';   // keepa.com (Amazon price data)

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────
const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
];
const randUA = () => UA_POOL[Math.floor(Math.random() * UA_POOL.length)];

function getMerchant(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes('amazon')) return 'amazon';
    if (h.includes('flipkart')) return 'flipkart';
    return null;
  } catch { return null; }
}

/**
 * Extract Amazon ASIN from any Amazon URL format.
 * Mirrors exactly what Price History / CamelCamelCamel extensions do first.
 */
function extractASIN(url) {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /\/gp\/product\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /[?&]asin=([A-Z0-9]{10})(?:&|$)/i,
    /\/([A-Z0-9]{10})(?:\/|\?|$)/,  // last resort: standalone ASIN
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1] && m[1].length === 10) return m[1].toUpperCase();
  }
  return null;
}

/**
 * Extract Flipkart product ID (pid) from URL.
 */
function extractFlipkartPID(url) {
  const m = url.match(/pid=([A-Z0-9]+)/i) || url.match(/\/p\/([a-z0-9]+)(?:\?|$)/i);
  return m?.[1] || null;
}

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
    .replace(/\\n/g, ' ').replace(/\\t/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractJsonLD(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const o = JSON.parse(m[1]);
      const arr = Array.isArray(o) ? o : [o];
      const prod = arr.find(x => x['@type'] === 'Product');
      if (prod) return prod;
    } catch {}
  }
  return null;
}

function extractOG(html, prop) {
  const re1 = new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i');
  const m = html.match(re1) || html.match(re2);
  return m ? decodeHTML(m[1]) : null;
}

/**
 * Recursively walk an object and find the first value matching any of the given keys.
 * Used to mine Flipkart's SSR state for price/title regardless of exact path.
 */
function deepFind(obj, keys, maxDepth = 14, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > maxDepth) return undefined;
  for (const key of keys) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined) {
      const v = obj[key];
      if (typeof v === 'number' && v > 0) return v;
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  const children = Array.isArray(obj) ? obj : Object.values(obj);
  for (const child of children) {
    if (child && typeof child === 'object') {
      const found = deepFind(child, keys, maxDepth, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

// ──────────────────────────────────────────────────────────────────────────────
// FETCH ENGINE  (ScraperAPI → direct fallback)
// ──────────────────────────────────────────────────────────────────────────────
const BROWSER_HEADERS = (ua) => ({
  'User-Agent': ua,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'DNT': '1',
  'sec-ch-ua': '"Chromium";v="124","Google Chrome";v="124"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'Upgrade-Insecure-Requests': '1',
});

async function fetchDirect(url, timeoutMs = 22000) {
  const res = await fetch(url, {
    headers: BROWSER_HEADERS(randUA()),
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('Response too small — server blocked the request');
  return html;
}

async function fetchViaScraperAPI(url, render = false) {
  const params = new URLSearchParams({
    api_key: SCRAPER_API_KEY,
    url,
    country_code: 'in',
    ...(render ? { render: 'true' } : {}),
  });
  const apiUrl = `https://api.scraperapi.com/?${params}`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`ScraperAPI HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('ScraperAPI returned empty response');
  return html;
}

/**
 * Smart page fetcher: ScraperAPI (with JS render) if configured, else direct.
 * ScraperAPI with render=true executes JavaScript — this is what unlocks bank offers.
 */
async function fetchPage(url, needsJS = false) {
  if (SCRAPER_API_KEY) {
    console.log(`[Crawler] ScraperAPI (render=${needsJS}) → ${url}`);
    return fetchViaScraperAPI(url, needsJS);
  }
  console.log(`[Crawler] Direct fetch → ${url}`);
  return fetchDirect(url);
}

// ──────────────────────────────────────────────────────────────────────────────
// KEEPA API  (Price History extension approach for Amazon)
// Price history extensions like CamelCamelCamel use Keepa's data.
// domain=10 = Amazon India (amazon.in)
// ──────────────────────────────────────────────────────────────────────────────
async function fetchKeepaData(asin) {
  if (!KEEPA_API_KEY || !asin) return null;
  try {
    const url = `https://api.keepa.com/product?key=${KEEPA_API_KEY}&domain=10&asin=${asin}&stats=1&offers=20`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    const product = data?.products?.[0];
    if (!product) return null;

    // Keepa stores prices as integers in units of 1/100 currency
    // -1 = not available
    const toINR = (v) => (v > 0 ? Math.round(v / 100) : 0);
    const stats = product.stats;

    return {
      title: product.title || '',
      price: toINR(stats?.current?.[0] ?? product.csv?.[1]?.slice(-1)?.[0] ?? -1),
      image: product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}` : '',
      lowestEver: toINR(stats?.min?.[0] ?? -1),
      highestEver: toINR(stats?.max?.[0] ?? -1),
    };
  } catch (e) {
    console.warn('[Crawler] Keepa API failed:', e.message);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// BANK OFFER EXTRACTOR  (shared, HTML-agnostic)
// Mimics what price-history browser extensions do: look for offer text blocks
// ──────────────────────────────────────────────────────────────────────────────
function extractBankOffers(rawText) {
  const offers = [];
  const seen = new Set();

  const patterns = [
    // "Bank Offer: 10% off on HDFC Credit Card..."
    /Bank\s+Offer\s*[:\-]?\s*[^.\n!;]{20,300}/gi,
    // "Get ₹500 cashback on HDFC Bank Credit Card"
    /(?:Get|Flat|Extra|Avail|Upto|Up\s+to)\s+(?:₹[\d,]+|\d+%)[^.\n!;]{10,250}/gi,
    // "HDFC Bank Credit Card: 10% off..."
    /(?:HDFC|ICICI|SBI|AXIS|Kotak|IndusInd|RBL|HSBC|Federal\s+Bank|Yes\s+Bank|BOB|Union\s+Bank|Canara\s+Bank|IDFC|Amex)[^.\n!;]{10,250}?(?:off|cashback|discount|EMI|reward)[^.\n!;]{0,100}/gi,
    // "10% Instant Discount on HDFC..."
    /\d+%\s*(?:instant\s+discount|off|cashback)[^.\n!;]{10,200}/gi,
  ];

  for (const pat of patterns) {
    const matches = rawText.match(pat) || [];
    for (const m of matches) {
      const clean = m.replace(/\s+/g, ' ').replace(/\|.*/g, '').trim().substring(0, 280);
      const key = clean.slice(0, 50).toLowerCase();
      if (clean.length > 15 && !seen.has(key)) {
        seen.add(key);
        offers.push(clean);
      }
    }
  }

  return offers.slice(0, 15);
}

// ──────────────────────────────────────────────────────────────────────────────
// AMAZON PARSER
// ──────────────────────────────────────────────────────────────────────────────
function parseAmazonHTML(html, asin) {
  const ld = extractJsonLD(html);
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // ── Title ──────────────────────────────────────────────────────────────────
  let title = '';
  const titleEl = html.match(/<span[^>]+id=["']productTitle["'][^>]*>\s*([\s\S]*?)\s*<\/span>/i);
  if (titleEl) title = titleEl[1].replace(/<[^>]+>/g, '').trim();
  if (!title && ld?.name) title = ld.name;
  if (!title) title = extractOG(html, 'title') || '';
  title = decodeHTML(title);

  // ── Price ──────────────────────────────────────────────────────────────────
  let price = 0;

  // 1. JSON-LD (most structured)
  if (!price && ld?.offers?.price) price = parsePrice(ld.offers.price);

  // 2. a-offscreen span (contains the full formatted price, e.g. "₹35,990")
  if (!price) {
    const m = html.match(/<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>\s*₹\s*([\d,]+)/i);
    if (m) price = parsePrice(m[1]);
  }

  // 3. priceblock_ourprice / dealprice
  if (!price) {
    const m = html.match(/<span[^>]+id=["']priceblock_(?:ourprice|dealprice|saleprice)["'][^>]*>[\s₹]*([\d,]+)/i);
    if (m) price = parsePrice(m[1]);
  }

  // 4. corePrice / apex_price embedded JSON (Amazon JS bundles)
  if (!price) {
    const m = html.match(/"priceAmount"\s*:\s*([\d.]+)/i)
      || html.match(/"displayPrice"\s*:\s*"₹\s*([\d,]+)"/i);
    if (m) price = parsePrice(m[1]);
  }

  // 5. OG description (often "₹35,990 – ...") — reliable fallback
  if (!price) {
    const desc = extractOG(html, 'description') || '';
    const m = desc.match(/₹\s*([\d,]+)/);
    if (m) price = parsePrice(m[1]);
  }

  // 6. Raw text last resort — first ₹ amount found in stripped text
  if (!price) {
    const m = stripped.match(/₹\s*([\d,]{3,})/);
    if (m) price = parsePrice(m[1]);
  }

  // ── Image ──────────────────────────────────────────────────────────────────
  const image = extractOG(html, 'image')
    || html.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/i)?.[1]
    || '';

  // ── Out of stock ───────────────────────────────────────────────────────────
  if (price === 0 && /currently\s+unavailable|out\s+of\s+stock|item\s+is\s+unavailable/i.test(html)) {
    throw new Error('Product is currently out of stock on Amazon.');
  }

  // ── Bank/CC offers ─────────────────────────────────────────────────────────
  const rawOffers = extractBankOffers(stripped);

  return { title, price, image, rawOffers, asin };
}

// ──────────────────────────────────────────────────────────────────────────────
// FLIPKART PARSER
// Key insight: Flipkart does SSR (server-side rendering). ALL product data —
// including price and bank offers — is embedded in the HTML before JavaScript
// even runs. This is the secret of how price trackers work on Flipkart.
// ──────────────────────────────────────────────────────────────────────────────
function parseFlipkartHTML(html) {
  const ld = extractJsonLD(html);
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  let title = '';
  let price = 0;
  let image = '';

  // ── Strategy A: JSON-LD (fast path) ───────────────────────────────────────
  if (ld) {
    title = ld.name || '';
    const ldPrice = ld.offers?.price || ld.offers?.lowPrice;
    if (ldPrice) price = parsePrice(String(ldPrice));
    image = (Array.isArray(ld.image) ? ld.image[0] : ld.image) || '';
  }

  // ── Strategy B: window.__INITIAL_STATE__ (SSR data dump) ─────────────────
  // Flipkart embeds the complete page state as a JS variable.
  // This is the SAME technique PriceHistory extensions use — they read this
  // variable from the live DOM. We read it from the SSR HTML.
  if (!price || !title) {
    try {
      const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      let sm;
      while ((sm = re.exec(html)) !== null) {
        const block = sm[1];
        if (!block.includes('__INITIAL_STATE__')) continue;

        let stateObj = null;

        // Form A: window.__INITIAL_STATE__ = JSON.parse("...escaped...")
        const escMatch = block.match(/window\.__INITIAL_STATE__\s*=\s*JSON\.parse\("((?:[^"\\]|\\.)*)"\)/);
        if (escMatch) {
          try {
            const unescaped = JSON.parse(`"${escMatch[1]}"`);
            stateObj = JSON.parse(unescaped);
          } catch {}
        }

        // Form B: window.__INITIAL_STATE__ = JSON.parse('...escaped...')
        if (!stateObj) {
          const escMatchSingle = block.match(/window\.__INITIAL_STATE__\s*=\s*JSON\.parse\('((?:[^'\\]|\\.)*)'\)/);
          if (escMatchSingle) {
            try {
              stateObj = JSON.parse(escMatchSingle[1].replace(/\\'/g, "'"));
            } catch {}
          }
        }

        // Form C: Direct object literal — balance braces to extract safely
        if (!stateObj) {
          const directIdx = block.indexOf('__INITIAL_STATE__');
          if (directIdx !== -1) {
            const openBrace = block.indexOf('{', directIdx);
            if (openBrace !== -1) {
              let depth = 0, inStr = false, esc = false;
              let end = openBrace;
              for (let i = openBrace; i < block.length; i++) {
                const c = block[i];
                if (esc)         { esc = false; continue; }
                if (c === '\\' && inStr) { esc = true; continue; }
                if (c === '"' && !esc)   { inStr = !inStr; continue; }
                if (!inStr) {
                  if (c === '{') depth++;
                  else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
                }
              }
              if (end > openBrace) {
                try { stateObj = JSON.parse(block.slice(openBrace, end + 1)); } catch {}
              }
            }
          }
        }

        if (stateObj) {
          // Deep-mine the state for price — paths change between Flipkart releases,
          // so we search by key name rather than hardcoded path
          if (!price) {
            const priceVal = deepFind(stateObj, ['finalPrice', 'sellingPrice', 'price', 'discountedPrice', 'listingPrice']);
            if (priceVal) {
              const p = parsePrice(String(priceVal));
              if (p > 50 && p < 100000000) price = p;
            }
          }
          if (!title) {
            const t = deepFind(stateObj, ['title', 'name', 'productName', 'displayName', 'productTitle', 'itemName']);
            if (t && typeof t === 'string' && t.length > 3) title = t;
          }
          break;
        }
      }
    } catch (e) {
      console.warn('[Crawler] __INITIAL_STATE__ parse error:', e.message);
    }
  }

  // ── Strategy C: CSS-class regex (backup for price) ────────────────────────
  if (!title) {
    const m = html.match(/<span[^>]+class=["'][^"']*B_NuCI[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)
      || html.match(/<h1[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/i)
      || html.match(/<title>([^|<]{5,100})/i);
    if (m) title = m[1].replace(/<[^>]+>/g, '').trim();
    if (!title) title = extractOG(html, 'title') || '';
  }

  if (!price) {
    const patterns = [
      /class=["'][^"']*_30jeq3[^"']*["'][^>]*>\s*₹\s*([\d,]+)/i,
      /class=["'][^"']*Nx9b7S[^"']*["'][^>]*>\s*₹\s*([\d,]+)/i,
      /class=["'][^"']*_16Jk6d[^"']*["'][^>]*>\s*₹\s*([\d,]+)/i,
      /"finalPrice"\s*:\s*([\d]+)/,
      /"sellingPrice"\s*:\s*"?([\d,]+)/,
      /₹\s*([\d]{2,}(?:,\d{3})*)/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m) {
        const v = parsePrice(m[1]);
        if (v > 50) { price = v; break; }
      }
    }
  }

  if (!image) image = extractOG(html, 'image') || '';

  // ── Out of stock ───────────────────────────────────────────────────────────
  if (price === 0 && /sold\s*out|currently\s+unavailable|out\s+of\s+stock/i.test(html)) {
    throw new Error('Product is currently out of stock on Flipkart.');
  }

  // ── Bank/CC offers (SSR-rendered, so they ARE in the raw HTML) ───────────
  const rawOffers = extractBankOffers(stripped);

  title = decodeHTML(title);
  return { title, price, image, rawOffers };
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN SCRAPE ORCHESTRATOR
// ──────────────────────────────────────────────────────────────────────────────
async function scrapeProduct(productUrl, merchant) {
  const asin = merchant === 'amazon' ? extractASIN(productUrl) : null;

  // ── Amazon path ────────────────────────────────────────────────────────────
  if (merchant === 'amazon') {
    // Step 1: Try Keepa API (same data source as Price History extensions — zero bot risk)
    if (KEEPA_API_KEY && asin) {
      const keepa = await fetchKeepaData(asin);
      if (keepa && keepa.price > 0) {
        console.log(`[Crawler] Keepa hit for ASIN ${asin}: ₹${keepa.price}`);
        // Keepa gives us price + title + image. For offers, we still need the page.
        // Try fetching the page for offers, but don't fail if it's blocked.
        let rawOffers = [];
        try {
          const html = await fetchPage(
            asin ? `https://www.amazon.in/dp/${asin}` : productUrl,
            !!SCRAPER_API_KEY // render JS only if ScraperAPI is available (to get dynamic bank offers)
          );
          if (html && !isBotWall(html)) rawOffers = extractBankOffers(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
        } catch { /* offers are optional */ }

        return {
          title: keepa.title,
          price: keepa.price,
          image: keepa.image,
          rawOffers,
          asin,
          domain: 'amazon',
          lowestEver: keepa.lowestEver || 0,
        };
      }
    }

    // Step 2: Fetch the page (ScraperAPI with JS render unlocks dynamic bank offers)
    // Use clean ASIN URL if available — shorter, less tracking params, more reliable
    const targetUrl = asin ? `https://www.amazon.in/dp/${asin}` : productUrl;
    let html;
    try {
      // Amazon bank offers are dynamically injected → need render=true with ScraperAPI
      html = await fetchPage(targetUrl, !!SCRAPER_API_KEY);
    } catch (e) {
      throw new Error(buildFetchError('Amazon', e));
    }

    if (isBotWall(html)) throw new Error(buildBotError('Amazon'));

    const parsed = parseAmazonHTML(html, asin);
    return { ...parsed, domain: 'amazon', lowestEver: 0 };
  }

  // ── Flipkart path ──────────────────────────────────────────────────────────
  let html;
  try {
    // Flipkart SSR means direct fetch (no JS render needed) often works.
    // ScraperAPI without render is cheaper and sufficient for Flipkart.
    html = await fetchPage(productUrl, false);
  } catch (e) {
    throw new Error(buildFetchError('Flipkart', e));
  }

  if (isBotWall(html)) throw new Error(buildBotError('Flipkart'));

  const parsed = parseFlipkartHTML(html);
  return { ...parsed, domain: 'flipkart', asin: null, lowestEver: 0 };
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS for error messaging
// ──────────────────────────────────────────────────────────────────────────────
function isBotWall(html) {
  return /robot\s*check|enter\s+the\s+characters|verify\s+you\s+are\s+human|captcha|automated\s+access|unusual\s+traffic/i.test(html);
}

function buildFetchError(site, err) {
  const msg = err?.message || '';
  const isBlocked = msg.includes('403') || msg.includes('503') || msg.includes('blocked') || msg.includes('too small');
  return isBlocked
    ? `${site} blocked the request. ${SCRAPER_API_KEY ? 'ScraperAPI also encountered issues — try again in a few minutes.' : 'Add SCRAPER_API_KEY to your .env for reliable bot-bypass access.'}`
    : `Failed to load ${site} product page: ${msg}`;
}

function buildBotError(site) {
  return `${site} is showing a bot-detection / CAPTCHA wall. ${SCRAPER_API_KEY ? 'Try again in a minute.' : 'Set SCRAPER_API_KEY in .env to bypass this reliably.'}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// CACHED PIPELINE  (MongoDB 12-hour cache → scrape → LLM → save)
// ──────────────────────────────────────────────────────────────────────────────
async function getOrScrapeProduct(productUrl) {
  const merchant = getMerchant(productUrl);
  if (!merchant) {
    return { success: false, message: 'Unsupported URL. Only Amazon.in and Flipkart.com products are supported.' };
  }

  // Connect DB
  try { await connectDB(); } catch (e) {
    throw new Error(`Database connection failed: ${e.message}`);
  }

  const ScrapedProduct = getModel();
  const normalizedUrl = productUrl.trim().toLowerCase();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  // Cache check
  let cached = null;
  try {
    cached = await ScrapedProduct.findOne({ url: normalizedUrl, updatedAt: { $gte: twelveHoursAgo } });
  } catch (e) { console.warn('[Crawler] Cache lookup failed:', e.message); }

  if (cached) {
    console.log(`[Crawler] Cache HIT: ${normalizedUrl}`);
    return buildResponse(cached, merchant, true);
  }

  // Scrape
  console.log(`[Crawler] Cache MISS → scraping: ${normalizedUrl}`);
  const scraped = await scrapeProduct(normalizedUrl, merchant);

  if (!scraped.title) throw new Error('Could not extract product title. The link may be invalid or the page was blocked.');
  if (!scraped.price)  throw new Error('Could not extract product price. The product may be unavailable or access was restricted.');

  // LLM offer evaluation (non-blocking — product data is returned even if LLM fails)
  let bestOffer = { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: scraped.price, offerDescription: 'No card discount available' };
  if (scraped.rawOffers?.length > 0) {
    try { bestOffer = await evaluateBestOffer(scraped.price, scraped.rawOffers); }
    catch (e) { console.warn('[Crawler] LLM failed:', e.message); }
  }

  // Save to MongoDB
  let doc;
  try {
    doc = await ScrapedProduct.findOneAndUpdate(
      { url: normalizedUrl },
      {
        url: normalizedUrl, domain: scraped.domain, title: scraped.title,
        price: scraped.price, asin: scraped.asin || '', image: scraped.image || '',
        rawOffers: scraped.rawOffers || [], bestOffer, lastScrapedAt: new Date(),
      },
      { new: true, upsert: true }
    );
  } catch (e) {
    console.error('[Crawler] MongoDB save failed:', e.message);
    // Still return data even if DB save fails
    doc = {
      title: scraped.title, price: scraped.price, image: scraped.image,
      rawOffers: scraped.rawOffers, bestOffer, asin: scraped.asin,
      updatedAt: new Date(), lowestEver: scraped.lowestEver,
    };
  }

  return buildResponse({ ...doc, lowestEver: scraped.lowestEver }, merchant, false);
}

function buildResponse(doc, merchant, cached) {
  return {
    success: true,
    cached,
    product: {
      title: doc.title,
      price: doc.price,
      currency: 'INR',
      image: doc.image || '',
      asin: doc.asin || null,
      lowestEver: doc.lowestEver || 0,  // Price history data (from Keepa)
    },
    best_card: {
      bank: doc.bestOffer?.bestOfferBank || '',
      discount_amount: doc.bestOffer?.discountAmount || 0,
      final_price: doc.bestOffer?.finalPriceAfterDiscount || doc.price,
      card_name: doc.bestOffer?.offerDescription || 'No card discount available',
    },
    raw_offers: doc.rawOffers || [],
    merchant,
    timestamp: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// ROUTE HANDLERS
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { productUrl } = body;
    if (!productUrl?.trim()) return NextResponse.json({ success: false, message: 'productUrl is required' }, { status: 400 });
    const result = await getOrScrapeProduct(productUrl.trim());
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    console.error('[extract-product POST]', err.message);
    const status = err.message?.includes('out of stock') ? 422
      : err.message?.includes('bot') || err.message?.includes('blocked') ? 503
      : err.message?.includes('Database') ? 503
      : 500;
    return NextResponse.json({ success: false, message: err.message || 'Internal server error' }, { status });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productUrl = searchParams.get('url');
    if (!productUrl?.trim()) return NextResponse.json({ success: false, message: 'url param required' }, { status: 400 });
    const result = await getOrScrapeProduct(productUrl.trim());
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    console.error('[extract-product GET]', err.message);
    const status = err.message?.includes('out of stock') ? 422
      : err.message?.includes('bot') || err.message?.includes('blocked') ? 503
      : 500;
    return NextResponse.json({ success: false, message: err.message || 'Internal server error' }, { status });
  }
}
