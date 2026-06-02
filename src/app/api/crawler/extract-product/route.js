import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ScrapedProduct } from '@/models/ScrapedProduct';
import { evaluateBestOffer } from '@/lib/llmService';

// ─── Bot-bypass fetch headers ─────────────────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];
const getUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// ─── Domain helpers ───────────────────────────────────────────────────────────
function getMerchant(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes('amazon')) return 'amazon';
    if (h.includes('flipkart')) return 'flipkart';
    return null;
  } catch {
    return null;
  }
}

// ─── HTML Fetch with retries ──────────────────────────────────────────────────
async function fetchHTML(url, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': getUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (!html || html.length < 500) throw new Error('Page response too small — likely blocked');
      return html;
    } catch (e) {
      lastErr = e;
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

// ─── Shared HTML parsers ───────────────────────────────────────────────────────
function parsePrice(text) {
  if (!text) return 0;
  const clean = text.replace(/[₹,\s]/g, '').split('.')[0];
  const n = parseInt(clean, 10);
  return isNaN(n) ? 0 : n;
}

function extractJsonLD(html) {
  try {
    // Amazon & Flipkart both embed JSON-LD Product schema
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      try {
        const obj = JSON.parse(m[1]);
        if (obj['@type'] === 'Product') return obj;
        // Sometimes it's an array
        if (Array.isArray(obj)) {
          const prod = obj.find(o => o['@type'] === 'Product');
          if (prod) return prod;
        }
      } catch {}
    }
  } catch {}
  return null;
}

function extractOGMeta(html, prop) {
  const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'));
  return m ? m[1] : null;
}

