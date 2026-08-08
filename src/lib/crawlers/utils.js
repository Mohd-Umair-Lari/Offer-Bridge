// @ts-nocheck
const env = (k) => process.env[k] || '';

export function sanitizeUrl(urlStr = '') {
  if (!urlStr) return '';
  let clean = String(urlStr).trim();
  clean = clean.replace(/^['"<]+|['">]+$/g, '').trim();
  return clean;
}

export function getMerchant(url) {
  try {
    const cleanUrl = sanitizeUrl(url);
    const h = new URL(cleanUrl).hostname.toLowerCase();
    if (h.includes('amazon') || h.includes('amzn.')) return 'amazon';
    if (h.includes('flipkart') || h.includes('fkrt.')) return 'flipkart';
    if (h.includes('myntra')) return 'myntra';
  } catch {}
  return null;
}

export function extractTitleFromSlug(urlStr) {
  try {
    const cleanUrl = sanitizeUrl(urlStr);
    const u = new URL(cleanUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    for (const part of parts) {
      if (part === 'dp' || part === 'p' || part === 'gp' || part === 'product' || part === 'buy') continue;
      const clean = part.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
      // Must look like a product slug (not an ASIN or item ID like B0CTMNDF9T or itm6ac64855)
      if (clean.length > 4 && !/^[a-z0-9]{8,16}$/i.test(clean)) {
        return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  } catch {}
  return '';
}

export function cleanExtractedTitle(title, urlStr) {
  const INVALID_TITLES = [
    'unknown product', 'amazon.in', 'page not found', 'buy products online at best price',
    'something went wrong', 'live content', 'duckduckgo', 'shopping cart', 'login', 'flipkart',
    'online shopping site in india', 'e-commerce product'
  ];

  const t = (title || '').trim();
  const lower = t.toLowerCase();

  const isInvalid = !t || t.length < 3 || INVALID_TITLES.some(inv => lower === inv || lower.startsWith(inv));

  if (isInvalid) {
    const slugTitle = extractTitleFromSlug(urlStr);
    if (slugTitle && slugTitle.length >= 3) return slugTitle;
    return 'E-Commerce Product';
  }

  // Clean trailing merchant suffixes
  return t
    .replace(/\s*\|\s*Flipkart(?:\.com)?$/i, '')
    .replace(/\s*-\s*Amazon(?:\.in)?$/i, '')
    .replace(/\s*:\s*Amazon(?:\.in)?$/i, '')
    .trim();
}

export function validateProductUrl(url) {
  try {
    const merchant = getMerchant(url);
    if (!merchant) return null;

    if (merchant === 'amazon') {
      const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Za-z0-9]{10})/i) || url.match(/[?&]asin=([A-Za-z0-9]{10})/i);
      if (!asinMatch) {
        return 'The Amazon link is incomplete or missing the 10-character Product ASIN (e.g. /dp/B0CTMNDF9T). Please copy and paste the complete URL from your browser address bar.';
      }
    }

    if (merchant === 'flipkart') {
      const itemMatch = url.match(/\/p\/(itm[a-zA-Z0-9]{11,15})/i) || url.match(/[?&]pid=([a-zA-Z0-9]{12,20})/i);
      if (!itemMatch) {
        return 'The Flipkart link is incomplete or missing the full Product ID (e.g. /p/itm6ac6485515ae4). Please copy and paste the complete URL from your browser address bar.';
      }
    }
  } catch {}
  return null;
}

export function parsePrice(raw) {
  if (!raw && raw !== 0) return 0;
  const s = String(raw).replace(/[₹$,\s]/g, '').split('.')[0];
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

export function decodeHTML(s = '') {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
}

export function extractJsonLD(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const o = JSON.parse(m[1]);
      const arr = Array.isArray(o) ? o : [o];
      const prod = arr.find(
        (x) => x?.['@type'] === 'Product' || x?.['@type']?.includes?.('Product'),
      );
      if (prod) return prod;
    } catch {}
  }
  return null;
}

export function extractOG(html, prop) {
  const re1 = new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i');
  return decodeHTML((html.match(re1) || html.match(re2))?.[1] || '');
}

export function isBotWall(html) {
  if (!html) return false;
  if (/robot\s*check|verify\s+you\s+are\s+human/i.test(html)) return true;
  if (/buy products online at best price/i.test(html) && !/id=["']productTitle["']/i.test(html)) return true;
  if (/access\s+denied/i.test(html) && html.length < 5000) return true;
  const hasBotLanguage = /unusual\s+traffic|automated\s+access/i.test(html);
  const hasForm = /<form[\s>]/i.test(html);
  if (hasBotLanguage && hasForm) return true;
  const hasCaptcha = /captcha/i.test(html);
  if (hasCaptcha && (hasForm || /<iframe[\s>]/i.test(html))) return true;
  return false;
}

/**
 * Extract ONLY Credit Card and Debit Card bank offers.
 * Strictly excludes exchange offers, standard EMI without discount, combo offers, and generic text.
 */
export function extractBankOffers(text) {
  if (!text) return [];
  const seen = new Set();
  const result = [];

  // Strictly REJECT exchange offers, trade-in, protection plans, free delivery, combo offers, warranty, GST, installation
  const REJECT_RE = /exchange|with\s+exchange|trade\s*in|old\s+device|old\s+phone|\{|\}|"displayprice"|"priceamount"|free\s+delivery|10\s+days\s+service|warranty|protection\s+plan|protect\s+promise|gst\s+invoice|business\s+purchase|authorised\s+installation|installationby/i;

  // MUST contain credit card, debit card, or a recognized bank discount
  const CARD_TERM_RE = /credit\s+card|debit\s+card|bank\s+offer|instant\s+discount|cashback|hdfc|icici|sbi|axis|kotak|indusind|rbl|hsbc|federal|yes\s+bank|bank\s+of\s+baroda|bob|union\s+bank|idfc|amex|american\s+express|au\s+small|onecard|citi|paytm|navi|jupiter/i;

  // 1. Markdown Flipkart single-line format: ₹5,795 off Flipkart Axis Credit Card • Includes cashback
  const fkPattern = /₹\s*[\d,]+\s+off\s+[^\n\r]{3,60}?(?:Credit|Debit)\s+Card[^\n\r]{0,80}/gi;
  for (const m of text.match(fkPattern) || []) {
    const clean = m.replace(/\s+/g, ' ').replace(/[•·]/g, ' - ').trim();
    if (!REJECT_RE.test(clean) && CARD_TERM_RE.test(clean)) {
      const key = clean.slice(0, 50).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(clean);
      }
    }
  }

  // 2. Multiline Flipkart format in markdown:
  // ₹5,795 off
  // Apply
  // Flipkart Axis
  // Credit Card • Includes cashback
  const fkMultiRe = /₹\s*([\d,]+)\s+off\s*(?:\n|\r\n)\s*(?:Apply\s*)?(?:\n|\r\n)\s*([A-Za-z0-9\s]+?)\s*(?:\n|\r\n)\s*((?:Credit|Debit)\s+Card[^\n\r]{0,60})/gi;
  let fkMatch;
  while ((fkMatch = fkMultiRe.exec(text)) !== null) {
    const amt = fkMatch[1];
    const bank = fkMatch[2].trim();
    const cardInfo = fkMatch[3].trim().replace(/[•·]/g, ' - ');
    const offerStr = `₹${amt} off on ${bank} ${cardInfo}`;
    if (!REJECT_RE.test(offerStr) && CARD_TERM_RE.test(offerStr)) {
      const key = offerStr.slice(0, 50).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(offerStr);
      }
    }
  }

  // 3. Standard Bank Offer formats (Amazon & general)
  const patterns = [
    /Bank\s+Offer\s*[:\-]?\s*.{15,350}?(?=Bank Offer|Credit Card Offer|Debit Card Offer|Cashback|Partner Offers|$|\n\n)/gi,
    /Upto\s+₹?[\d,.]+\s+(?:cashback|discount)\s+[^\n\r]{10,250}?(?:Credit|Debit)\s+Cards?[^\n\r]{0,60}/gi,
    /(?:Upto|Up\s+to|Flat|Get)\s+₹?[\d,.]+\s+(?:Instant\s+)?Discount\s+on\s+select\s+(?:Credit|Debit)\s+Cards.{0,120}/gi,
    /(?:Upto|Up\s+to|Flat|Get)\s+(?:₹[\d,.]+|\d+%)\s+(?:instant\s+)?(?:discount|cashback|off)\s+on\s+(?:[A-Za-z\s]+)?(?:Credit|Debit)\s+Cards?[^!\n;<]{0,150}/gi,
    /(?:HDFC|ICICI|SBI|AXIS|Kotak|IndusInd|RBL|HSBC|Federal\s+Bank|Yes\s+Bank|Bank\s+of\s+Baroda|BOB|Union\s+Bank|IDFC\s+FIRST|IDFC|Amex|American\s+Express|AU\s+Small|OneCard|Citi|Paytm|NAVI|Jupiter)[^!\n;<]{10,280}?(?:Credit|Debit)[^!\n;<]{0,120}/gi,
    /\d+%\s*(?:instant\s+)?(?:discount|off|cashback)\s+(?:up\s+to\s+₹?[\d,]+)?\s*on\s+(?:[A-Za-z\s]+)?(?:Credit|Debit)\s+Cards?[^!\n;<]{0,120}/gi,
  ];

  for (const pat of patterns) {
    for (const m of text.match(pat) || []) {
      const clean = m.replace(/\s+/g, ' ').trim().slice(0, 320);
      if (REJECT_RE.test(clean)) continue;
      if (!CARD_TERM_RE.test(clean)) continue;

      const key = clean.slice(0, 60).toLowerCase();
      if (clean.length > 12 && !seen.has(key)) {
        seen.add(key);
        result.push(clean);
      }
    }
  }
  return result.slice(0, 15);
}

export function parseStructuredBankOffers(offersInput) {
  const rawList = Array.isArray(offersInput)
    ? offersInput
    : extractBankOffers(String(offersInput || ''));

  const KNOWN_BANKS = [
    'Amazon Pay ICICI', 'Flipkart Axis', 'Flipkart SBI',
    'HDFC', 'ICICI', 'SBI', 'AXIS', 'Kotak', 'IndusInd', 'RBL', 'HSBC',
    'Federal Bank', 'Yes Bank', 'Bank of Baroda', 'BOB', 'Union Bank',
    'IDFC FIRST', 'IDFC', 'American Express', 'Amex',
    'AU Small Finance', 'AU Bank', 'AU Small', 'OneCard', 'Citi',
    'Paytm', 'NAVI', 'Jupiter'
  ];

  const structured = [];
  const seenKeys = new Set();

  for (const offerText of rawList) {
    if (!offerText || typeof offerText !== 'string') continue;
    const cleanText = offerText.replace(/\s+/g, ' ').trim();
    if (cleanText.length < 10) continue;

    // Strict reject of exchange offers
    if (/exchange|trade\s*in|old\s+phone|old\s+device/i.test(cleanText)) continue;

    let foundBank = 'Bank Offer';
    for (const bank of KNOWN_BANKS) {
      if (new RegExp(`\\b${bank.replace(/\s+/g, '\\s+')}\\b`, 'i').test(cleanText)) {
        foundBank = bank;
        break;
      }
    }

    let cardType = 'any';
    const lower = cleanText.toLowerCase();
    if (lower.includes('credit card') && !lower.includes('debit card')) {
      cardType = 'credit';
    } else if (lower.includes('debit card') && !lower.includes('credit card')) {
      cardType = 'debit';
    }

    let discountAmount = 0;
    let discountPercent = 0;

    const amtMatch = cleanText.match(/(?:₹|Rs\.?|save|off|discount|cashback|upto)\s*[:\s]*(?:₹|Rs\.?)?\s*([\d,]+(?:\.\d+)?)/i)
      || cleanText.match(/([\d,]+)\s*(?:off|discount|cashback)/i);
    if (amtMatch) {
      discountAmount = parsePrice(amtMatch[1]);
    }

    const pctMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) {
      discountPercent = parseFloat(pctMatch[1]);
    }

    const dedupeKey = `${foundBank}-${cardType}-${discountAmount}-${discountPercent}-${cleanText.slice(0, 30).toLowerCase()}`;
    if (!seenKeys.has(dedupeKey)) {
      seenKeys.add(dedupeKey);
      structured.push({
        bank: foundBank,
        cardType,
        discountAmount,
        discountPercent,
        description: cleanText,
      });
    }
  }

  return structured;
}

