import {
  fetchPage,
  extractBankOffers,
  parsePrice,
  decodeHTML,
  deepFind,
  isPlainText,
} from './utils';

async function fetchMyntraInternalApi(styleId) {
  if (!styleId) return null;
  const endpoints = [
    `https://www.myntra.com/gateway/v2/product/${styleId}`,
    `https://www.myntra.com/gateway/v1/product/${styleId}`,
  ];
  for (const apiUrl of endpoints) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'x-myntra-app': 'myntra',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const json = await res.json();
        const style = json?.style || json;
        const title = style?.name || style?.title || '';
        let price = 0;
        const p1 = style?.price?.discounted || style?.price?.mrp || 0;
        if (p1 > 0) price = p1;
        if (price === 0) {
          const v = deepFind(json, ['discounted', 'mrp', 'price', 'sellingPrice']);
          if (v) price = parsePrice(String(v));
        }
        let image = '';
        if (style?.media?.albums?.[0]?.images?.[0]?.src) {
          image = style.media.albums[0].images[0].src;
        }
        if (!image) {
          image = deepFind(json, ['imageURL', 'src', 'secureUrl']);
        }
        if (price > 50 && title.length > 3) {
          return { title: decodeHTML(title), price, image, rawOffers: [], domain: 'myntra', asin: null, lowestEver: 0 };
        }
      }
    } catch (e) {}
  }
  return null;
}

export async function scrapeMyntra(productUrl) {
  const styleId = productUrl.match(/\/(\d+)\/buy/i)?.[1] || productUrl.match(/[^\d](\d{6,10})(?:[^\d]|$)/)?.[1];
  const apiRes = await fetchMyntraInternalApi(styleId);
  if (apiRes) return apiRes;

  const html = await fetchPage(productUrl, 'myntra');
  if (isPlainText(html)) {
    return parseFromTextMyntra(html);
  }
  return parseMyntra(html);
}

function parseMyntra(html) {
  let title = '';
  const titleMatch = html.match(/<h1[^>]*class=["'][^"']*pdp-title["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                     html.match(/<h1[^>]*class=["'][^"']*pdp-name["'][^>]*>([\s\S]*?)<\/h1>/i);
  if (titleMatch) title = decodeHTML(titleMatch[1].replace(/<[^>]+>/g, ''));

  if (!title) {
    const metaTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (metaTitle) {
      title = decodeHTML(metaTitle[1].split('|')[0].replace('Buy', '').trim());
    }
  }

  let price = 0;
  const priceMatch = html.match(/class=["'][^"']*pdp-price["'][^>]*>(?:<strong>)?(?:Rs\.?)?\s*([\d,]+)/i);
  if (priceMatch) {
    const p = parsePrice(priceMatch[1]);
    if (p > 50) price = p;
  }

  if (!price) {
    const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatch) {
      for (const sm of scriptMatch) {
        if (sm.includes('pdpData')) {
          const priceRe = /"price"\s*:\s*(\d+)/i;
          const discountedRe = /"discounted"\s*:\s*(\d+)/i;
          const m1 = sm.match(discountedRe);
          if (m1) {
             const p = parsePrice(m1[1]);
             if (p > 50) { price = p; break; }
          }
          const m2 = sm.match(priceRe);
          if (m2) {
             const p = parsePrice(m2[1]);
             if (p > 50) { price = p; break; }
          }
        }
      }
    }
  }

  if (!title && html.includes('pdpData')) {
    const nameMatch = html.match(/"name"\s*:\s*"([^"]+)"/i);
    if (nameMatch) title = nameMatch[1];
  }

  if (price === 0 && html.toLowerCase().includes('out of stock')) {
    throw new Error('Product is currently out of stock on Myntra.');
  }

  let image = '';
  const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (imgMatch) image = imgMatch[1];

  const stripped = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                       .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                       .replace(/<[^>]+>/g, ' ')
                       .replace(/\s+/g, ' ');
  const rawOffers = extractBankOffers(stripped);

  return { title, price, image, rawOffers, domain: 'myntra', asin: null, lowestEver: 0 };
}

function parseFromTextMyntra(text) {
  let title = '';
  const titleMeta = text.match(/^Title:\s+(.+)$/im);
  if (titleMeta?.[1]?.trim().length > 5) {
    title = titleMeta[1].trim();
  } else {
    for (const line of text.split('\n').slice(0, 30)) {
      const clean = line.replace(/^[#*\->|\s]+/, '').trim();
      if (clean.length > 15 && clean.length < 200 && !/^\d/.test(clean)) {
        title = clean;
        break;
      }
    }
  }

  let price = 0;
  const findLabelledPrice = (pattern) => {
    const m = text.match(pattern);
    if (!m) return 0;
    const p = parsePrice(m[1]);
    return p >= 50 && p <= 9_999_999 ? p : 0;
  };
  price = findLabelledPrice(/(?:selling\s+price|discounted\s+price|final\s+price|current\s+price)[^₹\n]{0,40}₹\s*([\d,]+)/i) ||
          findLabelledPrice(/(?:\bprice\b|\bMRP\b|\bcost\b)[^₹\n]{0,20}₹\s*([\d,]+)/i) || 0;
  
  if (!price) price = findLabelledPrice(/\*\*₹\s*([\d,]+)\*\*/);
  if (!price) {
    const priceRe = /₹\s*([\d,]+)/g;
    let m;
    const prices = [];
    while ((m = priceRe.exec(text.slice(0, 2000))) !== null) {
      const p = parsePrice(m[1]);
      if (p > 50) prices.push(p);
    }
    if (prices.length > 0) price = prices[0];
  }

  return { title, price, image: '', rawOffers: extractBankOffers(text), domain: 'myntra', asin: null, lowestEver: 0 };
}