// ─── Amazon extractor ─────────────────────────────────────────────────────────
function parseAmazon(html) {
  // Title
  let title = '';
  const titleM = html.match(/<span[^>]+id=["']productTitle["'][^>]*>\s*([\s\S]*?)\s*<\/span>/i);
  if (titleM) title = titleM[1].replace(/<[^>]+>/g, '').trim();
  if (!title) title = extractOGMeta(html, 'title') || '';

  // Price — try multiple patterns in order of reliability
  let price = 0;
  const pricePatterns = [
    // JSON-LD first
    () => {
      const ld = extractJsonLD(html);
      return ld?.offers?.price || ld?.offers?.lowPrice || null;
    },
    // .a-price-whole (most common on live pages)
    () => {
      const m = html.match(/<span[^>]+class=["'][^"']*a-price-whole[^"']*["'][^>]*>([\d,]+)/i);
      return m ? m[1] : null;
    },
    // priceblock selectors
    () => {
      const m = html.match(/<span[^>]+id=["']priceblock_(?:ourprice|dealprice|saleprice)["'][^>]*>\s*₹?\s*([\d,]+)/i);
      return m ? m[1] : null;
    },
    // apex_price
    () => {
      const m = html.match(/["']apex_price["'][^>]*>\s*₹?\s*([\d,]+)/i);
      return m ? m[1] : null;
    },
    // Generic ₹ pattern near "price" keyword
    () => {
      const m = html.match(/(?:price|Price)[^₹]*₹\s*([\d,]+)/);
      return m ? m[1] : null;
    },
  ];

  for (const fn of pricePatterns) {
    try {
      const raw = fn();
      if (raw) {
        const p = parsePrice(raw.toString());
        if (p > 0) { price = p; break; }
      }
    } catch {}
  }

  // Image
  const image = extractOGMeta(html, 'image') || '';

  // Detect out-of-stock
  if (/currently\s+unavailable|out\s+of\s+stock|item\s+is\s+unavailable/i.test(html)) {
    throw new Error('Product is currently out of stock on Amazon.');
  }

  // Bank / CC offers — Amazon embeds them in text blocks
  const rawOffers = [];
  const offerPatterns = [
    /Bank Offer[^<]{10,200}/gi,
    /Credit Card[^<]{10,150}(?:off|discount|cashback)[^<]{0,100}/gi,
    /(?:HDFC|ICICI|SBI|AXIS|Kotak|IndusInd|RBL|HSBC)[^<]{10,200}(?:off|discount|cashback)[^<]{0,80}/gi,
  ];
  const strippedHtml = html.replace(/<[^>]+>/g, ' ');
  for (const pat of offerPatterns) {
    const matches = strippedHtml.match(pat) || [];
    matches.forEach(m => {
      const clean = m.replace(/\s+/g, ' ').trim();
      if (clean.length > 10 && !rawOffers.some(o => o.includes(clean.slice(0, 30)))) {
        rawOffers.push(clean);
      }
    });
  }

  return { title, price, image, rawOffers: rawOffers.slice(0, 15) };
}

// ─── Flipkart extractor ───────────────────────────────────────────────────────
function parseFlipkart(html) {
  // JSON-LD is the most reliable on Flipkart
  const ld = extractJsonLD(html);

  let title = '';
  if (ld?.name) {
    title = ld.name;
  } else {
    const m = html.match(/<h1[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/i)
      || html.match(/<title>([^|<]+)/i);
    title = (m ? m[1] : extractOGMeta(html, 'title') || '').trim();
  }

  let price = 0;
  if (ld?.offers?.price) {
    price = parsePrice(ld.offers.price.toString());
  }
  if (!price) {
    const pricePatterns = [
      /class=["'][^"']*_30jeq3[^"']*["'][^>]*>\s*₹([\d,]+)/i,
      /class=["'][^"']*Nx9b7S[^"']*["'][^>]*>\s*₹([\d,]+)/i,
      /"selling_price"\s*:\s*"?([\d]+)/i,
      /(?:finalPrice|sellingPrice)\s*[:=]\s*"?([\d,]+)/i,
      /₹\s*([\d,]+)/,
    ];
    for (const pat of pricePatterns) {
      const m = html.match(pat);
      if (m) {
        const p = parsePrice(m[1]);
        if (p > 0) { price = p; break; }
      }
    }
  }

  const image = ld?.image?.[0] || ld?.image || extractOGMeta(html, 'image') || '';

  // Detect out of stock
  if (/sold\s*out|currently\s+unavailable|out\s+of\s+stock/i.test(html)) {
    throw new Error('Product is currently out of stock on Flipkart.');
  }

  // Offers — Flipkart puts them in offer list elements
  const rawOffers = [];
  const strippedHtml = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const offerPatterns = [
    /Bank Offer[^.!]{10,200}/gi,
    /(?:HDFC|ICICI|SBI|AXIS|Kotak|IndusInd|RBL|HSBC|Federal)[^.!]{10,200}(?:off|cashback|discount)/gi,
    /(?:\d+%|₹\s*\d+)\s*(?:instant\s+discount|off|cashback)[^.!]{0,150}/gi,
  ];
  for (const pat of offerPatterns) {
    const matches = strippedHtml.match(pat) || [];
    matches.forEach(m => {
      const clean = m.replace(/\s+/g, ' ').trim();
      if (clean.length > 10 && !rawOffers.some(o => o.includes(clean.slice(0, 30)))) {
        rawOffers.push(clean);
      }
    });
  }

  return { title, price, image, rawOffers: rawOffers.slice(0, 15) };
}

// ─── Core: scrape via fetch + parse ──────────────────────────────────────────
async function fetchAndParse(productUrl, merchant) {
  let html;
  try {
    html = await fetchHTML(productUrl);
  } catch (e) {
    if (e.message?.includes('blocked') || e.message?.includes('403') || e.message?.includes('503')) {
      throw new Error('The product page is blocking automated access right now. Please try again in a few minutes.');
    }
    throw new Error(`Could not load product page: ${e.message}`);
  }

  // Quick bot-wall detection
  if (/robot\s*check|captcha|automated\s+access|unusual\s+traffic/i.test(html)) {
    throw new Error('Amazon/Flipkart is showing a bot-detection page. Please try again later.');
  }

  const parsed = merchant === 'amazon' ? parseAmazon(html) : parseFlipkart(html);

  if (!parsed.title) {
    throw new Error('Could not extract product title. The page structure may have changed or the link is invalid.');
  }
  if (!parsed.price || parsed.price === 0) {
    throw new Error('Could not extract product price. The product may be unavailable or the page blocked the request.');
  }

  return { ...parsed, domain: merchant };
}

// ─── Main logic (cache → scrape → LLM → save) ────────────────────────────────
async function getOrScrapeProduct(productUrl) {
  const merchant = getMerchant(productUrl);
  if (!merchant) {
    return { success: false, message: 'Unsupported URL. Only Amazon and Flipkart products are supported.' };
  }

  const normalizedUrl = productUrl.trim().toLowerCase();
  await connectDB();

  // 12-hour cache check
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const cached = await ScrapedProduct.findOne({
    url: normalizedUrl,
    updatedAt: { $gte: twelveHoursAgo },
  });

  if (cached) {
    console.log(`[Crawler] Cache hit: ${normalizedUrl}`);
    return {
      success: true,
      cached: true,
      product: {
        title: cached.title,
        price: cached.price,
        currency: 'INR',
        image: cached.image || '',
        description: '',
      },
      best_card: {
        bank: cached.bestOffer?.bestOfferBank || 'Any Bank',
        discount_amount: cached.bestOffer?.discountAmount || 0,
        card_name: cached.bestOffer?.offerDescription || 'Best Available Card',
      },
      merchant,
      timestamp: cached.updatedAt.toISOString(),
    };
  }

  // Cache miss — scrape
  console.log(`[Crawler] Cache miss, scraping: ${normalizedUrl}`);
  const scraped = await fetchAndParse(normalizedUrl, merchant);

  // LLM offer evaluation
  let bestOffer = { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: scraped.price, offerDescription: 'No card discount available' };
  try {
    bestOffer = await evaluateBestOffer(scraped.price, scraped.rawOffers);
  } catch (llmErr) {
    console.warn('[Crawler] LLM evaluation failed, using default:', llmErr.message);
  }

  // Upsert into MongoDB
  const doc = await ScrapedProduct.findOneAndUpdate(
    { url: normalizedUrl },
    {
      url: normalizedUrl,
      domain: scraped.domain,
      title: scraped.title,
      price: scraped.price,
      image: scraped.image || '',
      rawOffers: scraped.rawOffers,
      bestOffer,
      lastScrapedAt: new Date(),
    },
    { new: true, upsert: true }
  );

  return {
    success: true,
    cached: false,
    product: {
      title: doc.title,
      price: doc.price,
      currency: 'INR',
      image: doc.image || '',
      description: '',
    },
    best_card: {
      bank: doc.bestOffer?.bestOfferBank || 'Any Bank',
      discount_amount: doc.bestOffer?.discountAmount || 0,
      card_name: doc.bestOffer?.offerDescription || 'Best Available Card',
    },
    merchant,
    timestamp: doc.updatedAt.toISOString(),
  };
}

// ─── Route handlers ───────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { productUrl } = body;

    if (!productUrl?.trim()) {
      return NextResponse.json({ success: false, message: 'productUrl is required' }, { status: 400 });
    }

    const result = await getOrScrapeProduct(productUrl);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });

  } catch (err) {
    console.error('[extract-product POST]', err.message);
    const status = err.message?.includes('out of stock') ? 422
      : err.message?.includes('bot-detection') || err.message?.includes('blocking') ? 503
      : 500;
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productUrl = searchParams.get('url');

    if (!productUrl?.trim()) {
      return NextResponse.json({ success: false, message: 'url query param required' }, { status: 400 });
    }

    const result = await getOrScrapeProduct(productUrl);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });

  } catch (err) {
    console.error('[extract-product GET]', err.message);
    const status = err.message?.includes('out of stock') ? 422
      : err.message?.includes('bot-detection') || err.message?.includes('blocking') ? 503
      : 500;
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status });
  }
}
