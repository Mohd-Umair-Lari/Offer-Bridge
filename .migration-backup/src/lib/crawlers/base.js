import { cleanExtractedTitle } from './utils';

/**
 * BaseCrawler - Abstract Base Class for E-Commerce Platform Scrapers
 * Standardizes metadata extraction and provider extensions.
 */
export class BaseCrawler {
  constructor(name, domainPatterns = []) {
    this.name = name;
    this.domainPatterns = domainPatterns;
  }

  /**
   * Determines if this crawler handles the given URL.
   * @param {string} url 
   * @returns {boolean}
   */
  canHandle(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.domainPatterns.some(pattern => hostname.includes(pattern));
    } catch {
      return false;
    }
  }

  /**
   * Scrapes product details from the URL. Must be implemented by subclasses.
   * @param {string} url 
   * @returns {Promise<Object>}
   */
  async scrape(url) {
    throw new Error(`scrape() method not implemented for ${this.name}`);
  }

  /**
   * Standardizes scraped product object into a clean production schema.
   */
  normalizeProductData(raw) {
    const finalTitle = cleanExtractedTitle(raw.title, raw.url);

    return {
      platform: this.name.toLowerCase(),
      url: raw.url || '',
      title: finalTitle,
      price: typeof raw.price === 'number' ? raw.price : 0,
      originalPrice: typeof raw.originalPrice === 'number' && raw.originalPrice > 0 ? raw.originalPrice : (raw.price || 0),
      currency: raw.currency || 'INR',
      image: raw.image || '',
      rating: typeof raw.rating === 'number' ? raw.rating : 0,
      reviewCount: typeof raw.reviewCount === 'number' ? raw.reviewCount : 0,
      availability: raw.availability || (raw.price > 0 ? 'in_stock' : 'out_of_stock'),
      sellerName: raw.sellerName || '',
      asin: raw.asin || null,
      rawOffers: Array.isArray(raw.rawOffers) ? raw.rawOffers : [],
      bankOffers: Array.isArray(raw.bankOffers) ? raw.bankOffers : [],
      lowestEver: raw.lowestEver || 0,
    };
  }
}
