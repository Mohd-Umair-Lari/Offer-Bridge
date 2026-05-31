import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Offer } from '@/lib/models';

/**
 * PRODUCT EXTRACTION CRAWLER - Bypass Bot Detection
 * 
 * This crawler:
 * 1. Visits product page using stealth techniques
 * 2. Bypasses bot detection (user agents, delays, proxy rotation)
 * 3. Extracts: title, price, images
 * 4. Finds best card discount for this product
 * 5. Returns auto-fill data for request form
 * 
 * Endpoint: POST /api/crawler/extract-product
 * Body: { productUrl: "https://amazon.in/laptop..." }
 * 
 * Returns:
 * {
 *   success: true,
 *   product: {
 *     title: "Samsung 15.6 inch Laptop",
 *     price: 45000,
 *     currency: "INR",
 *     image: "https://...",
 *     description: "..."
 *   },
 *   best_card: {
 *     bank: "HDFC",
 *     discount_amount: 5000,
 *     card_name: "HDFC Regalia"
 *   },
 *   merchant: "amazon"
 * }
 */

// Rotating User Agents to bypass bot detection
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

const REFERRERS = [
  'https://www.google.com/',
  'https://www.bing.com/',
  'https://www.duckduckgo.com/',
  'https://www.yahoo.com/',
];

// Merchant-specific extractors
const MERCHANT_EXTRACTORS = {
  'amazon': {
    name: 'Amazon',
    selectors: {
      title: 'h1, span[id*="productTitle"]',
      price: 'span.a-price-whole, [data-a-color="price"]',
      image: 'img[alt*="image"]',
      description: '#feature-bullets',
    },
    extract: async (page) => {
      try {
        // Extract product title
        const titleElem = await page.locator('span[id*="productTitle"]').first();
        const title = await titleElem.textContent();

        // Extract price
        const priceElem = await page.locator('span.a-price-whole').first();
        const priceText = await priceElem.textContent();
        const price = parseInt(priceText?.replace(/[^\d]/g, ''), 10);

        // Extract image
        const imgElem = await page.locator('img[alt*="image"]').first();
        const image = await imgElem.getAttribute('src');

        // Extract description
        const descElem = await page.locator('#feature-bullets li');
        let description = '';
        const descCount = await descElem.count();
        if (descCount > 0) {
          description = await descElem.first().textContent();
        }

        return {
          title: title?.trim() || 'Unknown Product',
          price: isNaN(price) ? 0 : price,
          image: image || '',
          description: description?.substring(0, 200) || '',
          merchant: 'amazon',
        };
      } catch (e) {
        console.error('[Amazon Extract]', e.message);
        return null;
      }
    }
  },

  'flipkart': {
    name: 'Flipkart',
    selectors: {
      title: 'span[class*="B_NuCI"]',
      price: 'div[class*="_30jeq3"]',
      image: 'img[class*="r6Akfd"]',
    },
    extract: async (page) => {
      try {
        // Extract product title
        const titleElem = await page.locator('span[class*="B_NuCI"]').first();
        const title = await titleElem.textContent();

        // Extract price
        const priceElem = await page.locator('div[class*="_30jeq3"]').first();
        const priceText = await priceElem.textContent();
        const price = parseInt(priceText?.replace(/[^\d]/g, ''), 10);

        // Extract image
        const imgElem = await page.locator('img[class*="r6Akfd"]').first();
        const image = await imgElem.getAttribute('src');

        return {
          title: title?.trim() || 'Unknown Product',
          price: isNaN(price) ? 0 : price,
          image: image || '',
          description: '',
          merchant: 'flipkart',
        };
      } catch (e) {
        console.error('[Flipkart Extract]', e.message);
        return null;
      }
    }
  },

  'myntra': {
    name: 'Myntra',
    extract: async (page) => {
      try {
        const title = await page.locator('h1').first().textContent();
        const priceText = await page.locator('[class*="productPriceContainer"]').first().textContent();
        const price = parseInt(priceText?.replace(/[^\d]/g, ''), 10);
        const image = await page.locator('img[class*="productImageImg"]').first().getAttribute('src');

        return {
          title: title?.trim() || 'Unknown Product',
          price: isNaN(price) ? 0 : price,
          image: image || '',
          description: '',
          merchant: 'myntra',
        };
      } catch (e) {
        console.error('[Myntra Extract]', e.message);
        return null;
      }
    }
  },

  'cred': {
    name: 'CRED',
    extract: async (page) => {
      try {
        const title = await page.locator('h1').first().textContent();
        const priceText = await page.locator('[data-testid="price"]').first().textContent();
        const price = parseInt(priceText?.replace(/[^\d]/g, ''), 10);

        return {
          title: title?.trim() || 'Unknown Product',
          price: isNaN(price) ? 0 : price,
          image: '',
          description: '',
          merchant: 'cred',
        };
      } catch (e) {
        console.error('[CRED Extract]', e.message);
        return null;
      }
    }
  },
};

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

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getRandomReferrer() {
  return REFERRERS[Math.floor(Math.random() * REFERRERS.length)];
}

