import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Offer } from '@/lib/models';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function extractMerchant(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    if (domain.includes('amazon')) return 'amazon';
    if (domain.includes('flipkart')) return 'flipkart';
    if (domain.includes('myntra')) return 'myntra';
    if (domain.includes('cred')) return 'cred';
    return 'generic';
  } catch {
    return null;
  }
}

/**
 * Extract Open Graph metadata from HTML
 */
function extractOpenGraphData(html) {
  try {
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);

    return {
      title: titleMatch?.[1] || null,
      image: imageMatch?.[1] || null,
      description: descMatch?.[1] || null,
    };
  } catch {
    return { title: null, image: null, description: null };
  }
}

function extractJsonLD(html) {
  try {
    const jsonMatch = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([^<]+)<\/script>/i);
    if (!jsonMatch) return null;

    const data = JSON.parse(jsonMatch[1]);

    if (data['@type'] === 'Product') {
      return {
        title: data.name,
        description: data.description,
        image: typeof data.image === 'string' ? data.image : data.image?.[0],
        price: data.offers?.price || data.price?.price,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Flipkart-specific extraction
 */
function extractFlipkartData(html) {
  try {
    // Try JSON-LD first (most reliable)
    const jsonLD = extractJsonLD(html);
    if (jsonLD?.price) {
      return {
        title: jsonLD.title || 'Product',
        price: parseInt(jsonLD.price.toString(), 10) || 0,
        image: jsonLD.image || '',
        description: jsonLD.description || '',
      };
    }

    // Fallback: Extract from Flipkart's page structure
    // Look for price in common patterns
    const pricePatterns = [
      /₹\s*([\d,]+)/,
      /price["\']?\s*:\s*["\']?([\d,]+)/i,
      /productPrice["\']?\s*:\s*["\']?([\d,]+)/i,
    ];

    let price = null;
    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match) {
        price = parseInt(match[1].replace(/,/g, ''), 10);
        break;
      }
    }

    // Extract title from H1 or meta tags
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
      html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch?.[1]?.split('|')?.[0]?.trim();

    // Try OG tags as fallback
    const ogData = extractOpenGraphData(html);

    return {
      title: title || ogData.title || 'Product',
      price: price || 0,
      image: ogData.image || '',
      description: ogData.description || '',
    };
  } catch (e) {
    console.error('[Flipkart Extract]', e);
    return null;
  }
}

/**
 * Amazon-specific extraction
 */
function extractAmazonData(html) {
  try {
    // JSON-LD is most reliable
    const jsonLD = extractJsonLD(html);
    if (jsonLD?.price) {
      return {
        title: jsonLD.title || 'Product',
        price: parseInt(jsonLD.price.toString(), 10) || 0,
        image: jsonLD.image || '',
        description: jsonLD.description || '',
      };
    }

    // Extract from page structure
    const titleMatch = html.match(/<span\s+id=["']productTitle["'][^>]*>([^<]+)<\/span>/);
    const priceMatch = html.match(/<span\s+class=["'][^"']*a-price-whole[^"']*["'][^>]*>([^<]+)<\/span>/);

    const title = titleMatch?.[1]?.trim();
    const priceText = priceMatch?.[1];
    const price = priceText ? parseInt(priceText.replace(/[^\d]/g, ''), 10) : 0;

    const ogData = extractOpenGraphData(html);

    return {
      title: title || ogData.title || 'Product',
      price: price || 0,
      image: ogData.image || '',
      description: ogData.description || '',
    };
  } catch (e) {
    console.error('[Amazon Extract]', e);
    return null;
  }
}

/**
 * Generic extraction using Open Graph + meta tags
 */
function extractGenericData(html) {
  try {
    const jsonLD = extractJsonLD(html);
    if (jsonLD?.price) {
      return {
        title: jsonLD.title || 'Product',
        price: parseInt(jsonLD.price.toString(), 10) || 0,
        image: jsonLD.image || '',
        description: jsonLD.description || '',
      };
    }

    const ogData = extractOpenGraphData(html);

    // Try to find price anywhere
    const priceMatch = html.match(/₹\s*([\d,]+)|price\s*[:=]\s*[^\s]*([\d,]+)/i);
    const price = priceMatch
      ? parseInt((priceMatch[1] || priceMatch[2]).replace(/,/g, ''), 10)
      : 0;

    return {
      title: ogData.title || 'Product',
      price: price || 0,
      image: ogData.image || '',
      description: ogData.description || '',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch product data with retries
 */
async function fetchProductPage(url) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'no-cache',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();

      if (!html || html.length < 1000) {
        throw new Error('Response too small');
      }

      return html;
    } catch (error) {
      lastError = error;
      console.warn(`[Fetch Attempt ${attempt + 1}] Failed:`, error.message);

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 + attempt * 1000));
      }
    }
  }

  throw lastError || new Error('Failed to fetch product page');
}

async function findBestCardForProduct(productPrice) {
  try {
    await connectDB();

    const cards = await Offer.find({ status: 'available', verified: true })
      .select('bank card_name holder_name rating max_amount')
      .lean();

    if (!cards.length) return null;

    const cardDiscounts = cards.map(card => {
      let discountPercent = 3;
      if (card.bank?.includes('Amex')) discountPercent = 5;
      else if (card.bank?.includes('HDFC')) discountPercent = 4;
      else if (card.bank?.includes('ICICI')) discountPercent = 3.5;

      const discountAmount = Math.round(productPrice * (discountPercent / 100));

      return {
        bank: card.bank,
        card_name: card.card_name,
        discount_amount: Math.min(discountAmount, Math.round(productPrice * 0.15)),
      };
    });

    cardDiscounts.sort((a, b) => b.discount_amount - a.discount_amount);
    return cardDiscounts[0];
  } catch (e) {
    console.error('[Find Best Card]', e);
    return null;
  }
}

/**
 * Main extraction function
 */
async function extractProductData(productUrl) {
  const merchant = extractMerchant(productUrl);

  if (!merchant || merchant === 'generic') {
    return {
      success: false,
      message: 'Unsupported merchant',
      merchant,
    };
  }

  try {
    // Fetch HTML with retry logic
    const html = await fetchProductPage(productUrl);

    // Extract based on merchant
    let productData;
    if (merchant === 'flipkart') {
      productData = extractFlipkartData(html);
    } else if (merchant === 'amazon') {
      productData = extractAmazonData(html);
    } else {
      productData = extractGenericData(html);
    }

    if (!productData || !productData.title || productData.price === 0) {
      return {
        success: false,
        message: 'Could not extract product data. Try a different link.',
        merchant,
      };
    }

    // Find best card
    const bestCard = await findBestCardForProduct(productData.price);

    return {
      success: true,
      product: {
        title: productData.title,
        price: productData.price,
        currency: 'INR',
        image: productData.image || '',
        description: productData.description || '',
      },
      best_card: bestCard || {
        bank: 'Any Bank',
        discount_amount: Math.round(productData.price * 0.03),
        card_name: 'Best Available Card',
      },
      merchant,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[Product Extraction]', err.message);
    return {
      success: false,
      message: 'Failed to fetch product: ' + err.message,
      merchant,
    };
  }
}

export async function POST(request) {
  try {
    const { productUrl } = await request.json();

    if (!productUrl) {
      return NextResponse.json(
        { error: 'productUrl required' },
        { status: 400 }
      );
    }

    const result = await extractProductData(productUrl);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (err) {
    console.error('[POST]', err);
    return NextResponse.json(
      { error: 'Server error', details: err.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productUrl = searchParams.get('url');

    if (!productUrl) {
      return NextResponse.json(
        { error: 'url query param required' },
        { status: 400 }
      );
    }

    const result = await extractProductData(productUrl);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (err) {
    console.error('[GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
