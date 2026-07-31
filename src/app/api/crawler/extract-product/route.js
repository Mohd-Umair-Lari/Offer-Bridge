import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getMerchant, validateProductUrl } from '@/lib/crawlers/utils';
import { scrapeAmazon } from '@/lib/crawlers/amazon';
import { scrapeFlipkart } from '@/lib/crawlers/flipkart';
import { scrapeMyntra } from '@/lib/crawlers/myntra';

export const maxDuration = 300;

const DB_NAME = 'offerbridge';

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

async function evaluateOffers(price, rawOffers) {
  if (!rawOffers?.length)
    return { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: price, offerDescription: 'No card discount available' };
  try {
    const { evaluateBestOffer } = await import('@/lib/llmService');
    return await evaluateBestOffer(price, rawOffers);
  } catch (e) {
    return { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: price, offerDescription: 'Offers found — LLM evaluation unavailable' };
  }
}

async function scrapeProduct(productUrl, merchant) {
  if (merchant === 'amazon') return await scrapeAmazon(productUrl);
  if (merchant === 'flipkart') return await scrapeFlipkart(productUrl);
  if (merchant === 'myntra') return await scrapeMyntra(productUrl);
  throw new Error('Unsupported merchant.');
}

async function getOrScrapeProduct(productUrl, force = false) {
  const merchant = getMerchant(productUrl);
  if (!merchant)
    return { success: false, message: 'Unsupported URL. Only Amazon.in, Flipkart.com, and Myntra.com links are accepted.' };

  const validationError = validateProductUrl(productUrl);
  if (validationError) {
    return { success: false, message: validationError };
  }
  
  const normalizedUrl = productUrl.trim().toLowerCase();
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
  
  let ScrapedProduct = null;
  if (!force) {
    try {
      ScrapedProduct = await getModel();
      const cached = await ScrapedProduct.findOne({ url: normalizedUrl, updatedAt: { $gte: twelveHoursAgo } });
      if (cached) return buildResponse(cached, merchant, true);
    } catch (e) {}
  } else {
    try { ScrapedProduct = await getModel(); } catch (e) {}
  }

  const scraped = await scrapeProduct(normalizedUrl, merchant);
  
  if (!scraped.title || scraped.title.length < 4)
    throw new Error('Could not extract a valid product title. The page may have been blocked, or the link is invalid. Please try the manual entry mode.');
  if (!scraped.price || scraped.price < 10 || scraped.price > 99_999_999)
    throw new Error('Could not extract a valid product price. The product may be unavailable or the page was blocked. Please try the manual entry mode.');
  
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
    } catch (e) {}
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
      : err.message?.includes('MONGODB_URI') ? 503
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