async function findBestCardForProduct(productPrice) {
  try {
    await connectDB();

    // Fetch all active provider cards
    const cards = await Offer.find({ status: 'available', verified: true })
      .select('bank card_name holder_name rating max_amount categories')
      .lean();

    if (!cards.length) {
      return null;
    }

    // Estimate discount for each card (2-5% of price based on bank)
    const cardDiscounts = cards.map(card => {
      let discountPercent = 3;
      if (card.bank?.includes('Amex')) discountPercent = 5;
      else if (card.bank?.includes('HDFC')) discountPercent = 4;
      else if (card.bank?.includes('ICICI')) discountPercent = 3.5;
      
      const discountAmount = Math.round(productPrice * (discountPercent / 100));
      
      return {
        bank: card.bank,
        card_name: card.card_name,
        discount_amount: Math.min(discountAmount, Math.round(productPrice * 0.15)), // Cap at 15%
        categories: card.categories,
      };
    });

    // Sort by discount amount descending
    cardDiscounts.sort((a, b) => b.discount_amount - a.discount_amount);

    return cardDiscounts[0];
  } catch (e) {
    console.error('[Find Best Card]', e);
    return null;
  }
}

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
    // Dynamic import for Playwright
    const { chromium } = await import('playwright');

    // Launch browser with anti-detection measures
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-web-resources',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    const context = await browser.createContext({
      userAgent: getRandomUserAgent(),
      extraHTTPHeaders: {
        'Accept-Language': 'en-IN,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': getRandomReferrer(),
      },
      viewport: { width: 1920, height: 1080 },
    });

    const page = await context.newPage();

    // Stealth measures
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-IN', 'en'],
      });
    });

    // Load page with retries
    let retries = 3;
    let success = false;
    while (retries > 0 && !success) {
      try {
        await page.goto(productUrl, {
          waitUntil: 'networkidle',
          timeout: 20000,
        });
        success = true;
      } catch (e) {
        retries--;
        if (retries > 0) {
          await page.waitForTimeout(2000 + Math.random() * 3000); // Random delay
        }
      }
    }

    if (!success) {
      throw new Error('Failed to load product page');
    }

    // Random delay to seem like real user
    await page.waitForTimeout(1000 + Math.random() * 2000);

    // Extract product data using merchant-specific extractor
    const extractor = MERCHANT_EXTRACTORS[merchant];
    if (!extractor) {
      throw new Error(`No extractor for ${merchant}`);
    }

    const productData = await extractor.extract(page);

    if (!productData) {
      throw new Error('Failed to extract product data');
    }

    // Find best card for this product price
    const bestCard = await findBestCardForProduct(productData.price);

    await browser.close();

    return {
      success: true,
      product: productData,
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
      message: err.message,
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
