import {
  fetchPage,
  extractBankOffers,
  parsePrice,
  decodeHTML,
  isPlainText,
} from './utils';

async function fetchKeepa(asin) {
  try {
    const keepaUrl = `https://api.keepa.com/product?key=${process.env.KEEPA_API_KEY}&domain=4&asin=${asin}`;
    const res = await fetch(keepaUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.products?.[0]?.csv) {
        const csv = data.products[0].csv[1];
        if (Array.isArray(csv) && csv.length > 0) {
          let lowest = Infinity;
          for (let i = 1; i < csv.length; i += 2) {
            const p = csv[i];
            if (p > 0 && p < lowest) lowest = p;
          }
          if (lowest !== Infinity && lowest < 2000000) {
            return Math.floor(lowest / 100);
          }
        }
      }
    }
  } catch (e) {}
  return 0;
}

export async function scrapeAmazon(productUrl) {
  const asin = productUrl.match(/\/dp\/([A-Z0-9]{10})/i)?.[1]
            || productUrl.match(/\/gp\/product\/([A-Z0-9]{10})/i)?.[1];

  let lowestEver = 0;
  if (asin && process.env.KEEPA_API_KEY) {
    lowestEver = await fetchKeepa(asin);
  }

  const html = await fetchPage(productUrl, 'amazon');

  if (isPlainText(html)) {
    return parseFromText(html, asin);
  }

  const titleMatch = html.match(/<span[^>]+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i);
  const title = titleMatch ? decodeHTML(titleMatch[1].replace(/<[^>]+>/g, '')) : '';

  let price = 0;
  const priceSelectors = [
    /<span[^>]+class=["']a-price-whole["'][^>]*>([\s\S]*?)<\/span>/i,
    /<span[^>]+id=["']priceblock_ourprice["'][^>]*>([\s\S]*?)<\/span>/i,
    /<span[^>]+id=["']priceblock_dealprice["'][^>]*>([\s\S]*?)<\/span>/i,
    /<span[^>]+class=["']a-size-medium a-color-price["'][^>]*>([\s\S]*?)<\/span>/i,
  ];

  for (const sel of priceSelectors) {
    const m = html.match(sel);
    if (m) {
      const p = parsePrice(m[1]);
      if (p > 50) { price = p; break; }
    }
  }

  if (!price && html.includes('a-color-price')) {
    const backupMatch = html.match(/₹\s*([\d,]+(?:\.\d+)?)/);
    if (backupMatch) {
      const p = parsePrice(backupMatch[1]);
      if (p > 50) price = p;
    }
  }

  const stripped = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                       .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/\s+/g, ' ');

  const rawOffers = extractBankOffers(stripped);

  let image = '';
  const imgMatch = html.match(/<img[^>]+id=["']landingImage["'][^>]+data-old-hires=["']([^"']+)["']/i) ||
                   html.match(/<img[^>]+id=["']landingImage["'][^>]+src=["']([^"']+)["']/i);
  if (imgMatch) image = imgMatch[1];

  if (price === 0 && html.toLowerCase().includes('currently unavailable')) {
    throw new Error('Product is currently out of stock on Amazon.');
  }

  return { title, price, image, rawOffers, domain: 'amazon', asin, lowestEver };
}

function parseFromText(text, asin) {
  let title = '';
  const lines = text.split('\n');
  for (const line of lines.slice(0, 30)) {
    const clean = line.replace(/^[#*\->|\s]+/, '').trim();
    if (clean.length > 15 && clean.length < 200 && !/^\d/.test(clean)) {
      title = clean;
      break;
    }
  }

  let price = 0;
  const priceRe = /₹\s*([\d,]+)/g;
  let m;
  const prices = [];
  while ((m = priceRe.exec(text.slice(0, 2000))) !== null) {
    const p = parsePrice(m[1]);
    if (p > 50) prices.push(p);
  }
  if (prices.length > 0) {
    price = prices[0];
  }

  const rawOffers = extractBankOffers(text);
  return { title, price, image: '', rawOffers, domain: 'amazon', asin, lowestEver: 0 };
}
