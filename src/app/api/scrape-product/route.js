import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ScrapedProduct } from '@/models/ScrapedProduct';
import { scrapeProduct } from '@/lib/scraper';
import { evaluateBestOffer } from '@/lib/llmService';

// Supported domains check
function isValidUrl(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    return domain.includes('amazon.in') || 
           domain.includes('amazon.com') || 
           domain.includes('flipkart.com');
  } catch {
    return false;
  }
}

/**
 * Handle scrape and LLM processing
 */
async function processScrape(productUrl) {
  const normalizedUrl = productUrl.trim().toLowerCase();
  
  // 1. Scraping execution
  console.log(`[API Route] Cache miss. Initiating browser scraper for: ${normalizedUrl}`);
  const scrapedData = await scrapeProduct(productUrl);
  
  if (!scrapedData.success) {
    throw new Error('Failed to scrape the product webpage.');
  }

  // 2. Evaluate credit card/bank offers using LLM
  console.log(`[API Route] Scraped successfully. Invoking LLM for offer evaluation on price: ${scrapedData.price}`);
  const bestOffer = await evaluateBestOffer(scrapedData.price, scrapedData.rawOffers);

  // 3. Save or update cache in MongoDB ScrapedProducts
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

  console.log(`[API Route] Saving scraped results to MongoDB for url: ${normalizedUrl}`);
  const savedDoc = await ScrapedProduct.findOneAndUpdate(
    { url: normalizedUrl },
    upsertData,
    { new: true, upsert: true }
  );

  return savedDoc;
}

/**
 * POST Route
 * Body JSON: { "productUrl": "https://..." }
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { productUrl } = body;

    if (!productUrl) {
      return NextResponse.json(
        { error: 'productUrl parameter is required' },
        { status: 400 }
      );
    }

    if (!isValidUrl(productUrl)) {
      return NextResponse.json(
        { error: 'Unsupported URL. Only Amazon and Flipkart products are supported.' },
        { status: 400 }
      );
    }

    await connectDB();

    // Cache expiration time window: 12 hours ago
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    
    // Check MongoDB cache
    const cachedDoc = await ScrapedProduct.findOne({
      url: productUrl.trim().toLowerCase(),
      updatedAt: { $gte: twelveHoursAgo },
    });

    if (cachedDoc) {
      console.log(`[API Route] Cache hit for URL: ${productUrl}`);
      return NextResponse.json({
        success: true,
        cached: true,
        data: cachedDoc,
      });
    }

    // Cache miss - Scrape and evaluate
    const finalDoc = await processScrape(productUrl);

    return NextResponse.json({
      success: true,
      cached: false,
      data: finalDoc,
    });

  } catch (error) {
    console.error('[API Route Error] scraping process failed:', error.message);
    
    // Graceful error status codes
    let status = 500;
    if (error.message.includes('out of stock')) {
      status = 422; // Unprocessable Entity for out-of-stock items
    } else if (error.message.includes('bot detection') || error.message.includes('Blocked')) {
      status = 503; // Service Unavailable
    } else if (error.message.includes('Unsupported domain')) {
      status = 400;
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'An error occurred while processing the product page.' 
      },
      { status }
    );
  }
}

/**
 * GET Route (Convenience fallback/testing)
 * Query Param: ?url=https://...
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productUrl = searchParams.get('url');

    if (!productUrl) {
      return NextResponse.json(
        { error: 'url query parameter is required' },
        { status: 400 }
      );
    }

    if (!isValidUrl(productUrl)) {
      return NextResponse.json(
        { error: 'Unsupported URL. Only Amazon and Flipkart products are supported.' },
        { status: 400 }
      );
    }

    await connectDB();

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const cachedDoc = await ScrapedProduct.findOne({
      url: productUrl.trim().toLowerCase(),
      updatedAt: { $gte: twelveHoursAgo },
    });

    if (cachedDoc) {
      console.log(`[API GET Route] Cache hit for URL: ${productUrl}`);
      return NextResponse.json({
        success: true,
        cached: true,
        data: cachedDoc,
      });
    }

    const finalDoc = await processScrape(productUrl);

    return NextResponse.json({
      success: true,
      cached: false,
      data: finalDoc,
    });

  } catch (error) {
    console.error('[API GET Route Error] failed:', error.message);
    let status = 500;
    if (error.message.includes('out of stock')) status = 422;
    else if (error.message.includes('bot detection') || error.message.includes('Blocked')) status = 503;

    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred.' },
      { status }
    );
  }
}