export function isPlainText(content) {
  if (!content) return true;
  const sample = content.slice(0, 3000);
  const tagCount = (sample.match(/<[a-z][^>]{0,100}>/gi) || []).length;
  return tagCount < 8;
}

export function deepFind(obj, keys, max = 14, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > max) return undefined;
  for (const key of keys) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined) {
      const v = obj[key];
      if (typeof v === 'number' && v > 0) return v;
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  for (const child of Array.isArray(obj) ? obj : Object.values(obj)) {
    if (child && typeof child === 'object') {
      const r = deepFind(child, keys, max, depth + 1);
      if (r !== undefined) return r;
    }
  }
  return undefined;
}

export function deepFindAll(obj, keys, max = 14, depth = 0, results = []) {
  if (!obj || typeof obj !== 'object' || depth > max) return results;
  for (const key of keys) {
    if (key in obj && obj[key] !== null && obj[key] !== undefined) {
      const v = obj[key];
      if (typeof v === 'number' && v > 0) results.push(v);
      if (typeof v === 'string' && v.length > 0) results.push(v);
    }
  }
  for (const child of Array.isArray(obj) ? obj : Object.values(obj)) {
    if (child && typeof child === 'object') {
      deepFindAll(child, keys, max, depth + 1, results);
    }
  }
  return results;
}

