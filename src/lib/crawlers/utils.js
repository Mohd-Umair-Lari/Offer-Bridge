const env = (k) => process.env[k] || '';

export function getMerchant(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    if (h.includes('amazon')) return 'amazon';
    if (h.includes('flipkart')) return 'flipkart';
    if (h.includes('myntra')) return 'myntra';
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
  const lower = html.toLowerCase();
  if (/robot\s*check|verify\s+you\s+are\s+human/i.test(html)) return true;
  if (/access\s+denied/i.test(html) && html.length < 5000) return true;
  const hasBotLanguage = /unusual\s+traffic|automated\s+access/i.test(html);
  const hasForm = /<form[\s>]/i.test(html);
  if (hasBotLanguage && hasForm) return true;
  const hasCaptcha = /captcha/i.test(html);
  if (hasCaptcha && (hasForm || /<iframe[\s>]/i.test(html))) return true;
  return false;
}

export function extractBankOffers(text) {
  const seen = new Set();
  const result = [];
  const patterns = [
    /Bank\s+Offer\s*[:\-]?\s*.{15,350}?(?=Bank Offer|Credit Card Offer|Debit Card Offer|$|\n\n)/gi,
    /(?:Get|Flat|Extra|Avail|Upto|Up\s+to)\s+(?:₹[\d,]+|\d+%)\s*.{10,280}/gi,
    /(?:HDFC|ICICI|SBI|AXIS|Kotak|IndusInd|RBL|HSBC|Federal\s+Bank|Yes\s+Bank|BOB|Union\s+Bank|IDFC|Amex|AU\s+Small|OneCard|Citi|Paytm|NAVI|Jupiter)[^!\n;]{10,280}?(?:off|cashback|discount|EMI|reward)[^!\n;]{0,120}/gi,
    /\d+%\s*(?:instant\s+)?(?:discount|off|cashback)[^!\n;]{10,220}/gi,
    /No\s+Cost\s+EMI[^!\n;]{10,220}/gi,
    /(?:\d+%|₹[\d,]+)\s+(?:off|discount|cashback)\s+(?:on|with|using)\s+\w+[^!\n;]{5,180}/gi,
  ];
  for (const pat of patterns) {
    for (const m of text.match(pat) || []) {
      const clean = m.replace(/\s+/g, ' ').trim().slice(0, 320);
      const key   = clean.slice(0, 60).toLowerCase();
      if (clean.length > 12 && !seen.has(key)) { seen.add(key); result.push(clean); }
    }
  }
  return result.slice(0, 15);
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
    ...(jinaKey ? { Authorization: `Bearer ${jinaKey}` } : {}),
  };
  const res = await fetch(jinaUrl, { headers, signal: AbortSignal.timeout(40000) });
  if (!res.ok) throw new Error(`Jina HTTP ${res.status}`);
  const text = await res.text();
  if (!text || text.length < 300) throw new Error('Jina returned too short response');
  if (/E00[0-9]|Something went wrong|Please try again/i.test(text.slice(0, 500)))
    throw new Error('Jina service error: ' + text.slice(0, 100));
  return text;
}

async function fetchViaAllOrigins(url) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&charset=UTF-8`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(28000) });
  if (!res.ok) throw new Error(`AllOrigins HTTP ${res.status}`);
  const json = await res.json();
  const html = json?.contents;
  if (!html || html.length < 500) throw new Error('AllOrigins returned empty or too-small response');
  if (isBotWall(html)) throw new Error('AllOrigins: bot wall on response');
  return html;
}

export async function fetchPage(url, merchant) {
  const scraperKey = env('SCRAPER_API_KEY');
  const siteName   = merchant === 'amazon' ? 'Amazon' : merchant === 'flipkart' ? 'Flipkart' : 'Myntra';

  if (scraperKey) {
    try { return await withRetry(() => fetchViaScraperAPI(url)); } catch (e) {}
  }

  let directUrls = [url];
  if (merchant === 'flipkart') {
    directUrls = [toMobileFlipkartUrl(url), url];
  } else if (merchant === 'amazon') {
    const asin = url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1] || url.match(/\/gp\/product\/([A-Z0-9]{10})/i)?.[1];
    if (asin) {
      const cleanUrl = `https://www.amazon.in/dp/${asin}?th=1&psc=1`;
      if (cleanUrl.toLowerCase() !== url.toLowerCase()) directUrls = [cleanUrl, url];
    }
  }

  let lastErr;
  for (const targetUrl of directUrls) {
    for (const profile of BROWSER_PROFILES) {
      try {
        const html = await withRetry(() => tryFetch(targetUrl, profile, merchant), 2, 600);
        if (!isBotWall(html)) return html;
        throw new Error('Bot wall detected on direct fetch');
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));
      }
    }
  }

  try { return await withRetry(() => fetchViaJina(url)); } catch (jinaErr) {}

  try { return await withRetry(() => fetchViaAllOrigins(url)); } catch (originsErr) {
    throw new Error(`${siteName} is blocking automated access from this server.`);
  }
}
