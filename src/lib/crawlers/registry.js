// @ts-nocheck
import { AmazonCrawler } from './amazon.js';
import { FlipkartCrawler } from './flipkart.js';
import { MyntraCrawler } from './myntra.js';

class CrawlerRegistry {
  constructor() {
    this.crawlers = [];
    this.register(new AmazonCrawler());
    this.register(new FlipkartCrawler());
    this.register(new MyntraCrawler());
  }

  register(crawler) {
    if (!crawler || typeof crawler.canHandle !== 'function') {
      throw new Error('Invalid crawler instance registered.');
    }
    const existingIdx = this.crawlers.findIndex(c => c.name === crawler.name);
    if (existingIdx !== -1) {
      this.crawlers[existingIdx] = crawler;
    } else {
      this.crawlers.push(crawler);
    }
  }

  findCrawler(url) {
    if (!url) return null;
    return this.crawlers.find(crawler => crawler.canHandle(url)) || null;
  }

  async scrape(url) {
    const crawler = this.findCrawler(url);
    if (!crawler) {
      throw new Error('Unsupported merchant URL. Currently supported: Amazon India, Flipkart, and Myntra.');
    }
    const rawData = await crawler.scrape(url);
    return crawler.normalizeProductData ? crawler.normalizeProductData(rawData) : rawData;
  }
}

export const registry = new CrawlerRegistry();
