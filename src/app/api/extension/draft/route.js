import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const DB_NAME = 'offerbridge';
const env = (k) => process.env[k] || '';


async function getDB() {
  if (!global._mongooseCache) global._mongooseCache = { conn: null, promise: null };
  const cache = global._mongooseCache;
  if (cache.conn) return cache.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not configured.');
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
  if (mongoose.models.ExtDraft) return mongoose.models.ExtDraft;

  const schema = new mongoose.Schema({
    productUrl: { type: String, required: true },
    merchant:   { type: String, enum: ['amazon', 'flipkart'], required: true },
    title:      { type: String, default: '' },
    price:      { type: Number, default: 0 },
    image:      { type: String, default: '' },
    rawOffers:  { type: [String], default: [] },
    bestOffer: {
      bestOfferBank:           { type: String, default: '' },
      discountAmount:          { type: Number, default: 0 },
      finalPriceAfterDiscount: { type: Number, default: 0 },
      offerDescription:        { type: String, default: '' },
    },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 60 * 1000) },
  }, { timestamps: true });

  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  return mongoose.model('ExtDraft', schema);
}

const GROQ_SYSTEM_PROMPT = `You are a financial offer parser for Indian e-commerce. Given a product price in INR and a list of raw credit/debit card offer strings scraped from Amazon or Flipkart, determine the single best card offer.

Rules:
1. Parse percentage discounts (e.g. "10% off") and calculate INR savings from the product price.
2. Apply any cap mentioned (e.g. "up to ₹1500" means max saving is ₹1500).
3. Apply minimum purchase requirements — if price is below the minimum, skip that offer.
4. Compare all valid offers and pick the one with the highest absolute INR discount.
5. If no valid offers, return discountAmount: 0.

Return ONLY a valid JSON object, no markdown, no explanation:
{"bestOfferBank":"HDFC","discountAmount":1500,"finalPriceAfterDiscount":33500,"offerDescription":"10% off up to ₹1500 on HDFC Credit Card"}`;

async function evaluateWithGroq(price, rawOffers) {
  const key = env('GROQ_API_KEY');
  if (!key || !rawOffers?.length) {
    return { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: price, offerDescription: 'No card discount available' };
  }

  try {
    const prompt = `Product Price: ₹${price}\n\nOffer strings:\n${rawOffers.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\nReturn the best offer as JSON.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: GROQ_SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 256,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API ${res.status}: ${err}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty Groq response');

    const parsed = JSON.parse(text);
    return {
      bestOfferBank:           parsed.bestOfferBank || '',
      discountAmount:          typeof parsed.discountAmount === 'number' ? parsed.discountAmount : 0,
      finalPriceAfterDiscount: typeof parsed.finalPriceAfterDiscount === 'number' ? parsed.finalPriceAfterDiscount : price,
      offerDescription:        parsed.offerDescription || 'Card offer applied',
    };
  } catch (e) {
    console.warn('[Groq] Offer evaluation failed:', e.message);
    return localFallback(price, rawOffers);
  }
}

function localFallback(price, rawOffers) {
  let best = { bestOfferBank: '', discountAmount: 0, finalPriceAfterDiscount: price, offerDescription: 'No card discount available' };
  const BANKS = ['HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK', 'INDUSIND', 'RBL', 'HSBC', 'FEDERAL', 'BOB', 'IDFC'];

  for (const offer of rawOffers) {
    const up = offer.toUpperCase();
    const bank = BANKS.find(b => up.includes(b)) || '';
    if (!bank) continue;

    const minM = offer.match(/(?:minimum|min\.?|on orders? of)\s*₹?\s*([\d,]+)/i);
    if (minM && price < parseInt(minM[1].replace(/,/g, ''), 10)) continue;

    let discount = 0;
    const flatM = offer.match(/(?:flat|save|rs\.?|₹|inr)\s*([\d,]+)\s*(?:off|instant|cashback)/i);
    if (flatM) discount = parseInt(flatM[1].replace(/,/g, ''), 10);

    const pctM = offer.match(/(\d+)%\s*(?:instant\s+)?(?:discount|off|cashback)/i);
    if (pctM) {
      let calc = Math.round(price * parseInt(pctM[1], 10) / 100);
      const capM = offer.match(/(?:up\s+to|upto|max(?:imum)?)\s*₹?\s*([\d,]+)/i);
      if (capM) calc = Math.min(calc, parseInt(capM[1].replace(/,/g, ''), 10));
      if (calc > discount) discount = calc;
    }

    if (discount > best.discountAmount) {
      best = { bestOfferBank: bank, discountAmount: discount, finalPriceAfterDiscount: price - discount, offerDescription: offer.slice(0, 120) };
    }
  }
  return best;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { productUrl, merchant, title, price, image, rawOffers } = body;

    if (!productUrl || !merchant || !price) {
      return NextResponse.json({ success: false, message: 'productUrl, merchant, and price are required.' }, { status: 400 });
    }

    const bestOffer = await evaluateWithGroq(price, rawOffers || []);

    const ExtDraft = await getModel();
    const doc = await ExtDraft.create({
      productUrl,
      merchant,
      title: title || '',
      price,
      image: image || '',
      rawOffers: rawOffers || [],
      bestOffer,
    });

    return NextResponse.json({ success: true, draftId: doc._id.toString() });
  } catch (err) {
    console.error('[extension/draft POST]', err.message);
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'id param required' }, { status: 400 });

    const ExtDraft = await getModel();
    const doc = await ExtDraft.findById(id).lean();
    if (!doc) return NextResponse.json({ success: false, message: 'Draft not found or expired.' }, { status: 404 });

    return NextResponse.json({
      success: true,
      productUrl: doc.productUrl,
      merchant: doc.merchant,
      title: doc.title,
      price: doc.price,
      image: doc.image,
      rawOffers: doc.rawOffers,
      bestOffer: doc.bestOffer,
    });
  } catch (err) {
    console.error('[extension/draft GET]', err.message);
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
