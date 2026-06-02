import { NextResponse } from 'next/server';

function env(key) { return process.env[key] || ''; }

let _mongoose = null;
let _ScrapedProduct = null;

async function getDB() {
  if (!_mongoose) {
    const uri = env('MONGODB_URI');
    if (!uri) throw new Error('MONGODB_URI is not configured in environment variables.');
    const m = await import('mongoose');
    const mongoose = m.default;
    if (mongoose.connection.readyState === 1) {
      _mongoose = mongoose;
    } else {
      global._mongoCache = global._mongoCache || {};
      if (!global._mongoCache.promise) {
        global._mongoCache.promise = mongoose.connect(uri, { bufferCommands: false });
      }
      await global._mongoCache.promise;
      _mongoose = mongoose;
    }
  }
  return _mongoose;
}

async function getModel() {
  if (_ScrapedProduct) return _ScrapedProduct;
  const mongoose = await getDB();
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
  _ScrapedProduct = mongoose.models.ScrapedProduct || mongoose.model('ScrapedProduct', schema);
  return _ScrapedProduct;
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
  return /robot\s*check|verify\s+you\s+are\s+human|captcha|automated\s+access|unusual\s+traffic/i.test(html);
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

async function fetchDirect(url, timeoutMs = 22000) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': randUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-IN,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'DNT': '1',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'none',
      'sec-fetch-user': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 500) throw new Error('Response too small — request was blocked');
  return html;
}

async function fetchViaScraperAPI(url, render = false) {
  const key = env('SCRAPER_API_KEY');
  const params = new URLSearchParams({ api_key: key, url, country_code: 'in', ...(render ? { render: 'true' } : {}) });
  const res = await fetch(`https://api.scraperapi.com/?${params}`, { signal: AbortSignal.timeout(50000) });
  if (!res.ok) throw new Error(`ScraperAPI HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 500) throw new Error('ScraperAPI returned empty response');
  return html;
}

async function fetchPage(url, render = false) {
  const key = env('SCRAPER_API_KEY');
  if (key) return fetchViaScraperAPI(url, render);
  return fetchDirect(url);
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
        const html = await fetchPage(targetUrl, !!env('SCRAPER_API_KEY'));
        if (html && !isBotWall(html)) rawOffers = extractBankOffers(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
      } catch {}
      return { title: keepa.title, price: keepa.price, image: keepa.image, rawOffers, asin, domain: 'amazon', lowestEver: keepa.lowestEver || 0 };
    }

    const targetUrl = asin ? `https://www.amazon.in/dp/${asin}` : productUrl;
    let html;
    try {
      html = await fetchPage(targetUrl, !!env('SCRAPER_API_KEY'));
    } catch (e) {
      const msg = e.message || '';
      const blocked = msg.includes('403') || msg.includes('503') || msg.includes('blocked') || msg.includes('too small');
      throw new Error(blocked
        ? `Amazon is blocking automated access.${env('SCRAPER_API_KEY') ? ' ScraperAPI also hit issues — try again.' : ' Add SCRAPER_API_KEY to .env for reliable bypass.'}`
        : `Could not load Amazon page: ${msg}`);
    }
    if (isBotWall(html)) throw new Error(`Amazon bot-detection wall encountered.${env('SCRAPER_API_KEY') ? ' Try again in a minute.' : ' Add SCRAPER_API_KEY to .env to bypass.'}`);
    const parsed = parseAmazon(html, asin);
    return { ...parsed, domain: 'amazon', lowestEver: 0 };
  }

  let html;
  try {
    html = await fetchPage(productUrl, false);
  } catch (e) {
    const msg = e.message || '';
    const blocked = msg.includes('403') || msg.includes('503') || msg.includes('blocked');
    throw new Error(blocked
      ? `Flipkart is blocking automated access.${env('SCRAPER_API_KEY') ? ' ScraperAPI also hit issues.' : ' Add SCRAPER_API_KEY to .env for reliable bypass.'}`
      : `Could not load Flipkart page: ${msg}`);
  }
  if (isBotWall(html)) throw new Error('Flipkart bot-detection encountered. Try again shortly.');
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

  const scraped = await scrapeProduct(normalizedUrl, merchant);

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
