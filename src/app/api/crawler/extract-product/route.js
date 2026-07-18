import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const DB_NAME = 'offerbridge';
const env = (k) => process.env[k] || '';

async function getDB() {
  if (!global._mongooseCache) global._mongooseCache = { conn: null, promise: null };
  const cache = global._mongooseCache;
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured in environment variables.');
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, { dbName: DB_NAME, bufferCommands: false, maxPoolSize: 10 })
      .then(m => m)
      .catch(e => { cache.promise = null; throw e; });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

async function getModel() {
  await getDB();
  if (mongoose.models.ScrapedProduct) return mongoose.models.ScrapedProduct;
  const schema = new mongoose.Schema({
    url:       { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    domain:    { type: String, enum: ['amazon', 'flipkart'], required: true },
    title:     { type: String, required: true },
    price:     { type: Number, required: true },
    asin:      { type: String, default: '' },
    image:     { type: String, default: '' },
    rawOffers: { type: [String], default: [] },
    bestOffer: {
      bestOfferBank:           { type: String, default: '' },
      discountAmount:          { type: Number, default: 0 },
      finalPriceAfterDiscount: { type: Number, default: 0 },
      offerDescription:        { type: String, default: '' },
    },
    lastScrapedAt: { type: Date, default: Date.now },
  }, { timestamps: true });
  schema.index({ updatedAt: -1 });
  return mongoose.model('ScrapedProduct', schema);
}

const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];
const randUA = () => UA_POOL[Math.floor(Math.random() * UA_POOL.length)];

function getMerchant(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes('amazon')) return 'amazon';
    if (h.includes('flipkart')) return 'flipkart';
  } catch {}
  return null;
}

function extractASIN(url) {
  const patterns = [
    /\/dp\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /\/gp\/product\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /\/gp\/aw\/d\/([A-Z0-9]{10})(?:\/|\?|$)/i,
    /[?&]asin=([A-Z0-9]{10})(?:&|$)/i,
    /\/([A-Z0-9]{10})(?:\/|\?|$)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]?.length === 10) return m[1].toUpperCase();
  }
  return null;
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
    .replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractJsonLD(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const o = JSON.parse(m[1]);
      const arr = Array.isArray(o) ? o : [o];
      const prod = arr.find(x => x?.['@type'] === 'Product');
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

function isBotWall(html) {
  if (!html) return false;
  // Strip <script> and <style> blocks first — Flipkart/Amazon embed JS config vars
  // that contain words like "captcha" or "automated" causing false-positive bot-wall detection
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  return /robot\s*check|verify\s+you\s+are\s+human|captcha|automated\s+access|unusual\s+traffic/i.test(cleanHtml);
}

function extractBankOffers(text) {
  const seen = new Set();
  const result = [];
  const patterns = [
    /Bank\s+Offer\s*[:\-]?\s*.{20,300}?(?=Bank Offer|$|\n)/gi,
    /(?:Get|Flat|Extra|Avail|Upto|Up\s+to)\s+(?:₹[\d,]+|\d+%)\s*.{10,250}/gi,
    /(?:HDFC|ICICI|SBI|AXIS|Kotak|IndusInd|RBL|HSBC|Federal\s+Bank|Yes\s+Bank|BOB|Union\s+Bank|IDFC|Amex)[^.\n!;]{10,250}?(?:off|cashback|discount|EMI)[^.\n!;]{0,100}/gi,
    /\d+%\s*(?:instant\s+)?(?:discount|off|cashback)[^.\n!;]{10,200}/gi,
  ];
  for (const pat of patterns) {
    for (const m of (text.match(pat) || [])) {
      const clean = m.replace(/\s+/g, ' ').trim().slice(0, 280);
      const key = clean.slice(0, 60).toLowerCase();
      if (clean.length > 15 && !seen.has(key)) { seen.add(key); result.push(clean); }
    }
  }
  return result.slice(0, 15);
}

const BROWSER_PROFILES = [
  {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'sec-ch-ua': '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
  },
  {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'Upgrade-Insecure-Requests': '1',
  },
  {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-IN,hi;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'sec-ch-ua': '"Chromium";v="124", "Android WebView";v="124"',
    'sec-ch-ua-mobile': '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'Upgrade-Insecure-Requests': '1',
  },
];

function toMobileFlipkartUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('flipkart')) {
      u.hostname = 'dl.flipkart.com';
      return u.toString();
    }
  } catch {}
  return url;
}

