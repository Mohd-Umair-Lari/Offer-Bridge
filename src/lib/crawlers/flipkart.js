import {
  fetchPage,
  extractBankOffers,
  parsePrice,
  decodeHTML,
  extractJsonLD,
  extractOG,
  deepFind,
  deepFindAll,
  isPlainText,
} from './utils';

function flipkartSlugKeywords(url) {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    const slug = parts[1] || '';
    return slug
      .split('-')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 2 && !['buy', 'online', 'india'].includes(s));
  } catch {}
  return [];
}

function extractBestFlipkartPrice(priceCandidates) {
  for (const c of priceCandidates) {
    const p = parsePrice(String(c));
    // Reject generic promo prices (like 999 EMI banners or 299/199 add-ons)
    // The user reported "999" showing up for every Flipkart link, indicating
    // a global promo node was injected into the JSON with value 999.
    if (p > 90 && p !== 999 && p !== 299 && p !== 199 && p !== 99) {
      return p;
    }
  }
  return 0;
}

export async function scrapeFlipkart(productUrl) {
  let jsonResult = await fetchFlipkartInternalApi(productUrl);
  if (jsonResult) return jsonResult;

  const html = await fetchPage(productUrl, 'flipkart');

  if (isPlainText(html)) {
    return parseFromText(html, productUrl);
  }

  return parseFlipkart(html, productUrl);
}

