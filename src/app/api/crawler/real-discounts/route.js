import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Offer } from '@/lib/models';

/**
 * REAL CARD DISCOUNT CRAWLER
 * 
 * Instead of calculating percentages, this crawler:
 * 1. Visits the actual product page (Amazon, Flipkart, etc)
 * 2. Scrapes REAL card discount offers shown on page
 * 3. Returns actual rupee amounts each card offers
 * 4. Finds the card with MAXIMUM discount amount
 * 
 * Endpoint: POST /api/crawler/real-discounts
 * Body: { productUrl: "https://amazon.in/laptop...", productPrice: 50000 }
 * 
 * Returns:
 * {
 *   merchant: 'amazon',
 *   product_price: 50000,
 *   best_card: { card_id, card_name, bank, actual_discount_amount: 5000 },
 *   all_offers: [{ bank, discount_amount }, ...],
 *   timestamp: ISO
 * }
 */

// Merchant-specific scraping rules
const MERCHANT_SCRAPERS = {
  'amazon': {
    name: 'Amazon',
    selectors: {
      // On Amazon product pages, card offers are shown in "No Cost EMI" section
      // Example text: "Upto ₹5,000 off with HDFC Bank Credit Card"
      offers: '[data-a-expander-name*="card"], .a-declarative:has-text("card")',
      discountText: /(?:₹|Rs\.?\s*)([0-9,]+)\s*(?:off|cashback)/i,
      bankName: /(HDFC|ICICI|Axis|SBI|Amex|Kotak|IDFC|RBL)/i,
    },
    parseDiscount: async (page) => {
      // Scrape Amazon-specific card offers
      const offers = await page.locator('[data-a-expander-name*="EMI"]').all();
      const discounts = [];
      
      for (const offer of offers) {
        const text = await offer.textContent();
        const bankMatch = text.match(/(HDFC|ICICI|Axis|SBI|Amex|Kotak|IDFC|RBL)/i);
        const amountMatch = text.match(/(?:₹|Rs\.?\s*)([0-9,]+)\s*(?:off|cashback)/i);
        
        if (bankMatch && amountMatch) {
          const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
          discounts.push({
            bank: bankMatch[1],
            discount_amount: amount,
            offer_text: text.substring(0, 100),
          });
        }
      }
      
      return discounts;
    }
  },
  
  'flipkart': {
    name: 'Flipkart',
    selectors: {
      // On Flipkart, card offers shown in "Bank Offers" section
      // Example: "Upto ₹3,000 off with ICICI Bank Credit Card"
      offers: '.sxIqHo, ._2kLUVf',
      discountText: /(?:₹|Rs\.?\s*)([0-9,]+)\s*(?:off|cashback)/i,
      bankName: /(HDFC|ICICI|Axis|SBI|Amex|Kotak|IDFC|RBL)/i,
    },
    parseDiscount: async (page) => {
      const offers = await page.locator('div:has-text("Bank Offers")').locator('..').all();
      const discounts = [];
      
      for (const offer of offers) {
        const text = await offer.textContent();
        const bankMatch = text.match(/(HDFC|ICICI|Axis|SBI|Amex|Kotak|IDFC|RBL)/i);
        const amountMatch = text.match(/(?:₹|Rs\.?\s*)([0-9,]+)\s*(?:off|cashback)/i);
        
        if (bankMatch && amountMatch) {
          const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
          discounts.push({
            bank: bankMatch[1],
            discount_amount: amount,
            offer_text: text.substring(0, 100),
          });
        }
      }
      
      return discounts;
    }
  },

  'myntra': {
    name: 'Myntra',
    parseDiscount: async (page) => {
      // Myntra shows card offers in checkout
      const offers = await page.locator('text=/card offers/i').locator('..').all();
      const discounts = [];
      
      for (const offer of offers) {
        const text = await offer.textContent();
        const bankMatch = text.match(/(HDFC|ICICI|Axis|SBI|Amex|Kotak|IDFC|RBL)/i);
        const amountMatch = text.match(/(?:₹|Rs\.?\s*)([0-9,]+)\s*(?:off|cashback)/i);
        
        if (bankMatch && amountMatch) {
          const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
          discounts.push({
            bank: bankMatch[1],
            discount_amount: amount,
            offer_text: text.substring(0, 100),
          });
        }
      }
      
      return discounts;
    }
  },

  'cred': {
    name: 'CRED',
    parseDiscount: async (page) => {
      // CRED shows card discounts in their offers section
      const offers = await page.locator('[class*="offer"]').all();
      const discounts = [];
      
      for (const offer of offers) {
        const text = await offer.textContent();
        const amountMatch = text.match(/(?:₹|Rs\.?\s*)([0-9,]+)\s*(?:off|cashback)/i);
        
        if (amountMatch) {
          const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
          discounts.push({
            bank: 'CRED',
            discount_amount: amount,
            offer_text: text.substring(0, 100),
          });
        }
      }
      
      return discounts;
    }
  },
};

