<<<<<<< HEAD
import { Router } from 'express';
import { scrapeAmazon } from '../lib/crawlerAmazon';
import { scrapeFlipkart } from '../lib/crawlerFlipkart';
import { scrapeMyntra } from '../lib/crawlerMyntra';
import {
  getMerchant, validateProductUrl, parsePrice, sanitizeUrl,
  parseStructuredBankOffers, extractBankOffers,
  type ScrapedProduct,
} from '../lib/crawlerUtils';

const router = Router();

// ─── Merchant helpers ────────────────────────────────────────────────────────

const MERCHANT_DISCOUNTS: Record<string, { base: number; max: number }> = {
  amazon:     { base: 5,  max: 20 },
  flipkart:   { base: 5,  max: 15 },
  myntra:     { base: 5,  max: 20 },
  cred:       { base: 3,  max: 25 },
  swiggy:     { base: 10, max: 20 },
  bookmyshow: { base: 5,  max: 15 },
  yatra:      { base: 5,  max: 15 },
  makemytrip: { base: 5,  max: 15 },
};

const CARD_BANK_BONUSES: Record<string, number> = {
  HDFC: 2, ICICI: 1.5, Axis: 2, SBI: 1, Amex: 3, Mastercard: 0.5, Visa: 0.5,
};

function extractMerchant(url: string): string {
  return getMerchant(url) ?? 'amazon';
}

