/* ─────────────────────────────────────────────────────────────────────────────
   Crawler utilities — ported from the original Next.js crawlers/utils.js
   Strategy order:
     1. ScraperAPI (if SCRAPER_API_KEY is set)
     2. Jina.ai reader  (r.jina.ai — free, handles JS-rendered pages)
     3. corsproxy.io
     4. codetabs.com
     5. allorigins.win
     6. Direct browser-mimicking fetch (Amazon direct / mobile UA)
───────────────────────────────────────────────────────────────────────────── */

export function sanitizeUrl(urlStr = ''): string {
  return String(urlStr).trim().replace(/^['"<]+|['">]+$/g, '').trim();
}

export function getMerchant(url: string): string | null {
  try {
    const h = new URL(sanitizeUrl(url)).hostname.toLowerCase();
    if (h.includes('amazon'))   return 'amazon';
    if (h.includes('flipkart')) return 'flipkart';
    if (h.includes('myntra'))   return 'myntra';
  } catch {}
  return null;
}

export function extractTitleFromSlug(urlStr: string): string {
  try {
    const u = new URL(sanitizeUrl(urlStr));
    const SKIP = new Set(['dp', 'p', 'gp', 'product', 'buy']);
    for (const part of u.pathname.split('/').filter(Boolean)) {
      if (SKIP.has(part)) continue;
      const clean = part.replace(/[-_]+/g, ' ').trim();
      if (clean.length > 4 && !/^[a-z0-9]{8,16}$/i.test(clean)) {
        return clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  } catch {}
  return '';
}

export function cleanExtractedTitle(title: string, urlStr: string): string {
  const INVALID = [
    'unknown product', 'amazon.in', 'page not found',
    'buy products online at best price', 'something went wrong',
    'live content', 'duckduckgo', 'shopping cart', 'login', 'flipkart',
  ];
  const t = (title || '').trim();
  const lower = t.toLowerCase();
  const invalid = !t || t.length < 3 || INVALID.some(inv => lower === inv || lower.startsWith(inv));
  if (invalid) {
    const slug = extractTitleFromSlug(urlStr);
    return slug && slug.length >= 3 ? slug : 'E-Commerce Product';
  }
  return t;
}

export function validateProductUrl(url: string): string | null {
  try {
    const merchant = getMerchant(url);
    if (!merchant) return null;
    if (merchant === 'amazon') {
      const ok = /\/(?:dp|gp\/product)\/([A-Za-z0-9]{10})/i.test(url) || /[?&]asin=([A-Za-z0-9]{10})/i.test(url);
      if (!ok) return 'The Amazon link is missing the 10-character ASIN (e.g. /dp/B0CTMNDF9T). Please paste the full URL from your browser.';
    }
    if (merchant === 'flipkart') {
      const ok = /\/p\/(itm[a-zA-Z0-9]{11,15})/i.test(url) || /[?&]pid=([a-zA-Z0-9]{12,20})/i.test(url);
      if (!ok) return 'The Flipkart link is missing the Product ID (e.g. /p/itm6ac6485515ae4). Please paste the full URL from your browser.';
    }
  } catch {}
  return null;
}

export function parsePrice(raw: string | number): number {
  const s = String(raw).replace(/[₹$,\s]/g, '').split('.')[0];
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

export function decodeHTML(s = ''): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
}

export function extractJsonLD(html: string): Record<string, unknown> | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const o = JSON.parse(m[1]);
      const arr: unknown[] = Array.isArray(o) ? o : [o];
      const prod = arr.find(
        (x: any) => x?.['@type'] === 'Product' || x?.['@type']?.includes?.('Product'),
      ) as Record<string, unknown> | undefined;
      if (prod) return prod;
    } catch {}
  }
  return null;
}

export function extractOG(html: string, prop: string): string {
  const re1 = new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i');
  return decodeHTML((html.match(re1) || html.match(re2))?.[1] || '');
}

export function isBotWall(html: string): boolean {
  if (!html) return false;
  if (/robot\s*check|verify\s+you\s+are\s+human/i.test(html)) return true;
  if (/buy products online at best price/i.test(html) && !/id=["']productTitle["']/i.test(html)) return true;
  if (/access\s+denied/i.test(html) && html.length < 5000) return true;
  const hasBotLang = /unusual\s+traffic|automated\s+access/i.test(html);
  const hasForm = /<form[\s>]/i.test(html);
  if (hasBotLang && hasForm) return true;
  const hasCaptcha = /captcha/i.test(html);
  if (hasCaptcha && (hasForm || /<iframe[\s>]/i.test(html))) return true;
  return false;
}

export function isPlainText(content: string): boolean {
  if (!content) return true;
  const tagCount = (content.slice(0, 3000).match(/<[a-z][^>]{0,100}>/gi) || []).length;
  return tagCount < 8;
}

export function extractBankOffers(text: string): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  const REJECT_RE = /exchange|with\s+exchange|\{|\}|"displayprice"|"priceamount"|emi\s+starts\s+at|free\s+delivery|10\s+days\s+service|https?:\/\//i;
  const CARD_TERM_RE = /credit\s+card|debit\s+card|bank\s+offer|instant\s+discount|cashback|hdfc|icici|sbi|axis|kotak|indusind|rbl|hsbc|federal|yes\s+bank|bob|union\s+bank|idfc|amex|au\s+small|onecard|citi|paytm|navi|jupiter/i;

  const patterns = [
    /Bank\s+Offer\s*[:\-]?\s*.{15,350}?(?=Bank Offer|Credit Card Offer|Debit Card Offer|$|\n\n)/gi,
    /(?:Upto|Up\s+to|Flat|Get)\s+₹?[\d,.]+\s+discount\s+on\s+select\s+(?:Credit|Debit)\s+Cards.{0,100}/gi,
    /(?:Upto|Up\s+to|Flat|Get)\s+(?:₹[\d,.]+|\d+%)\s+(?:discount|cashback)[^!\n;<]{5,200}/gi,
    /(?:HDFC|ICICI|SBI|AXIS|Kotak|IndusInd|RBL|HSBC|Federal\s+Bank|Yes\s+Bank|BOB|Union\s+Bank|IDFC|Amex|AU\s+Small|OneCard|Citi|Paytm|NAVI|Jupiter)[^!\n;<]{10,280}?(?:off|cashback|discount|EMI|reward)[^!\n;<]{0,120}/gi,
    /\d+%\s*(?:instant\s+)?(?:discount|off|cashback)[^!\n;<]{10,220}/gi,
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

export interface StructuredOffer {
  bank: string;
  cardType: 'credit' | 'debit' | 'any';
  discountAmount: number;
  discountPercent: number;
  description: string;
}

export function parseStructuredBankOffers(offersInput: string[]): StructuredOffer[] {
  const rawList = Array.isArray(offersInput) ? offersInput : extractBankOffers(String(offersInput || ''));

  const KNOWN_BANKS = [
    'HDFC', 'ICICI', 'SBI', 'AXIS', 'Kotak', 'IndusInd', 'RBL', 'HSBC',
    'Federal Bank', 'Yes Bank', 'BOB', 'Union Bank', 'IDFC', 'Amex',
    'AU Small', 'OneCard', 'Citi', 'Paytm', 'NAVI', 'Jupiter',
  ];

  const structured: StructuredOffer[] = [];
  const seenKeys = new Set<string>();

  for (const offerText of rawList) {
    if (!offerText || typeof offerText !== 'string') continue;
    const cleanText = offerText.replace(/\s+/g, ' ').trim();
    if (cleanText.length < 10) continue;

    let foundBank = 'Other Bank';
    for (const bank of KNOWN_BANKS) {
      if (new RegExp(`\\b${bank.replace(/\s+/g, '\\s+')}\\b`, 'i').test(cleanText)) {
        foundBank = bank;
        break;
      }
    }

    const lower = cleanText.toLowerCase();
    let cardType: 'credit' | 'debit' | 'any' = 'any';
    if (lower.includes('credit card') && !lower.includes('debit card')) cardType = 'credit';
    else if (lower.includes('debit card') && !lower.includes('credit card')) cardType = 'debit';

    const amtMatch = cleanText.match(/(?:₹|Rs\.?)\s*([\d,]+)/i);
    const discountAmount = amtMatch ? parsePrice(amtMatch[1]) : 0;

    const pctMatch = cleanText.match(/(\d+(?:\.\d+)?)\s*%/);
    const discountPercent = pctMatch ? parseFloat(pctMatch[1]) : 0;

    const dedupeKey = `${foundBank}-${cardType}-${cleanText.slice(0, 40).toLowerCase()}`;
    if (!seenKeys.has(dedupeKey)) {
      seenKeys.add(dedupeKey);
      structured.push({ bank: foundBank, cardType, discountAmount, discountPercent, description: cleanText });
    }
  }
  return structured;
}

export function deepFind(obj: unknown, keys: string[], max = 14, depth = 0): unknown {
  if (!obj || typeof obj !== 'object' || depth > max) return undefined;
  const o = obj as Record<string, unknown>;
  for (const key of keys) {
    if (key in o && o[key] !== null && o[key] !== undefined) {
      const v = o[key];
      if (typeof v === 'number' && v > 0) return v;
      if (typeof v === 'string' && v.length > 0) return v;
    }
  }
  for (const child of Array.isArray(obj) ? obj as unknown[] : Object.values(o)) {
    if (child && typeof child === 'object') {
      const r = deepFind(child, keys, max, depth + 1);
      if (r !== undefined) return r;
    }
  }
  return undefined;
}

export function deepFindAll(obj: unknown, keys: string[], max = 14, depth = 0, results: unknown[] = []): unknown[] {
  if (!obj || typeof obj !== 'object' || depth > max) return results;
  const o = obj as Record<string, unknown>;
  for (const key of keys) {
    if (key in o && o[key] !== null && o[key] !== undefined) {
      const v = o[key];
      if (typeof v === 'number' && v > 0) results.push(v);
      if (typeof v === 'string' && v.length > 0) results.push(v);
    }
  }
  for (const child of Array.isArray(obj) ? obj as unknown[] : Object.values(o)) {
    if (child && typeof child === 'object') deepFindAll(child, keys, max, depth + 1, results);
  }
  return results;
}

export function toMobileFlipkartUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes('flipkart') && !u.hostname.startsWith('m.')) {
      u.hostname = 'm.flipkart.com';
      return u.toString();
    }
  } catch {}
  return url;
}

// ─── Browser profiles ────────────────────────────────────────────────────────

const BROWSER_PROFILES: Record<string, string>[] = [
  {
    'User-Agent':              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    'Accept':                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language':         'en-IN,en-GB;q=0.9,en;q=0.8',
    'Accept-Encoding':         'gzip, deflate, br',
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

function getDomainReferer(merchant: string): string {
  if (merchant === 'amazon')   return 'https://www.amazon.in/';
  if (merchant === 'flipkart') return 'https://www.flipkart.com/';
  if (merchant === 'myntra')   return 'https://www.myntra.com/';
  return 'https://www.google.com/';
}

async function tryFetch(url: string, profile: Record<string, string>, merchant: string, timeoutMs = 20000): Promise<string> {
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

async function fetchViaScraperAPI(url: string): Promise<string> {
  const key = process.env['SCRAPER_API_KEY'];
  if (!key) throw new Error('No ScraperAPI key');
  const params = new URLSearchParams({ api_key: key, url, country_code: 'in', render: 'false' });
  const res = await fetch(`https://api.scraperapi.com/?${params}`, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`ScraperAPI HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('ScraperAPI returned empty');
  return html;
}

async function fetchViaJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const jinaKey = process.env['JINA_API_KEY'];
  const headers: Record<string, string> = {
    Accept: 'text/plain, */*',
    'X-Timeout': '30',
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

async function fetchViaCorsProxyIo(url: string): Promise<string> {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) { if (res.status === 404) throw new Error('HTTP_404'); throw new Error(`CorsProxy HTTP ${res.status}`); }
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('CorsProxy empty response');
  if (isBotWall(html)) throw new Error('CorsProxy bot wall');
  return html;
}

async function fetchViaCodetabs(url: string): Promise<string> {
  const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) { if (res.status === 404) throw new Error('HTTP_404'); throw new Error(`Codetabs HTTP ${res.status}`); }
  const html = await res.text();
  if (!html || html.length < 800) throw new Error('Codetabs empty response');
  if (isBotWall(html)) throw new Error('Codetabs bot wall');
  return html;
}

async function fetchViaAllOrigins(url: string): Promise<string> {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&charset=UTF-8`;
  const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(28000) });
  if (!res.ok) { if (res.status === 404) throw new Error('HTTP_404'); throw new Error(`AllOrigins HTTP ${res.status}`); }
  const json = await res.json() as { contents?: string };
  const html = json?.contents;
  if (!html || html.length < 500) throw new Error('AllOrigins returned empty');
  if (isBotWall(html)) throw new Error('AllOrigins: bot wall');
  return html;
}

async function fetchAmazonDirect(url: string): Promise<string> {
  const asin = url.match(/\/dp\/([A-Z0-9]{10})/i)?.[1] || url.match(/\/gp\/product\/([A-Z0-9]{10})/i)?.[1];
  const target = asin ? `https://www.amazon.in/dp/${asin}` : url;
  const res = await fetch(target, {
    headers: {
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
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Amazon direct HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 2000) throw new Error('Amazon direct: response too small');
  if (isBotWall(html)) throw new Error('Amazon direct: bot wall');
  if (!html.includes('productTitle') && !html.includes('a-price-whole')) throw new Error('Amazon direct: no product data');
  return html;
}

export async function fetchPage(url: string, merchant: string): Promise<string> {
  const scraperKey = process.env['SCRAPER_API_KEY'];
  const siteName = merchant === 'amazon' ? 'Amazon' : merchant === 'flipkart' ? 'Flipkart' : 'Myntra';

  const throwOn404 = (err: Error) => {
    if (err.message === 'HTTP_404') throw new Error('The product URL appears invalid or the item no longer exists. Please check the link and try again.');
  };

  if (scraperKey) {
    try { return await fetchViaScraperAPI(url); } catch {}
  }

  if (merchant === 'amazon') {
    try { return await fetchAmazonDirect(url); } catch {}
    try { return await fetchViaJina(url); } catch (e: any) { throwOn404(e); }
    try { return await fetchViaCorsProxyIo(url); } catch (e: any) { throwOn404(e); }
    try { return await fetchViaCodetabs(url); } catch (e: any) { throwOn404(e); }
    try { return await fetchViaAllOrigins(url); } catch (e: any) { throwOn404(e); }
    throw new Error('Amazon is blocking automated access from this server. Try using the Chrome Extension instead.');
  }

  if (merchant === 'flipkart' || merchant === 'myntra') {
    try { return await fetchViaJina(url); } catch (e: any) { throwOn404(e); }
    try { return await fetchViaCorsProxyIo(url); } catch (e: any) { throwOn404(e); }
    try { return await fetchViaCodetabs(url); } catch (e: any) { throwOn404(e); }
    for (const profile of BROWSER_PROFILES) {
      try { const html = await tryFetch(url, profile, merchant, 10000); if (!isBotWall(html)) return html; } catch {}
    }
    try { return await fetchViaAllOrigins(url); } catch (e: any) { throwOn404(e); }
    throw new Error(`${siteName} is blocking automated access from this server. Try using the Chrome Extension instead.`);
  }

  for (const profile of BROWSER_PROFILES) {
    try { const html = await tryFetch(url, profile, merchant, 12000); if (!isBotWall(html)) return html; } catch {}
  }
  try { return await fetchViaJina(url); } catch (e: any) { throwOn404(e); }
  try { return await fetchViaCorsProxyIo(url); } catch (e: any) { throwOn404(e); }
  throw new Error(`${siteName} is blocking automated access from this server.`);
}

// ─── DDG metadata fallback for Amazon ────────────────────────────────────────

export async function fetchAmazonMetadataViaDDG(asin: string | null, url: string): Promise<{ title: string; price: number; rawOffers: string[] } | null> {
  try {
    const query = asin ? `site:amazon.in ${asin}` : `site:amazon.in ${extractTitleFromSlug(url)}`;
    const ddgUrl = `https://r.jina.ai/https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const text = await res.text();

    let title = '';
    const titleMatch = text.match(/##\s*\[([^\]]+)\]\(https:\/\/[^)]*amazon\.in[^)]*\)/i) ||
                       text.match(/\[([^\]]{15,200})\]\(https:\/\/duckduckgo\.com\/l\/\?uddg=https%3A%2F%2Fwww\.amazon\.in/i);
    if (titleMatch) title = titleMatch[1].replace(/\s*-\s*Amazon(?:\.in)?$/i, '').trim();

    const textWithoutOffers = text.replace(/(?:bank\s+offer|credit\s+card|debit\s+card|emi|cashback|buy\s+for|save|discount)[^\n]*/gi, '');
    const priceRe = /₹\s*([\d,]+)/g;
    const prices: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = priceRe.exec(textWithoutOffers.slice(0, 4000))) !== null) {
      const p = parsePrice(m[1]);
      if (p > 1000 && p !== 999 && p !== 299) prices.push(p);
    }

    return { title: title || extractTitleFromSlug(url), price: prices.length ? Math.min(...prices) : 0, rawOffers: extractBankOffers(text) };
  } catch {}
  return null;
}

export interface ScrapedProduct {
  url: string;
  title: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  availability: 'in_stock' | 'out_of_stock';
  sellerName: string;
  image: string;
  asin: string | null;
  rawOffers: string[];
  bankOffers: StructuredOffer[];
  domain: string;
  lowestEver: number;
}
