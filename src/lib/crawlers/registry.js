import { AmazonCrawler } from './amazon';
import { FlipkartCrawler } from './flipkart';
import { MyntraCrawler } from './myntra';

/**
 * CrawlerRegistry - Central Registry for E-Commerce Platform Crawlers.
 * Easily extensible: add new platform crawlers without modifying core scraping logic.
 */
class CrawlerRegistry {
  constructor() {
    this.crawlers = [];
    this.registerDefaults();
  }

  registerDefaults() {
    this.register(new AmazonCrawler());
    this.register(new FlipkartCrawler());
    this.register(new MyntraCrawler());
  }

  /**
   * Register a new crawler instance.
   * @param {BaseCrawler} crawler 
   */
  register(crawler) {
    if (!crawler || typeof crawler.canHandle !== 'function') {
      throw new Error('Invalid crawler instance registered.');
    }
    // Prevent duplicate registrations
    const existingIdx = this.crawlers.findIndex(c => c.name === crawler.name);
    if (existingIdx !== -1) {
      this.crawlers[existingIdx] = crawler;
    } else {
      this.crawlers.push(crawler);
    }
  }

  /**
   * Find a matching crawler for the given URL.
   * @param {string} url 
   * @returns {BaseCrawler|null}
   */
  findCrawler(url) {
    if (!url) return null;
    return this.crawlers.find(crawler => crawler.canHandle(url)) || null;
  }

  /**
   * Scrapes product URL using the appropriate registered platform crawler.
   * @param {string} url 
   * @returns {Promise<Object>}
   */
  async scrape(url) {
    const crawler = this.findCrawler(url);
    if (!crawler) {
      throw new Error('Unsupported merchant URL. Currently supported: Amazon India, Flipkart, and Myntra.');
    }
    const rawData = await crawler.scrape(url);
    return crawler.normalizeProductData(rawData);
  }
}

export const registry = new CrawlerRegistry();