const BROWSER_PROFILES = [
  {
    'User-Agent':              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Accept':                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language':         'en-IN,en-GB;q=0.9,en;q=0.8',
    'Accept-Encoding':         'gzip, deflate, br, zstd',
    'sec-ch-ua':               '"Google Chrome";v="127", "Chromium";v="127", "Not.A/Brand";v="24"',
    'sec-ch-ua-mobile':        '?0',
    'sec-ch-ua-platform':      '"Windows"',
    'sec-fetch-dest':          'document',
    'sec-fetch-mode':          'navigate',
    'sec-fetch-site':          'none',
    'sec-fetch-user':          '?1',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control':           'max-age=0',
  },
  {
    'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'sec-fetch-dest':  'document',
    'sec-fetch-mode':  'navigate',
    'sec-fetch-site':  'none',
    'Upgrade-Insecure-Requests': '1',
  },
  {
    'User-Agent':         'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
    'Accept':             'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language':    'en-IN,hi;q=0.9,en;q=0.8',
    'Accept-Encoding':    'gzip, deflate, br',
    'sec-ch-ua':          '"Chromium";v="127", "Android WebView";v="127"',
    'sec-ch-ua-mobile':   '?1',
    'sec-ch-ua-platform': '"Android"',
    'sec-fetch-dest':     'document',
    'sec-fetch-mode':     'navigate',
    'sec-fetch-site':     'none',
    'sec-fetch-user':     '?1',
    'Upgrade-Insecure-Requests': '1',
  },
];