function parseFlipkart(html, productUrl) {
  const ld = extractJsonLD(html);
  const stripped = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const slugKws = productUrl ? flipkartSlugKeywords(productUrl) : [];

  let title = '';
  if (ld?.name) {
    const score = slugKws.length > 0 ? slugKws.reduce((acc, kw) => acc + (ld.name.toLowerCase().includes(kw) ? 1 : 0), 0) : 1;
    if (score > 0) title = ld.name;
  }

  let price = ld?.offers?.price ? parsePrice(String(ld.offers.price)) : 0;
  if (price === 999) price = 0; // Filter out the promo bug from LD JSON too if present

  if (!title || !price) {
    try {
      const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
      if (nextDataMatch) {
        const nextData = JSON.parse(nextDataMatch[1]);
        if (!title) {
          const titleCandidates = deepFindAll(nextData, ['title', 'name', 'productName', 'displayName', 'productTitle']);
          let bestScore = -1;
          for (const t of titleCandidates) {
            if (typeof t === 'string' && t.length > 3) {
              const score = slugKws.length > 0 ? slugKws.reduce((acc, kw) => acc + (t.toLowerCase().includes(kw) ? 1 : 0), 0) : 1;
              if (score > bestScore) { bestScore = score; title = t; }
            }
          }
          if (slugKws.length > 0 && bestScore === 0) title = '';
        }
        if (!price) {
          const priceCandidates = deepFindAll(nextData, ['specialPrice', 'finalPrice', 'sellingPrice', 'finalSellingPrice', 'discountedPrice', 'price', 'mrpPrice', 'basePrice', 'listingPrice']);
          price = extractBestFlipkartPrice(priceCandidates);
        }
      }
    } catch (e) {}
  }

  if (!price || !title) {
    try {
      const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      let sm;
      while ((sm = scriptRe.exec(html)) !== null) {
        const block = sm[1];
        if (!block.includes('__INITIAL_STATE__')) continue;
        let state = null;
        const ea = block.match(/window\.__INITIAL_STATE__\s*=\s*JSON\.parse\("((?:[^"\\]|\\.)*)"\)/);
        if (ea) { try { state = JSON.parse(JSON.parse(`"${ea[1]}"`)); } catch {} }
        if (!state) {
          const eb = block.match(/window\.__INITIAL_STATE__\s*=\s*JSON\.parse\('((?:[^'\\]|\\.)*)'\)/);
          if (eb) { try { state = JSON.parse(eb[1]); } catch {} }
        }
        if (!state) {
          const idx  = block.indexOf('__INITIAL_STATE__');
          const open = idx !== -1 ? block.indexOf('{', idx) : -1;
          if (open !== -1) {
            let d = 0, inStr = false, esc = false, end = open;
            for (let i = open; i < Math.min(block.length, open + 3_000_000); i++) {
              const c = block[i];
              if (esc)              { esc = false; continue; }
              if (c === '\\' && inStr){ esc = true;  continue; }
              if (c === '"')         { inStr = !inStr; continue; }
              if (!inStr) {
                if (c === '{') d++;
                else if (c === '}') { if (--d === 0) { end = i; break; } }
              }
            }
            if (end > open) { try { state = JSON.parse(block.slice(open, end + 1)); } catch {} }
          }
        }
        if (state) {
          if (!price) {
            const priceCandidates = deepFindAll(state, ['specialPrice', 'finalPrice', 'sellingPrice', 'finalSellingPrice', 'discountedPrice', 'price', 'mrpPrice', 'basePrice', 'listingPrice']);
            price = extractBestFlipkartPrice(priceCandidates);
          }
          if (!title) {
            const titleCandidates = deepFindAll(state, ['title', 'name', 'productName', 'displayName', 'productTitle']);
            let bestScore = -1;
            for (const t of titleCandidates) {
              if (typeof t === 'string' && t.length > 3) {
                const score = slugKws.length > 0 ? slugKws.reduce((acc, kw) => acc + (t.toLowerCase().includes(kw) ? 1 : 0), 0) : 1;
                if (score > bestScore) { bestScore = score; title = t; }
              }
            }
            if (slugKws.length > 0 && bestScore === 0) title = '';
          }
          break;
        }
      }
    } catch (e) {}
  }

  if (!title) {
    title =
      html.match(/<span[^>]+class=["'][^"']*B_NuCI[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() ||
      html.match(/<h1[^>]*class=["'][^"']*VU-ZEg[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() ||
      html.match(/<h1[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]
        ?.replace(/<[^>]+>/g, '').trim() ||
      extractOG(html, 'title') ||
      '';
  }

  if (!price) {
    for (const pat of [
      /class=["'][^"']*(?:Nx9b7S|hl05eU|nsg5x8|_30jeq3|CxhGGd|yRaY8j)[^"']*["'][^>]*>₹\s*([\d,]+)/i,
      /"finalPrice"\s*:\s*([\d]+)/,
      /"sellingPrice"\s*:\s*"?([\d,]+)/,
      /"mrpPrice"\s*:\s*([\d]+)/,
      /"finalSellingPrice"\s*:\s*([\d]+)/,
    ]) {
      const m = html.match(pat);
      if (m) { 
        const v = parsePrice(m[1]); 
        if (v > 90 && v !== 999) { price = v; break; } 
      }
    }
  }

  if (!price) {
      const m = html.match(/₹\s*([\d]{2,}(?:,[\d]{2,3})*)/);
      if (m) { 
        const v = parsePrice(m[1]); 
        if (v > 90 && v !== 999) { price = v; } 
      }
  }

  if (price === 0 && /sold\s*out|currently\s+unavailable|out\s+of\s+stock/i.test(html))
    throw new Error('Product is currently out of stock on Flipkart.');

  let image = ld?.image ? (Array.isArray(ld.image) ? ld.image[0] : ld.image) : '';
  if (!image) {
    const imgMatch = html.match(/<img[^>]+class=["']_396cs4[^"']*["'][^>]+src=["']([^"']+)["']/i);
    if (imgMatch) image = imgMatch[1];
  }

  return { title: decodeHTML(title), price, image, rawOffers: extractBankOffers(stripped), domain: 'flipkart', asin: null, lowestEver: 0 };
}

async function fetchFlipkartInternalApi(productUrl) {
  const endpoints = [
    `https://1.rome.api.flipkart.com/api/4/page/fetch?url=${encodeURIComponent(
      productUrl.replace(/^https?:\/\/[^/]+/, '')
    )}`,
    `https://www.flipkart.com${new URL(productUrl).pathname}?_format=json`,
  ];
  const headers = {
    'User-Agent':   'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
    'Accept':       'application/json, text/plain, */*',
    'x-user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36 FKUA/0.0.1/0.0.1/Desktop',
    'Referer':      'https://www.flipkart.com/',
    'Origin':       'https://www.flipkart.com',
  };
  for (const apiUrl of endpoints) {
    try {
      const res = await fetch(apiUrl, {
        headers,
        signal: AbortSignal.timeout(18000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      let title = '';
      let price = 0;
      let image = '';
      let rawOffers = [];
      const slugKws = flipkartSlugKeywords(productUrl);
      const titleCandidates = deepFindAll(json, ['title', 'name', 'productName', 'displayName', 'productTitle', 'shortTitle']);
      let bestScore = -1;
      for (const t of titleCandidates) {
        if (typeof t === 'string' && t.length > 3) {
          const score = slugKws.length > 0 ? slugKws.reduce((acc, kw) => acc + (t.toLowerCase().includes(kw) ? 1 : 0), 0) : 1;
          if (score > bestScore) {
            bestScore = score;
            title = t;
          }
        }
      }
      if (slugKws.length > 0 && bestScore === 0) title = ''; 
      
      const priceCandidates = deepFindAll(json, ['specialPrice', 'finalPrice', 'sellingPrice', 'finalSellingPrice', 'discountedPrice', 'price', 'mrpPrice', 'basePrice', 'listingPrice']);
      price = extractBestFlipkartPrice(priceCandidates);

      const img = deepFind(json, ['imageUrl', 'imageURL', 'image', 'primaryImageUrl', 'src']);
      if (img && typeof img === 'string' && img.startsWith('http')) image = img;
      
      const offerTexts = deepFindAll(json, ['title', 'description', 'offerText']);
      for (const text of offerTexts) {
          if (text && typeof text === 'string' && text.length > 10) rawOffers.push(text);
      }
      const jsonStr = JSON.stringify(json);
      const extraOffers = extractBankOffers(jsonStr.replace(/\\n/g, ' ').replace(/\\"/g, '"'));
      rawOffers = [...new Set([...rawOffers, ...extraOffers])];

      if (price > 90 && title && title.length > 3) {
        return { title: decodeHTML(title), price, image, rawOffers, domain: 'flipkart', asin: null, lowestEver: 0 };
      }
    } catch (e) {}
  }
  return null;
}

function parseFromText(text, productUrl) {
  const lines = text.split('\n');
  const slugKws = productUrl ? flipkartSlugKeywords(productUrl) : [];

  const isNavLine = (s) =>
    /^(home|login|cart|wishlist|become a seller|notifications|more|offers|gift cards|help)/i.test(s) ||
    /^(men|women|kids|electronics|fashion|mobiles|computers|appliances|sports)/i.test(s) ||
    /^back\s*$|^skip\s*$|^continue\s*$/i.test(s) ||
    /^\[?(search|menu|navigation|breadcrumb|category)/i.test(s);

  const scoreLine = (s) => {
    if (!slugKws.length) return 1;
    const lower = s.toLowerCase();
    let hits = 0;
    for (const kw of slugKws) if (lower.includes(kw)) hits++;
    return hits;
  };

  let title = '';
  const titleMeta = text.match(/^Title:\s+(.+)$/im);
  if (titleMeta?.[1]?.trim().length > 5) {
    const candidate = titleMeta[1].trim();
    if (!isNavLine(candidate)) title = candidate;
  }

  if (!title) {
    let bestScore = -1;
    for (const line of lines) {
      const m = line.match(/^#{1,2}\s+(.{10,280})/);
      if (!m) continue;
      const candidate = m[1].replace(/\*\*/g, '').trim();
      if (isNavLine(candidate)) continue;
      const score = scoreLine(candidate);
      if (score > bestScore) {
        bestScore = score;
        title = candidate;
        if (score >= Math.max(2, Math.ceil(slugKws.length * 0.4))) break;
      }
    }
  }

  if (!title) {
    let best = { score: -1, text: '' };
    for (const line of lines.slice(0, 80)) {
      const clean = line
        .replace(/^[#*\->|\s]+/, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*/g, '')
        .trim();
      if (
        clean.length > 15 &&
        clean.length < 300 &&
        !/^https?:/.test(clean) &&
        !/^\d+$/.test(clean) &&
        !/^(Source|URL|Published|By|Category|Brand):/i.test(clean) &&
        !isNavLine(clean)
      ) {
        const score = scoreLine(clean);
        if (score > best.score) {
          best = { score, text: clean };
        }
      }
    }
    if (best.text) title = best.text;
  }

  let price = 0;
  const findLabelledPrice = (pattern) => {
    const m = text.match(pattern);
    if (!m) return 0;
    const p = parsePrice(m[1]);
    return p > 90 && p !== 999 ? p : 0;
  };

  price =
    findLabelledPrice(/(?:selling\s+price|discounted\s+price|final\s+price|current\s+price)[^₹\n]{0,40}₹\s*([\d,]+)/i) ||
    findLabelledPrice(/(?:\bprice\b|\bMRP\b|\bcost\b)[^₹\n]{0,20}₹\s*([\d,]+)/i) ||
    0;

  if (!price) {
    price = findLabelledPrice(/\*\*₹\s*([\d,]+)\*\*/);
  }

  if (!price) {
    const segment = text.slice(0, 3000);
    const foundPrices = [];
    const re = /₹\s*([\d,]+)/g;
    let m;
    while ((m = re.exec(segment)) !== null) {
      const p = parsePrice(m[1]);
      if (p > 90 && p !== 999 && p !== 299 && p !== 199 && p !== 99) foundPrices.push(p);
    }
    if (foundPrices.length) {
      if (foundPrices.length >= 2) {
         price = Math.min(foundPrices[0], foundPrices[1]);
      } else {
         price = foundPrices[0];
      }
    }
  }

  if (!price) {
    price = findLabelledPrice(/(?<!from\s)(?<!starting\s+at\s)₹\s*([\d,]+)(?=\s|$|[^\d,])/i);
  }

  return { title, price, image: '', rawOffers: extractBankOffers(text), domain: 'flipkart', asin: null, lowestEver: 0 };
}