/**
 * Extract merchant from URL
 */
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
 * Fallback discount generator (if scraping fails)
 * Returns estimated discounts based on stored provider card info
 */
async function fallbackDiscounts(productPrice) {
  try {
    await connectDB();
    
    // Fetch provider cards from database
    const cards = await Offer.find({ status: 'available', verified: true })
      .select('card_name bank holder_name rating max_amount')
      .lean();

    const fallbacks = [];
    
    for (const card of cards) {
      // Estimate discount as 2-5% of product price based on bank
      let discountPercent = 3;
      if (card.bank?.includes('Amex')) discountPercent = 5;
      else if (card.bank?.includes('HDFC')) discountPercent = 4;
      else if (card.bank?.includes('ICICI')) discountPercent = 3.5;
      
      const discountAmount = Math.round(productPrice * (discountPercent / 100));
      
      fallbacks.push({
        bank: card.bank,
        card_name: card.card_name,
        discount_amount: Math.min(discountAmount, 10000), // Cap at ₹10k
        source: 'estimated',
      });
    }
    
    return fallbacks;
  } catch (e) {
    console.error('[Fallback]', e);
    return [];
  }
}

/**
 * Main scraper function
 */
async function scrapeRealDiscounts(productUrl, productPrice) {
  try {
    const merchant = extractMerchant(productUrl);
    
    if (!merchant || merchant === 'generic') {
      return {
        success: false,
        message: 'Unsupported merchant',
        merchant,
      };
    }

    // Try web scraping first
    try {
      // Dynamic import for Playwright (browser automation)
      const { chromium } = await import('playwright');
      
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      
      // Load product page
      await page.goto(productUrl, { waitUntil: 'networkidle', timeout: 15000 });
      
      // Get merchant-specific scraper
      const scraperConfig = MERCHANT_SCRAPERS[merchant];
      if (!scraperConfig?.parseDiscount) {
        throw new Error('No scraper for merchant');
      }
      
      // Scrape discounts
      const discounts = await scraperConfig.parseDiscount(page);
      await browser.close();
      
      if (discounts.length === 0) {
        throw new Error('No discounts found on page');
      }
      
      // Sort by discount amount descending
      discounts.sort((a, b) => b.discount_amount - a.discount_amount);
      
      return {
        success: true,
        merchant,
        product_price: productPrice,
        best_card: {
          bank: discounts[0].bank,
          discount_amount: discounts[0].discount_amount,
          source: 'scraped',
        },
        all_offers: discounts.slice(0, 5),
        timestamp: new Date().toISOString(),
      };
    } catch (scrapeErr) {
      console.warn('[Scraper Failed]', scrapeErr.message, '-> Using fallback');
      
      // Fallback: use stored provider cards
      const fallbacks = await fallbackDiscounts(productPrice);
      
      if (fallbacks.length === 0) {
        return {
          success: false,
          message: 'No cards available',
        };
      }
      
      fallbacks.sort((a, b) => b.discount_amount - a.discount_amount);
      
      return {
        success: true,
        merchant,
        product_price: productPrice,
        best_card: {
          bank: fallbacks[0].bank,
          discount_amount: fallbacks[0].discount_amount,
          source: 'estimated_fallback',
        },
        all_offers: fallbacks.slice(0, 5),
        timestamp: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('[Real Discounts Crawler]', err);
    return {
      success: false,
      message: 'Crawler failed',
      error: err.message,
    };
  }
}

/**
 * POST: Get real card discounts for a product
 */
export async function POST(request) {
  try {
    const { productUrl, productPrice } = await request.json();

    if (!productUrl || !productPrice) {
      return NextResponse.json(
        { error: 'productUrl and productPrice required' },
        { status: 400 }
      );
    }

    const result = await scrapeRealDiscounts(productUrl, productPrice);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (err) {
    console.error('[POST]', err);
    return NextResponse.json(
      { error: 'Server error', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Query string version
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productUrl = searchParams.get('url');
    const productPrice = parseInt(searchParams.get('price') || '0');

    if (!productUrl || !productPrice) {
      return NextResponse.json(
        { error: 'url and price query params required' },
        { status: 400 }
      );
    }

    const result = await scrapeRealDiscounts(productUrl, productPrice);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (err) {
    console.error('[GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