export function toMobileFlipkartUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('flipkart') && !u.hostname.startsWith('m.')) {
      u.hostname = 'm.flipkart.com';
      return u.toString();
    }
  } catch {}
  return url;
}

function getDomainReferer(merchant) {
  if (merchant === 'amazon')   return 'https://www.amazon.in/';
  if (merchant === 'flipkart') return 'https://www.flipkart.com/';
  if (merchant === 'myntra')   return 'https://www.myntra.com/';
  return 'https://www.google.com/';
}

export async function withRetry(fn, maxAttempts = 2, delayMs = 800) {
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const isTransient = e.message?.includes('504')
        || e.message?.includes('503')
        || e.message?.includes('502')
        || e.message?.includes('ETIMEDOUT')
        || e.message?.includes('timeout')
        || e.message?.includes('network');
      if (!isTransient || attempt === maxAttempts - 1) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

async function tryFetch(url, profile, merchant, timeoutMs = 20000) {
  const referer = getDomainReferer(merchant);
  const res = await fetch(url, {
    headers: { ...profile, Referer: referer },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('Response too small');
  return html;
}

async function fetchViaScraperAPI(url) {
  const key = env('SCRAPER_API_KEY');
  if (!key) throw new Error('No ScraperAPI key');
  const params = new URLSearchParams({ api_key: key, url, country_code: 'in', render: 'false' });
  const res = await fetch(`https://api.scraperapi.com/?${params}`, {
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`ScraperAPI HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('ScraperAPI returned empty response');
  return html;
}

async function fetchViaJina(url) {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const jinaKey = env('JINA_API_KEY');
  const headers = {
    Accept:       'text/plain, */*',
    'X-Timeout':  '30',
    'X-No-Cache': 'true',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    ...(jinaKey ? { Authorization: `Bearer ${jinaKey}` } : {}),
  };
  const res = await fetch(jinaUrl, { headers, signal: AbortSignal.timeout(40000) });
  if (!res.ok) {
    if (res.status === 404) throw new Error('HTTP_404');
    throw new Error(`Jina HTTP ${res.status}`);
  }
  const text = await res.text();
  if (!text || text.length < 300) throw new Error('Jina returned too short response');
  if (/Warning: Target URL returned error 404/i.test(text.slice(0, 600)) ||
      /buy products online at best price/i.test(text.slice(0, 600)) ||
      /something went wrong/i.test(text.slice(0, 500)) ||
      /E00[0-9]/i.test(text.slice(0, 500))) {
    throw new Error('HTTP_404');
  }
  return text;
}

async function fetchViaAllOrigins(url) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&charset=UTF-8`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(28000) });
  if (!res.ok) {
    if (res.status === 404) throw new Error('HTTP_404');
    throw new Error(`AllOrigins HTTP ${res.status}`);
  }
  const json = await res.json();
  const html = json?.contents;
  if (!html || html.length < 500) throw new Error('AllOrigins returned empty or too-small response');
  if (isBotWall(html)) throw new Error('AllOrigins: bot wall on response');
  return html;
}

async function fetchViaCorsProxyIo(url) {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('HTTP_404');
    throw new Error(`CorsProxy HTTP ${res.status}`);
  }
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('CorsProxy empty response');
  if (isBotWall(html)) throw new Error('CorsProxy bot wall');
  return html;
}

async function fetchViaCodetabs(url) {
  const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('HTTP_404');
    throw new Error(`Codetabs HTTP ${res.status}`);
  }
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('Codetabs empty response');
  if (isBotWall(html)) throw new Error('Codetabs bot wall');
  return html;
}

export function extractSlugKeywords(urlStr) {
  try {
    const u = new URL(urlStr);
    const parts = u.pathname.split('/').filter(Boolean);
    for (const part of parts) {
      if (part === 'dp' || part === 'p' || part === 'gp' || part === 'product') continue;
      const clean = part.replace(/[-_]+/g, ' ').trim();
      if (clean.length > 5 && !/^[a-z0-9]{8,16}$/i.test(clean)) {
        return clean;
      }
    }
  } catch {}
  return '';
}

export async function autoResolveUrl(productUrl) {
  const merchant = getMerchant(productUrl);
  if (!merchant) return productUrl;

  const domain = merchant === 'amazon' ? 'amazon.in' : merchant === 'flipkart' ? 'flipkart.com' : 'myntra.com';
  const slug = extractSlugKeywords(productUrl);
  if (!slug) return productUrl;

  try {
    const ddgUrl = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=site:${domain}+${encodeURIComponent(slug)}`;
    const res = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return productUrl;
    const text = await res.text();

    if (merchant === 'amazon') {
      const match = text.match(/amazon\.in\/[^"'\s]*\/dp\/([A-Z0-9]{10})/i) || text.match(/amazon\.in\/dp\/([A-Z0-9]{10})/i);
      if (match) {
        return `https://www.amazon.in/dp/${match[1]}`;
      }
    } else if (merchant === 'flipkart') {
      const match = text.match(/flipkart\.com\/([^"'\s]*\/p\/itm[a-zA-Z0-9]{11,15})/i);
      if (match) {
        return `https://www.flipkart.com/${match[1]}`;
      }
    }
  } catch (e) {}

  return productUrl;
}

async function fetchAmazonDirect(url) {
  const asin = url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1]
             || url.match(/\/gp\/product\/([A-Z0-9]{10})/i)?.[1];
  const targetUrl = asin ? `https://www.amazon.in/dp/${asin}` : url;
  const headers = {
    'User-Agent':      'Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
    'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer':         'https://www.amazon.in/',
    'sec-fetch-dest':  'document',
    'sec-fetch-mode':  'navigate',
    'sec-fetch-site':  'same-origin',
    'sec-fetch-user':  '?1',
    'Upgrade-Insecure-Requests': '1',
  };
  const res = await fetch(targetUrl, {
    headers,
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Amazon direct HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 2000) throw new Error('Amazon direct: response too small');
  if (isBotWall(html)) throw new Error('Amazon direct: bot wall');
  if (!html.includes('productTitle') && !html.includes('a-price-whole'))
    throw new Error('Amazon direct: no product data found');
  return html;
}

export async function fetchPage(url, merchant) {
  const scraperKey = env('SCRAPER_API_KEY');
  const siteName   = merchant === 'amazon' ? 'Amazon' : merchant === 'flipkart' ? 'Flipkart' : 'Myntra';

  if (scraperKey) {
    try { return await fetchViaScraperAPI(url); } catch (e) {}
  }

  const throwOn404 = (err) => {
    if (err.message === 'HTTP_404') {
      throw new Error('The product URL appears to be invalid or the item no longer exists. Please check the link and try again.');
    }
  };

  if (merchant === 'flipkart' || merchant === 'myntra') {
    try { return await fetchViaJina(url); } catch (e) { throwOn404(e); }
    try { return await fetchViaCorsProxyIo(url); } catch (e) { throwOn404(e); }
    try { return await fetchViaCodetabs(url); } catch (e) { throwOn404(e); }
    for (const profile of BROWSER_PROFILES) {
      try {
        const html = await tryFetch(url, profile, merchant, 10000);
        if (!isBotWall(html)) return html;
      } catch (e) {}
    }
    try { return await fetchViaAllOrigins(url); } catch (e) { throwOn404(e); }
    throw new Error(`${siteName} is blocking automated access from this server. Try using the Chrome Extension instead.`);
  }

  if (merchant === 'amazon') {
    try { return await fetchViaJina(url); } catch (e) { throwOn404(e); }
    try { return await fetchViaCorsProxyIo(url); } catch (e) { throwOn404(e); }
    try { return await fetchViaCodetabs(url); } catch (e) { throwOn404(e); }
    try { return await fetchAmazonDirect(url); } catch (e) {}
    try { return await fetchViaAllOrigins(url); } catch (e) { throwOn404(e); }
    throw new Error(`Amazon is blocking automated access from this server. Try using the Chrome Extension instead.`);
  }

  for (const profile of BROWSER_PROFILES) {
    try {
      const html = await tryFetch(url, profile, merchant, 12000);
      if (!isBotWall(html)) return html;
    } catch (e) {}
  }
  try { return await fetchViaJina(url); } catch (e) { throwOn404(e); }
  throw new Error(`${siteName} is blocking automated access. Please try again or use the Chrome Extension.`);
}
