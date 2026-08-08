import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getMerchant, validateProductUrl, autoResolveUrl } from '@/lib/crawlers/utils';
import { registry } from '@/lib/crawlers/registry';

export const maxDuration = 300;

const DB_NAME = 'offerbridge';

async function getDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;

  if (!global._mongooseCache) global._mongooseCache = { conn: null, promise: null };
  const cache = global._mongooseCache;
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { dbName: DB_NAME, bufferCommands: false, maxPoolSize: 10 })
      .then((m) => m)
      .catch((e) => { cache.promise = null; return null; });
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

async function evaluateOffers(price, rawOffers, bankOffers = []) {
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

async function getOrScrapeProduct(productUrl, force = false) {
  let targetUrl = (productUrl || '').trim();
  targetUrl = await autoResolveUrl(targetUrl);

  const merchant = getMerchant(targetUrl);
  if (!merchant)
    return { success: false, message: 'Unsupported URL. Only Amazon.in, Flipkart.com, and Myntra.com links are accepted.' };

  const validationError = validateProductUrl(targetUrl);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const normalizedUrl = targetUrl.toLowerCase();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  let ScrapedProduct = null;
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

  const scraped = await registry.scrape(targetUrl);

  if (!scraped.title || scraped.title.length < 3)
    throw new Error('Could not extract a valid product title. The page may have been blocked or the link is invalid.');

  const isOutOfStock = scraped.availability === 'out_of_stock' || !scraped.price || scraped.price <= 0;
  if (!isOutOfStock && (scraped.price < 5 || scraped.price > 99_999_999))
    throw new Error('Could not extract a valid product price. The product may be unavailable or the page was blocked.');

  const effectivePrice = scraped.price || 0;
  const bestOffer = await evaluateOffers(effectivePrice, scraped.rawOffers, scraped.bankOffers);

  let doc = { ...scraped, availability: isOutOfStock ? 'out_of_stock' : (scraped.availability || 'in_stock'), bestOffer, updatedAt: new Date() };
  if (ScrapedProduct) {
    try {
      doc = await ScrapedProduct.findOneAndUpdate(
        { url: normalizedUrl },
        {
          url:           normalizedUrl,
          domain:        scraped.platform || merchant,
          title:         scraped.title,
          price:         effectivePrice,
          originalPrice: scraped.originalPrice || effectivePrice,
          rating:        scraped.rating || 0,
          reviewCount:   scraped.reviewCount || 0,
          availability:  isOutOfStock ? 'out_of_stock' : (scraped.availability || 'in_stock'),
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
  return buildResponse({ ...scraped, availability: isOutOfStock ? 'out_of_stock' : (scraped.availability || 'in_stock'), bestOffer, updatedAt: new Date() }, merchant, false);
}

function buildResponse(doc, merchant, cached) {
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

export async function POST(request) {
  try {
    const body       = await request.json().catch(() => ({}));
    const productUrl = (body.productUrl || '').trim();
    const force      = body.force === true || body.force === 'true';
    if (!productUrl)
      return NextResponse.json({ success: false, message: 'productUrl is required in the request body' }, { status: 400 });
    const result = await getOrScrapeProduct(productUrl, force);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    const status = err.message?.includes('out of stock') ? 422
      : (err.message?.includes('blocking') || err.message?.includes('blocked') || err.message?.includes('bot')) ? 503
      : 500;
    return NextResponse.json({ success: false, message: err.message || 'An unexpected server error occurred.' }, { status });
  }
}

export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const productUrl   = (searchParams.get('url') || '').trim();
    const force        = searchParams.get('force') === 'true' || searchParams.get('force') === '1';
    if (!productUrl)
      return NextResponse.json({ success: false, message: 'url query parameter is required' }, { status: 400 });
    const result = await getOrScrapeProduct(productUrl, force);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (err) {
    const status = err.message?.includes('out of stock') ? 422
      : (err.message?.includes('blocking') || err.message?.includes('blocked') || err.message?.includes('bot')) ? 503
      : 500;
    return NextResponse.json({ success: false, message: err.message || 'An unexpected server error occurred.' }, { status });
  }
}
