import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ScrapedProduct } from '@/models/ScrapedProduct';
import { scrapeProduct } from '@/lib/scraper';
import { evaluateBestOffer } from '@/lib/llmService';

// Extract merchant domain helper
function extractMerchant(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    if (domain.includes('amazon')) return 'amazon';
    if (domain.includes('flipkart')) return 'flipkart';
    return 'generic';
  } catch {
    return null;
  }
}

/**
 * Common extraction function that integrates database caching, Playwright dynamic scraping, and LLM evaluation.
 */
async function getOrScrapeProductData(productUrl) {
  const merchant = extractMerchant(productUrl);
  if (!merchant || merchant === 'generic') {
    return {
      success: false,
      message: 'Unsupported merchant. Only Amazon and Flipkart products are supported.',
    };
  }

  const normalizedUrl = productUrl.trim().toLowerCase();
  await connectDB();

  // Cache limit window: 12 hours ago
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  // Check cache first
  const cachedDoc = await ScrapedProduct.findOne({
    url: normalizedUrl,
    updatedAt: { $gte: twelveHoursAgo },
  });

  if (cachedDoc) {
    console.log(`[Extract Product Route] Cache hit for: ${normalizedUrl}`);
    return {
      success: true,
      cached: true,
      product: {
        title: cachedDoc.title,
        price: cachedDoc.price,
        currency: 'INR',
        image: cachedDoc.image || '',
        description: '',
      },
      best_card: {
        bank: cachedDoc.bestOffer.bestOfferBank || 'Any Bank',
        discount_amount: cachedDoc.bestOffer.discountAmount || 0,
        card_name: cachedDoc.bestOffer.offerDescription || 'Best Available Card',
      },
      merchant,
      timestamp: cachedDoc.updatedAt.toISOString(),
    };
  }

  // Cache miss - execute Playwright dynamic crawling
  console.log(`[Extract Product Route] Cache miss. Scraping: ${normalizedUrl}`);
  const scrapedData = await scrapeProduct(normalizedUrl);

  if (!scrapedData.success) {
    throw new Error('Failed to extract product page data.');
  }

  // Parse raw offers with LLM Service
  console.log(`[Extract Product Route] Crawled successfully. Running LLM offer analysis...`);
  const bestOffer = await evaluateBestOffer(scrapedData.price, scrapedData.rawOffers);

  // Save to Mongoose Cache
  const upsertData = {
    url: normalizedUrl,
    domain: scrapedData.domain,
    title: scrapedData.title,
    price: scrapedData.price,
    image: scrapedData.image || '',
    rawOffers: scrapedData.rawOffers,
    bestOffer: bestOffer,
    lastScrapedAt: new Date(),
  };

  const savedDoc = await ScrapedProduct.findOneAndUpdate(
    { url: normalizedUrl },
    upsertData,
    { new: true, upsert: true }
  );

  return {
    success: true,
    cached: false,
    product: {
      title: savedDoc.title,
      price: savedDoc.price,
      currency: 'INR',
      image: savedDoc.image || '',
      description: '',
    },
    best_card: {
      bank: savedDoc.bestOffer.bestOfferBank || 'Any Bank',
      discount_amount: savedDoc.bestOffer.discountAmount || 0,
      card_name: savedDoc.bestOffer.offerDescription || 'Best Available Card',
    },
    merchant,
    timestamp: savedDoc.updatedAt.toISOString(),
  };
}

/**
 * POST /api/crawler/extract-product
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { productUrl } = body;

    if (!productUrl) {
      return NextResponse.json(
        { success: false, message: 'productUrl required' },
        { status: 400 }
      );
    }

    const result = await getOrScrapeProductData(productUrl);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });

  } catch (err) {
    console.error('[Extract Product POST Error]:', err.message);
    
    let status = 500;
    if (err.message.includes('out of stock')) status = 422;
    else if (err.message.includes('bot detection') || err.message.includes('Blocked')) status = 503;

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to extract product: ' + err.message 
      },
      { status }
    );
  }
}

/**
 * GET /api/crawler/extract-product?url=...
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productUrl = searchParams.get('url');

    if (!productUrl) {
      return NextResponse.json(
        { success: false, message: 'url query param required' },
        { status: 400 }
      );
    }

    const result = await getOrScrapeProductData(productUrl);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });

  } catch (err) {
    console.error('[Extract Product GET Error]:', err.message);
    
    let status = 500;
    if (err.message.includes('out of stock')) status = 422;
    else if (err.message.includes('bot detection') || err.message.includes('Blocked')) status = 503;

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to extract product: ' + err.message 
      },
      { status }
    );
  }
}