/** Pick the best bank offer by highest discount amount among structured offers */
function pickBestCard(scraped: ScrapedProduct, price: number) {
  if (!scraped.bankOffers?.length) return null;

  // Find offer with highest discount amount or highest percentage
  let best = scraped.bankOffers[0];
  for (const offer of scraped.bankOffers) {
    const isBetter =
      offer.discountAmount > best.discountAmount ||
      (offer.discountAmount === best.discountAmount && offer.discountPercent > best.discountPercent);
    if (isBetter) best = offer;
  }

  // If we couldn't parse an amount from the offer text, estimate
  let discountAmount = best.discountAmount;
  if (!discountAmount && best.discountPercent > 0) {
    discountAmount = Math.round((price * best.discountPercent) / 100);
  }
  if (!discountAmount) {
    // Fall back to merchant-based estimate
    const info = MERCHANT_DISCOUNTS[scraped.domain] || { base: 5, max: 15 };
    discountAmount = Math.round((price * info.base) / 100);
  }

  return {
    bank: best.bank,
    card_type: best.cardType,
    card_name: best.description.slice(0, 80),
    discount_amount: discountAmount,
    discount_percent: best.discountPercent || 0,
    final_price: Math.max(0, price - discountAmount),
    source: 'scraped' as const,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/** POST /api/crawler/extract-product — main auto-fill endpoint */
router.post('/crawler/extract-product', async (req, res) => {
  try {
    const { productUrl: rawUrl = '' } = req.body as { productUrl: string };
    const productUrl = sanitizeUrl(rawUrl);

    if (!productUrl) return res.status(400).json({ success: false, message: 'productUrl is required' });

    // URL format validation
    const validationError = validateProductUrl(productUrl);
    if (validationError) return res.status(422).json({ success: false, message: validationError });

    const merchant = getMerchant(productUrl);
    if (!merchant) {
      return res.status(422).json({
        success: false,
        message: 'Unsupported merchant. Currently supported: Amazon India, Flipkart, and Myntra.',
      });
    }

    // Run the right scraper
    let scraped: ScrapedProduct;
    if (merchant === 'amazon') {
      scraped = await scrapeAmazon(productUrl);
    } else if (merchant === 'flipkart') {
      scraped = await scrapeFlipkart(productUrl);
    } else {
      scraped = await scrapeMyntra(productUrl);
    }

    const price = scraped.price;
    const bestCard = pickBestCard(scraped, price);

    return res.json({
      success: true,
      merchant,
      product: {
        url: productUrl,
        title: scraped.title,
        price,
        originalPrice: scraped.originalPrice,
        rating: scraped.rating,
        reviewCount: scraped.reviewCount,
        availability: scraped.availability,
        sellerName: scraped.sellerName,
        image: scraped.image,
        asin: scraped.asin,
        lowestEver: scraped.lowestEver,
      },
      bank_offers: scraped.bankOffers,
      raw_offers: scraped.rawOffers,
      best_card: bestCard,
    });
  } catch (err: any) {
    const msg = err?.message || 'Could not extract product details.';
    req.log.error({ err }, '[crawler/extract-product]');
    // User-facing messages (blocking, invalid URL, etc.) come through as plain strings
    if (msg.length < 300 && !msg.includes('at ')) {
      return res.status(422).json({ success: false, message: msg });
    }
    return res.status(500).json({ success: false, message: 'Extraction failed. Please try again or fill details manually.' });
  }
});

/** GET /api/crawler/discount?url=...&price=...&bank=... */
router.get('/crawler/discount', (req, res) => {
  try {
    const { url = '', price = '0', bank = '' } = req.query as Record<string, string>;
    const merchant = extractMerchant(url);
    const info = MERCHANT_DISCOUNTS[merchant] || { base: 3, max: 10 };
    const numPrice = parsePrice(price);

    let pct = info.base + (CARD_BANK_BONUSES[bank] || 0);
    pct = Math.min(pct, info.max);

    const discount = numPrice > 0 ? Math.round((numPrice * pct) / 100) : 0;
    return res.json({ merchant, discount_percent: pct, discount_amount: discount, final_price: numPrice - discount });
  } catch (err) {
    req.log.error({ err }, '[crawler/discount]');
    return res.status(500).json({ error: 'Server error' });
  }
});

/** POST /api/crawler/best-card { productUrl, price, offers } */
router.post('/crawler/best-card', (req, res) => {
  try {
    const { productUrl = '', price = 0, offers = [] } = req.body as { productUrl: string; price: number; offers: string[] };
    const merchant = extractMerchant(productUrl);
    const numPrice = parsePrice(String(price));

    // Use any offers we were given; otherwise fall back to merchant estimate
    let bestCard = null;
    if (offers.length > 0) {
      const structured = parseStructuredBankOffers(extractBankOffers(offers.join('\n')));
      if (structured.length > 0) {
        let best = structured[0];
        for (const o of structured) {
          if (o.discountAmount > best.discountAmount) best = o;
        }
        const amt = best.discountAmount || Math.round((numPrice * (best.discountPercent || 5)) / 100);
        bestCard = { bank: best.bank, discount_percent: best.discountPercent, discount_amount: amt, final_price: Math.max(0, numPrice - amt), source: 'parsed' };
      }
    }

    if (!bestCard) {
      const info = MERCHANT_DISCOUNTS[merchant] || { base: 5, max: 20 };
      let bestBank = 'HDFC';
      let bestBonus = 0;
      for (const [bank, bonus] of Object.entries(CARD_BANK_BONUSES)) {
        if (bonus > bestBonus) { bestBonus = bonus; bestBank = bank; }
      }
      const pct = Math.min(info.base + bestBonus, info.max);
      const amt = numPrice > 0 ? Math.round((numPrice * pct) / 100) : 0;
      bestCard = { bank: bestBank, discount_percent: pct, discount_amount: amt, final_price: numPrice - amt, source: 'estimated' };
    }

    return res.json({ success: true, merchant, best_card: bestCard });
  } catch (err) {
    req.log.error({ err }, '[crawler/best-card]');
    return res.status(500).json({ error: 'Server error' });
=======
import { Router, type Request, type Response } from 'express';
import { getMerchant, validateProductUrl, autoResolveUrl } from '../crawlers/utils.js';
import { registry } from '../crawlers/registry.js';
import mongoose from 'mongoose';

const router = Router();

// ─── MongoDB helpers ───────────────────────────────────────────────────────────

const DB_NAME = 'offerbridge';

async function getDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (!(global as any)._mongooseCache) (global as any)._mongooseCache = { conn: null, promise: null };
  const cache = (global as any)._mongooseCache;
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { dbName: DB_NAME, bufferCommands: false, maxPoolSize: 10 })
      .then((m: any) => m)
      .catch((e: Error) => { cache.promise = null; return null; });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}

async function getModel() {
  try {
    const conn = await getDB();
    if (!conn) return null;
    if (mongoose.models.ScrapedProduct) return mongoose.models.ScrapedProduct;
    const schema = new mongoose.Schema(
      {
        url:           { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
        domain:        { type: String, enum: ['amazon', 'flipkart', 'myntra'], required: true },
        title:         { type: String, required: true },
        price:         { type: Number, required: true },
        originalPrice: { type: Number, default: 0 },
        rating:        { type: Number, default: 0 },
        reviewCount:   { type: Number, default: 0 },
        availability:  { type: String, default: 'in_stock' },
        sellerName:    { type: String, default: '' },
        asin:          { type: String, default: '' },
        image:         { type: String, default: '' },
        rawOffers:     { type: [String], default: [] },
        bankOffers:    { type: Array, default: [] },
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
  } catch {
    return null;
  }
}

// ─── Offer Evaluation ─────────────────────────────────────────────────────────

async function evaluateOffers(price: number, rawOffers: string[], bankOffers: any[] = []) {
  if (!rawOffers?.length && !bankOffers?.length)
    return { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: price, offerDescription: 'No card discount available' };

  let bestBank = '';
  let bestDiscount = 0;
  let bestDesc = (bankOffers?.[0]?.description || rawOffers?.[0] || 'Bank Offer Available');

  for (const bo of (bankOffers || [])) {
    if (/exchange|trade\s*in|old\s+device|old\s+phone/i.test(bo.description || '')) continue;

    let amt = bo.discountAmount || 0;
    if (!amt && bo.discountPercent && price > 0) {
      amt = Math.round((price * bo.discountPercent) / 100);
    }
    if (amt > bestDiscount && amt < price) {
      bestDiscount = amt;
      bestBank = bo.bank !== 'Other Bank' ? bo.bank : '';
      bestDesc = bo.description;
    }
  }

  if (bestDiscount === 0 && rawOffers.length > 0) {
    for (const raw of rawOffers) {
      if (/exchange|trade\s*in|old\s+device|old\s+phone/i.test(raw)) continue;
      const match = raw.match(/(?:discount|cashback|save|off|upto)\s+(?:of\s+)?(?:₹|Rs\.?)\s*([\d,]+)/i) ||
                    raw.match(/(?:₹|Rs\.?)\s*([\d,]+)\s*(?:off|discount|cashback)/i);
      if (match) {
        const val = parseInt(match[1].replace(/,/g, ''), 10) || 0;
        if (val > 0 && val < price) {
          bestDiscount = val;
          bestDesc = raw;
          break;
        }
      }
    }
  }

  return {
    bestOfferBank: bestBank || 'Bank Offer',
    discountAmount: bestDiscount,
    finalPriceAfterDiscount: Math.max(0, price - bestDiscount),
    offerDescription: bestDesc,
  };
}

// ─── Core scrape logic ────────────────────────────────────────────────────────

async function getOrScrapeProduct(productUrl: string, force: boolean = false) {
  let targetUrl = (productUrl || '').trim();
  targetUrl = await (autoResolveUrl as any)(targetUrl);

  const merchant = (getMerchant as any)(targetUrl);
  if (!merchant)
    return { success: false, message: 'Unsupported URL. Only Amazon.in, Flipkart.com, and Myntra.com links are accepted.' };

  const validationError = (validateProductUrl as any)(targetUrl);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const normalizedUrl = targetUrl.toLowerCase();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  let ScrapedProduct: any = null;
  if (!force) {
    try {
      ScrapedProduct = await getModel();
      if (ScrapedProduct) {
        const cached = await ScrapedProduct.findOne({ url: normalizedUrl, updatedAt: { $gte: twelveHoursAgo } });
        if (cached && cached.price > 10 && cached.title && !cached.title.toLowerCase().includes('unknown')) {
          return buildResponse(cached, merchant, true);
        }
      }
    } catch (e) {}
  } else {
    try { ScrapedProduct = await getModel(); } catch (e) {}
  }

  const scraped = await (registry as any).scrape(targetUrl);

  if (!scraped.title || scraped.title.length < 3)
    throw new Error('Could not extract a valid product title. The page may have been blocked or the link is invalid.');
  if (!scraped.price || scraped.price < 5 || scraped.price > 99_999_999)
    throw new Error('Could not extract a valid product price. The product may be unavailable or the page was blocked.');

  const bestOffer = await evaluateOffers(scraped.price, scraped.rawOffers, scraped.bankOffers);

  let doc: any = { ...scraped, bestOffer, updatedAt: new Date() };
  if (ScrapedProduct) {
    try {
      doc = await ScrapedProduct.findOneAndUpdate(
        { url: normalizedUrl },
        {
          url:           normalizedUrl,
          domain:        scraped.platform || merchant,
          title:         scraped.title,
          price:         scraped.price,
          originalPrice: scraped.originalPrice || scraped.price,
          rating:        scraped.rating || 0,
          reviewCount:   scraped.reviewCount || 0,
          availability:  scraped.availability || 'in_stock',
          sellerName:    scraped.sellerName || '',
          asin:          scraped.asin || '',
          image:         scraped.image || '',
          rawOffers:     scraped.rawOffers || [],
          bankOffers:    scraped.bankOffers || [],
          bestOffer,
          lastScrapedAt: new Date(),
        },
        { new: true, upsert: true },
      );
    } catch (e) {}
  }
  return buildResponse({ ...scraped, bestOffer, updatedAt: new Date() }, merchant, false);
}

function buildResponse(doc: any, merchant: string, cached: boolean) {
  return {
    success: true,
    cached,
    product: {
      title:         doc.title || '',
      price:         doc.price || 0,
      originalPrice: doc.originalPrice || doc.price || 0,
      currency:      'INR',
      image:         doc.image || '',
      rating:        doc.rating || 0,
      reviewCount:   doc.reviewCount || 0,
      availability:  doc.availability || 'in_stock',
      sellerName:    doc.sellerName || '',
      asin:          doc.asin || null,
      lowestEver:    doc.lowestEver || 0,
    },
    best_card: {
      bank:            doc.bestOffer?.bestOfferBank           || '',
      discount_amount: doc.bestOffer?.discountAmount          || 0,
      final_price:     doc.bestOffer?.finalPriceAfterDiscount || doc.price || 0,
      card_name:       doc.bestOffer?.offerDescription        || 'No card discount available',
    },
    bank_offers: doc.bankOffers || [],
    raw_offers:  doc.rawOffers || [],
    merchant:    doc.platform || merchant,
    timestamp:   doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/crawler/extract-product
router.post('/extract-product', async (req: Request, res: Response) => {
  try {
    const body       = req.body || {};
    const productUrl = (body.productUrl || '').trim();
    const force      = body.force === true || body.force === 'true';
    if (!productUrl) {
      return res.status(400).json({ success: false, message: 'productUrl is required in the request body' });
    }
    const result = await getOrScrapeProduct(productUrl, force);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    const msg    = err.message || 'An unexpected server error occurred.';
    const status = msg.includes('out of stock') ? 422
      : (msg.includes('blocking') || msg.includes('blocked') || msg.includes('bot')) ? 503
      : 500;
    return res.status(status).json({ success: false, message: msg });
  }
});

// GET /api/crawler/extract-product?url=...&force=true
router.get('/extract-product', async (req: Request, res: Response) => {
  try {
    const productUrl = ((req.query.url as string) || '').trim();
    const force      = req.query.force === 'true' || req.query.force === '1';
    if (!productUrl) {
      return res.status(400).json({ success: false, message: 'url query parameter is required' });
    }
    const result = await getOrScrapeProduct(productUrl, force);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    const msg    = err.message || 'An unexpected server error occurred.';
    const status = msg.includes('blocking') || msg.includes('blocked') || msg.includes('bot') ? 503 : 500;
    return res.status(status).json({ success: false, message: msg });
>>>>>>> b49c74b (tried a major fix for the crawler)
  }
});

export default router;
