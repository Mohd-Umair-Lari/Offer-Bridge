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
  }
});

export default router;
