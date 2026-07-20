// NOTE: playwright is imported dynamically at runtime (not statically) so that
// Next.js webpack never attempts to bundle the native Chromium binary at build time.
// serverExternalPackages in next.config.mjs also enforces this for the build step.

// User Agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Normalizes price text to integer
 */
function parsePrice(priceText) {
  if (!priceText) return 0;
  // Remove currency symbols, commas, and trailing decimals
  const clean = priceText.replace(/[₹$,]/g, '').split('.')[0].trim();
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Main Scraper Engine using Playwright
 */
export async function scrapeProduct(url) {
  const domain = url.toLowerCase();
  let type = '';
  if (domain.includes('amazon.in') || domain.includes('amazon.com')) {
    type = 'amazon';
  } else if (domain.includes('flipkart.com')) {
    type = 'flipkart';
  } else if (domain.includes('myntra.com')) {
    type = 'myntra';
  } else {
    throw new Error('Unsupported domain. Only Amazon, Flipkart, and Myntra are supported.');
  }

  let browser = null;
  try {
    // Dynamic import defers Playwright binary resolution to request-time, not build-time.
    let chromium;
    try {
      ({ chromium } = await import('playwright'));
    } catch (importErr) {
      throw new Error(
        'Playwright browser not found on this server. ' +
        'Run: npx playwright install chromium --with-deps  (once, on your production server). ' +
        'Original error: ' + importErr.message
      );
    }

    // Launch headless chromium with anti-detection args
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });

    const context = await browser.newContext({
      userAgent: getRandomUserAgent(),
      viewport: { width: 1280, height: 800 },
      locale: 'en-IN',
      extraHTTPHeaders: {
        'Accept-Language': 'en-IN,en;q=0.9,en-US;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
    });

    const page = await context.newPage();

    // Bypass common automated browser tests
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    console.log(`[Scraper] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Handle bot checking block detection page
    const pageContent = await page.content();
    if (pageContent.includes('captcha') || pageContent.includes('Robot Check') || pageContent.includes('To discuss automated access')) {
      throw new Error('Blocked by bot detection / CAPTCHA. Please try again later.');
    }

    if (type === 'amazon') {
      return await scrapeAmazon(page, url);
    } else if (type === 'flipkart') {
      return await scrapeFlipkart(page, url);
    } else {
      return await scrapeMyntra(page, url);
    }
  } catch (error) {
    console.error(`[Scraper Error] Failed to scrape ${url}:`, error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrapes Amazon Product Details
 */
async function scrapeAmazon(page, url) {
  // Wait for the main container or price element
  try {
    await page.waitForSelector('#productTitle', { timeout: 10000 });
  } catch {
    throw new Error('Amazon page structure did not load. Bot protection or invalid product link.');
  }

  // Extract Title
  const title = await page.locator('#productTitle').innerText().then(t => t.trim()).catch(() => '');

  // Extract Price
  let priceText = '';
  const priceSelectors = [
    '.a-price-whole',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-price .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-price-whole',
  ];

  for (const selector of priceSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0 && await el.isVisible()) {
        priceText = await el.innerText();
        if (priceText) break;
      }
    } catch {}
  }

  const price = parsePrice(priceText);
  if (price === 0) {
    // Check if product is out of stock
    const outOfStockEl = page.locator('#outOfStock, #availability span:has-text("Currently unavailable")').first();
    if (await outOfStockEl.count() > 0 && await outOfStockEl.isVisible()) {
      throw new Error('Product is currently out of stock on Amazon.');
    }
    throw new Error('Failed to extract price. The product might be unavailable.');
  }

  // Extract Main Image
  let image = '';
  const imageSelectors = [
    '#landingImage',
    '#imgBlkFront',
    '#main-image-container img',
  ];
  for (const selector of imageSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        image = await el.getAttribute('src');
        if (image) break;
      }
    } catch {}
  }

  // Extract Credit Card / Bank Offers
  const rawOffers = [];
  
  // Try expanding Amazon offer modals if any "See more" exists in offers section
  try {
    const seeMoreButton = page.locator('#sopp-see-more-link, #soppShowMoreOffersLink, .sopp-see-more').first();
    if (await seeMoreButton.count() > 0 && await seeMoreButton.isVisible()) {
      await seeMoreButton.click();
      await page.waitForTimeout(500);
    }
  } catch {}

  const offerSelectors = [
    'div.offers-items-content',
    '#sopp-card-offers',
    '#gbox-card-offers',
    '.sopp-offer-title',
    'div[id*="sopp"]',
    'div.sopp-offer-detail',
    '.sopp-offer-text',
    'div[data-card-identifier*="card"]'
  ];

  for (const selector of offerSelectors) {
    try {
      const locators = page.locator(selector);
      const count = await locators.count();
      for (let i = 0; i < count; i++) {
        const text = await locators.nth(i).innerText().then(t => t.trim());
        if (text && !rawOffers.includes(text) && text.length > 5) {
          // Amazon sometimes groups offer terms and title together, sanitize newlines
          const sanitizedText = text.replace(/\n+/g, ' | ');
          if (!rawOffers.includes(sanitizedText)) {
            rawOffers.push(sanitizedText);
          }
        }
      }
    } catch {}
  }

  // Fallback: If no structured offer elements were found, scan text near "Bank Offer"
  if (rawOffers.length === 0) {
    try {
      const bodyText = await page.innerText('body');
      const matches = bodyText.match(/Bank Offer[^\n.]+/gi) || [];
      matches.forEach(m => {
        const trimStr = m.trim();
        if (trimStr && !rawOffers.includes(trimStr)) {
          rawOffers.push(trimStr);
        }
      });
    } catch {}
  }

  return {
    success: true,
    domain: 'amazon',
    title,
    price,
    image,
    rawOffers: rawOffers.slice(0, 15), // Cap offers to prevent LLM prompt bloating
    url,
  };
}

/**
 * Scrapes Flipkart Product Details
 */
async function scrapeFlipkart(page, url) {
  // Wait for the title or price element
  try {
    await page.waitForSelector('h1', { timeout: 10000 });
  } catch {
    throw new Error('Flipkart page structure did not load. Bot protection or invalid product link.');
  }

  // Extract Title
  let title = '';
  const titleSelectors = [
    'span.B_NuCI',
    '.VU-ZEg',
    'h1 span',
    'h1',
  ];
  for (const selector of titleSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        title = await el.innerText().then(t => t.trim());
        if (title) break;
      }
    } catch {}
  }

  // Extract Price
  let priceText = '';
  const priceSelectors = [
    'div._30jeq3',
    '.Nx9b7S',
    '._16G7qJ',
    '.y3YLL3',
    'div[class*="_30jeq3"]',
    'div[class*="Nx9b7S"]',
  ];

  for (const selector of priceSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0 && await el.isVisible()) {
        priceText = await el.innerText();
        if (priceText) break;
      }
    } catch {}
  }

  const price = parsePrice(priceText);
  if (price === 0) {
    // Check if out of stock
    const outOfStockEl = page.locator('div._19JSg7, div:has-text("Sold Out"), div:has-text("This item is currently out of stock")').first();
    if (await outOfStockEl.count() > 0 && await outOfStockEl.isVisible()) {
      throw new Error('Product is currently out of stock on Flipkart.');
    }
    throw new Error('Failed to extract price. The product might be unavailable.');
  }

  // Extract Main Image
  let image = '';
  const imageSelectors = [
    'img.DByoEF',
    'img._396cs4',
    '.CXW8mj img',
    'img[src*="flipkart.com/image"]',
  ];
  for (const selector of imageSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        image = await el.getAttribute('src');
        if (image) break;
      }
    } catch {}
  }

  // Extract Bank Offers (with click behavior for "View more offers")
  const rawOffers = [];

  try {
    // Search for "View more offers" or "View all offers" button
    const viewMoreButton = page.locator('span:has-text("View more offers"), button:has-text("View more offers"), span:has-text("View all offers"), button:has-text("View all offers"), div:has-text("View more offers")').first();
    if (await viewMoreButton.count() > 0 && await viewMoreButton.isVisible()) {
      console.log('[Scraper] Clicking View More Offers on Flipkart');
      await viewMoreButton.click({ force: true });
      await page.waitForTimeout(600); // wait for content animation
    }
  } catch (err) {
    console.log('[Scraper] View More Offers click failed or button not present:', err.message);
  }

  const offerSelectors = [
    'li.yN\\+e2m',
    'li[class*="yN"]',
    'span:has-text("Bank Offer")',
    'div[class*="bank-offer"]',
  ];

  for (const selector of offerSelectors) {
    try {
      const locators = page.locator(selector);
      const count = await locators.count();
      for (let i = 0; i < count; i++) {
        const text = await locators.nth(i).innerText().then(t => t.trim());
        if (text && text.length > 5) {
          // Remove any leading T&C or small UI characters
          const cleanText = text.replace(/^[T&C\s•*]+/i, '').trim();
          if (cleanText && !rawOffers.includes(cleanText)) {
            rawOffers.push(cleanText);
          }
        }
      }
    } catch {}
  }

  // Fallback scan if list items are empty
  if (rawOffers.length === 0) {
    try {
      const bodyText = await page.innerText('body');
      const matches = bodyText.match(/Bank Offer[^\n]+/gi) || [];
      matches.forEach(m => {
        const trimStr = m.trim();
        if (trimStr && !rawOffers.includes(trimStr)) {
          rawOffers.push(trimStr);
        }
      });
    } catch {}
  }

  return {
    success: true,
    domain: 'flipkart',
    title,
    price,
    image,
    rawOffers: rawOffers.slice(0, 15), // Cap offers to prevent LLM prompt bloating
    url,
  };
}

/**
 * Scrapes Myntra Product Details
 */
async function scrapeMyntra(page, url) {
  // Wait for the title or price element
  try {
    await page.waitForSelector('.pdp-title, .pdp-name', { timeout: 10000 });
  } catch {
    throw new Error('Myntra page structure did not load. Bot protection or invalid product link.');
  }

  // Extract Title
  let brand = await page.locator('.pdp-title').first().innerText().then(t => t.trim()).catch(() => '');
  let name = await page.locator('.pdp-name').first().innerText().then(t => t.trim()).catch(() => '');
  let title = brand && name ? `${brand} - ${name}` : (brand || name || '');

  // Extract Price
  let priceText = '';
  const priceSelectors = [
    '.pdp-price',
    '.pdp-price strong',
    '.pdp-discount',
  ];

  for (const selector of priceSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.count() > 0 && await el.isVisible()) {
        priceText = await el.innerText();
        if (priceText) break;
      }
    } catch {}
  }

  // Extract first numeric value from priceText (like "Rs. 899 Rs. 1499(40% OFF)")
  let price = 0;
  if (priceText) {
    const cleanText = priceText.replace(/[,\s]/g, '');
    const match = cleanText.match(/\d+/);
    if (match) {
      price = parseInt(match[0], 10) || 0;
    }
  }

  if (price === 0) {
    // Check if out of stock
    const outOfStockEl = page.locator('.pdp-outOfStock, div:has-text("Out of Stock"), span:has-text("Out of Stock")').first();
    if (await outOfStockEl.count() > 0 && await outOfStockEl.isVisible()) {
      throw new Error('Product is currently out of stock on Myntra.');
    }
    throw new Error('Failed to extract price. The product might be unavailable.');
  }

  // Extract Main Image
  let image = '';
  // Try OpenGraph meta image tag first since it's the high res image URL
  try {
    image = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => '');
  } catch {}

  if (!image) {
    const imageSelectors = [
      'img.image-grid-image',
      '.image-grid-col img',
    ];
    for (const selector of imageSelectors) {
      try {
        const el = page.locator(selector).first();
        if (await el.count() > 0) {
          image = await el.getAttribute('src');
          if (image) break;
        }
      } catch {}
    }
  }

  // Extract Bank Offers
  const rawOffers = [];
  const offerSelectors = [
    '.pdp-offers li',
    '.pdp-offers-container li',
    '.offer-item',
  ];

  for (const selector of offerSelectors) {
    try {
      const locators = page.locator(selector);
      const count = await locators.count();
      for (let i = 0; i < count; i++) {
        const text = await locators.nth(i).innerText().then(t => t.trim());
        if (text && text.length > 5) {
          const cleanText = text.replace(/^[T&C\s•*]+/i, '').trim();
          if (cleanText && !rawOffers.includes(cleanText)) {
            rawOffers.push(cleanText);
          }
        }
      }
    } catch {}
  }

  // Fallback scan if list items are empty
  if (rawOffers.length === 0) {
    try {
      const bodyText = await page.innerText('body');
      const matches = bodyText.match(/(?:Bank Offer|Instant Discount)[^\n]+/gi) || [];
      matches.forEach(m => {
        const trimStr = m.trim();
        if (trimStr && !rawOffers.includes(trimStr)) {
          rawOffers.push(trimStr);
        }
      });
    } catch {}
  }

  return {
    success: true,
    domain: 'myntra',
    title,
    price,
    image,
    rawOffers: rawOffers.slice(0, 15),
    url,
  };
}