async function tryFetch(url, profile, timeoutMs = 18000) {
  const res = await fetch(url, {
    headers: { ...profile, 'Referer': 'https://www.google.com/', 'Origin': undefined },
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
  const res = await fetch(`https://api.scraperapi.com/?${params}`, { signal: AbortSignal.timeout(55000) });
  if (!res.ok) throw new Error(`ScraperAPI HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('ScraperAPI returned empty response');
  return html;
}

async function fetchViaJina(url) {
  // Jina AI Reader — free cloud proxy. Use markdown mode (no X-Return-Format header)
  // which uses a different request path than html mode and is less frequently rate-limited
  const jinaUrl = `https://r.jina.ai/${url}`;
  const jinaKey = env('JINA_API_KEY');
  const headers = {
    'Accept': 'text/plain, */*',
    'X-Timeout': '30',
    ...(jinaKey ? { 'Authorization': `Bearer ${jinaKey}` } : {}),
  };

  const res = await fetch(jinaUrl, {
    headers,
    signal: AbortSignal.timeout(40000),
  });
  if (!res.ok) throw new Error(`Jina HTTP ${res.status}`);
  const text = await res.text();
  if (!text || text.length < 300) throw new Error('Jina returned too short response');
  if (/E00[0-9]|Something went wrong|Please try again/i.test(text.slice(0, 500))) {
    throw new Error('Jina service error: ' + text.slice(0, 100));
  }
  console.log(`[Jina] Fetched ${text.length} chars (markdown) for ${url}`);
  return text;
}

async function fetchViaAllOrigins(url) {
  // AllOrigins — free CORS/proxy service, works for many blocked sites
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&charset=UTF-8`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`AllOrigins HTTP ${res.status}`);
  const json = await res.json();
  const html = json?.contents;
  if (!html || html.length < 500) throw new Error('AllOrigins returned empty or too-small response');
  if (isBotWall(html)) throw new Error('AllOrigins: bot wall on response');
  console.log(`[AllOrigins] Fetched ${html.length} chars for ${url}`);
  return html;
}


async function fetchPage(url, merchant) {
  const scraperKey = env('SCRAPER_API_KEY');

  // 1. ScraperAPI (if key configured)
  if (scraperKey) {
    try { return await fetchViaScraperAPI(url); } catch (e) {
      console.warn('[ScraperAPI] Failed:', e.message, '— trying next method');
    }
  }

  // 2. Direct fetch with browser-profile spoofing
  const urls = merchant === 'flipkart'
    ? [url, toMobileFlipkartUrl(url)]
    : [url];

  let lastErr;
  for (const targetUrl of urls) {
    for (const profile of BROWSER_PROFILES) {
      try {
        const html = await tryFetch(targetUrl, profile);
        if (!isBotWall(html)) return html;
        throw new Error('Bot wall detected');
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 400));
      }
    }
  }

  // 3. Jina AI Reader → AllOrigins waterfall (both free, work from Vercel IPs)
  const isBlocked = lastErr?.message?.includes('403') || lastErr?.message?.includes('503')
    || lastErr?.message?.includes('529') || lastErr?.message?.includes('blocked')
    || lastErr?.message?.includes('bot') || lastErr?.message?.includes('too small');

  if (isBlocked) {
    // 3a. Try Jina AI Reader (markdown mode)
    console.log(`[Crawler] Direct fetch blocked. Trying Jina AI Reader for: ${url}`);
    try {
      return await fetchViaJina(url);
    } catch (jinaErr) {
      console.warn('[Jina] Failed:', jinaErr.message, '— trying AllOrigins');
    }

    // 3b. Try AllOrigins as second free proxy
    console.log(`[Crawler] Jina failed. Trying AllOrigins for: ${url}`);
    try {
      return await fetchViaAllOrigins(url);
    } catch (originsErr) {
      console.warn('[AllOrigins] Failed:', originsErr.message);
      throw new Error(
        `${merchant === 'flipkart' ? 'Flipkart' : 'Amazon'} blocked all proxy attempts. ` +
        `Add a SCRAPER_API_KEY to your environment for reliable bypass, or use the Chrome Extension instead.`
      );
    }
  }

  throw lastErr || new Error(`Could not fetch ${merchant} page`);
}



async function fetchKeepa(asin) {
  const key = env('KEEPA_API_KEY');
  if (!key || !asin) return null;
  try {
    const url = `https://api.keepa.com/product?key=${key}&domain=10&asin=${asin}&stats=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const { products } = await res.json();
    const p = products?.[0];
    if (!p) return null;
    const toINR = v => (v > 0 ? Math.round(v / 100) : 0);
    return {
      title: p.title || '',
      price: toINR(p.stats?.current?.[0] ?? -1),
      image: p.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${p.imagesCSV.split(',')[0]}` : '',
      lowestEver: toINR(p.stats?.min?.[0] ?? -1),
    };
  } catch (e) {
    console.warn('[Keepa] Failed:', e.message);
    return null;
  }
}

function parseAmazon(html, asin) {
  const ld = extractJsonLD(html);
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  let title = html.match(/<span[^>]+id=["']productTitle["'][^>]*>\s*([\s\S]*?)\s*<\/span>/i)?.[1]?.replace(/<[^>]+>/g, '').trim()
    || ld?.name
    || extractOG(html, 'title')
    || '';
  title = decodeHTML(title);

  let price = 0;
  if (!price && ld?.offers?.price)    price = parsePrice(ld.offers.price);
  if (!price) {
    const m = html.match(/<span[^>]+class=["'][^"']*a-offscreen[^"']*["'][^>]*>₹\s*([\d,]+)/i);
    if (m) price = parsePrice(m[1]);
  }
  if (!price) {
    const m = html.match(/id=["']priceblock_(?:ourprice|dealprice|saleprice)["'][^>]*>[\s₹]*([\d,]+)/i);
    if (m) price = parsePrice(m[1]);
  }
  if (!price) {
    const m = html.match(/"priceAmount"\s*:\s*([\d.]+)/i) || html.match(/"displayPrice"\s*:\s*"₹\s*([\d,]+)"/i);
    if (m) price = parsePrice(m[1]);
  }
  if (!price) {
    const desc = extractOG(html, 'description');
    const m = desc.match(/₹\s*([\d,]+)/);
    if (m) price = parsePrice(m[1]);
  }
  if (!price) {
    const m = stripped.match(/₹\s*([\d]{2,}(?:,[\d]{2,3})*)/);
    if (m) price = parsePrice(m[1]);
  }

  if (price === 0 && /currently\s+unavailable|out\s+of\s+stock/i.test(html))
    throw new Error('Product is currently out of stock on Amazon.');

  const image = extractOG(html, 'image')
    || html.match(/id=["']landingImage["'][^>]+src=["']([^"']+)["']/i)?.[1]
    || '';

  return { title, price, image, rawOffers: extractBankOffers(stripped), asin: asin || '' };
}

function deepFind(obj, keys, max = 14, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > max) return undefined;
  for (const key of keys) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined) {
      const v = obj[key];
      if (typeof v === 'number' && v > 0) return v;
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  for (const child of (Array.isArray(obj) ? obj : Object.values(obj))) {
    if (child && typeof child === 'object') {
      const r = deepFind(child, keys, max, depth + 1);
      if (r !== undefined) return r;
    }
  }
  return undefined;
}

function parseFlipkart(html) {
  const ld = extractJsonLD(html);
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  let title = ld?.name || '';
  let price = ld?.offers?.price ? parsePrice(String(ld.offers.price)) : 0;
  let image = (Array.isArray(ld?.image) ? ld.image[0] : ld?.image) || extractOG(html, 'image') || '';

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
          const idx = block.indexOf('__INITIAL_STATE__');
          if (idx !== -1) {
            const open = block.indexOf('{', idx);
            if (open !== -1) {
              let depth = 0, inStr = false, esc = false, end = open;
              for (let i = open; i < Math.min(block.length, open + 3_000_000); i++) {
                const c = block[i];
                if (esc)               { esc = false; continue; }
                if (c === '\\' && inStr){ esc = true;  continue; }
                if (c === '"')          { inStr = !inStr; continue; }
                if (!inStr) {
                  if (c === '{') depth++;
                  else if (c === '}') { if (--depth === 0) { end = i; break; } }
                }
              }
              if (end > open) { try { state = JSON.parse(block.slice(open, end + 1)); } catch {} }
            }
          }
        }

        if (state) {
          if (!price) {
            const v = deepFind(state, ['finalPrice', 'sellingPrice', 'price', 'discountedPrice', 'listingPrice']);
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

  if (!title) {
    title = html.match(/<span[^>]+class=["'][^"']*B_NuCI[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]?.replace(/<[^>]+>/g, '').trim()
      || html.match(/<h1[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]?.replace(/<[^>]+>/g, '').trim()
      || extractOG(html, 'title')
      || '';
  }
  if (!price) {
    for (const pat of [
      /class=["'][^"']*_30jeq3[^"']*["'][^>]*>₹\s*([\d,]+)/i,
      /class=["'][^"']*Nx9b7S[^"']*["'][^>]*>₹\s*([\d,]+)/i,
      /"finalPrice"\s*:\s*([\d]+)/,
      /"sellingPrice"\s*:\s*"?([\d,]+)/,
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

async function scrapeProduct(productUrl, merchant) {
  const asin = merchant === 'amazon' ? extractASIN(productUrl) : null;

  if (merchant === 'amazon') {
    const keepa = await fetchKeepa(asin);
    if (keepa?.price > 0) {
      let rawOffers = [];
      try {
        const targetUrl = asin ? `https://www.amazon.in/dp/${asin}` : productUrl;
        const html = await fetchPage(targetUrl, 'amazon');
        if (html && !isBotWall(html)) rawOffers = extractBankOffers(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
      } catch {}
      return { title: keepa.title, price: keepa.price, image: keepa.image, rawOffers, asin, domain: 'amazon', lowestEver: keepa.lowestEver || 0 };
    }

    const targetUrl = asin ? `https://www.amazon.in/dp/${asin}` : productUrl;
    const html = await fetchPage(targetUrl, 'amazon');
    if (isBotWall(html)) throw new Error('Amazon bot-detection wall encountered. Add SCRAPER_API_KEY to your env vars for reliable bypass, or use the Chrome Extension.');
    const parsed = parseAmazon(html, asin);
    return { ...parsed, domain: 'amazon', lowestEver: 0 };
  }

  const html = await fetchPage(productUrl, 'flipkart');
  if (isBotWall(html)) throw new Error('Flipkart bot-detection encountered. Add SCRAPER_API_KEY to your env vars for reliable bypass, or use the Chrome Extension.');
  const parsed = parseFlipkart(html);
  return { ...parsed, domain: 'flipkart', lowestEver: 0 };
}

async function evaluateOffers(price, rawOffers) {
  if (!rawOffers?.length) return { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: price, offerDescription: 'No card discount available' };
  try {
    const { evaluateBestOffer } = await import('@/lib/llmService');
    return await evaluateBestOffer(price, rawOffers);
  } catch (e) {
    console.warn('[LLM] Evaluation failed:', e.message);
    return { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: price, offerDescription: 'Offers found — LLM evaluation unavailable' };
  }
}

async function getOrScrapeProduct(productUrl) {
  const merchant = getMerchant(productUrl);
  if (!merchant) return { success: false, message: 'Unsupported URL. Only Amazon.in and Flipkart.com links are accepted.' };

  const normalizedUrl = productUrl.trim().toLowerCase();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  let ScrapedProduct = null;
  try {
    ScrapedProduct = await getModel();
    const cached = await ScrapedProduct.findOne({ url: normalizedUrl, updatedAt: { $gte: twelveHoursAgo } });
    if (cached) return buildResponse(cached, merchant, true);
  } catch (e) {
    console.warn('[Crawler] Cache lookup failed (scraping fresh):', e.message);
  }

  const scraped = await scrapeProduct(productUrl, merchant);

  if (!scraped.title) throw new Error('Could not extract product title. The link may be invalid or access was blocked.');
  if (!scraped.price) throw new Error('Could not extract product price. The product may be unavailable or access was blocked.');

  const bestOffer = await evaluateOffers(scraped.price, scraped.rawOffers);

  let doc = { ...scraped, bestOffer, updatedAt: new Date() };
  if (ScrapedProduct) {
    try {
      doc = await ScrapedProduct.findOneAndUpdate(
        { url: normalizedUrl },
        { url: normalizedUrl, domain: scraped.domain, title: scraped.title, price: scraped.price, asin: scraped.asin || '', image: scraped.image || '', rawOffers: scraped.rawOffers || [], bestOffer, lastScrapedAt: new Date() },
        { new: true, upsert: true }
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
      title: doc.title || '',
      price: doc.price || 0,
      currency: 'INR',
      image: doc.image || '',
      asin: doc.asin || null,
      lowestEver: doc.lowestEver || 0,
    },
    best_card: {
      bank: doc.bestOffer?.bestOfferBank || '',
      discount_amount: doc.bestOffer?.discountAmount || 0,
      final_price: doc.bestOffer?.finalPriceAfterDiscount || doc.price || 0,
      card_name: doc.bestOffer?.offerDescription || 'No card discount available',
    },
    raw_offers: doc.rawOffers || [],
    merchant,
    timestamp: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const productUrl = (body.productUrl || '').trim();
    if (!productUrl) return NextResponse.json({ success: false, message: 'productUrl is required in the request body' }, { status: 400 });
    const result = await getOrScrapeProduct(productUrl);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    console.error('[extract-product POST ERROR]', err.message, err.stack);
    const status = err.message?.includes('out of stock') ? 422
      : (err.message?.includes('bot') || err.message?.includes('blocked') || err.message?.includes('blocking')) ? 503
      : err.message?.includes('MONGODB_URI') ? 503
      : 500;
    return NextResponse.json({ success: false, message: err.message || 'An unexpected server error occurred.' }, { status });
  }
}

export async function GET(request) {
  try {
    const productUrl = (new URL(request.url).searchParams.get('url') || '').trim();
    if (!productUrl) return NextResponse.json({ success: false, message: 'url query parameter is required' }, { status: 400 });
    const result = await getOrScrapeProduct(productUrl);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    console.error('[extract-product GET ERROR]', err.message, err.stack);
    const status = err.message?.includes('out of stock') ? 422
      : (err.message?.includes('bot') || err.message?.includes('blocked')) ? 503
      : 500;
    return NextResponse.json({ success: false, message: err.message || 'An unexpected server error occurred.' }, { status });
  }
}
