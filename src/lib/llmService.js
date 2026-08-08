const SYSTEM_PROMPT = `You are a financial offer parser. You are given an e-commerce product price and a list of raw credit card/bank offer descriptions scraped from the product page.
Your goal is to parse these offers, perform the mathematical calculations, and determine the single best discount available.

Rules to evaluate:
1. Identify if the best discount is a percentage (e.g., '10% Instant Discount') or a flat amount (e.g., 'Flat INR 1500 off').
2. Check for maximum discount caps/'up to' conditions (e.g., '10% up to INR 1,500' or 'Max discount INR 1000').
3. Check for minimum transaction amounts. If the original price is below the required minimum, that offer cannot be used (savings is 0).
4. Analyze which bank gives the highest overall absolute discount in Indian Rupees.
5. Compare all valid offers and select the single offer that yields the MAXIMUM absolute discount.
6. The 'offerDescription' field is VERY IMPORTANT. If the best offer is percentage-based, 'offerDescription' MUST clearly state the percentage and the 'up to' limit if present (e.g., '10% off up to INR 1500 on HDFC Credit Card'). If the best offer is a flat exact amount, state the exact amount and the 'up to' condition if present (e.g., 'Flat INR 1500 off on HDFC Credit Card'). DO NOT just return the calculated amount. Return the exact terms (percentage/flat amount) and the 'up to' condition as mentioned in the original offer.
7. If no offers apply, return a discount of 0.
8. Ignore exchange/trade-in offers. Only consider Credit Card, Debit Card, EMI, and Net Banking offers.

You must return a STRICT JSON object representing the single best offer. Return ONLY the JSON object without markdown formatting.

JSON Format:
{
  "bestOfferBank": "HDFC",
  "discountAmount": 1500,
  "finalPriceAfterDiscount": 33500,
  "offerDescription": "10% off up to INR 1500 on HDFC Credit Card"
}`;

function cleanOffers(rawOffers = []) {
  if (!Array.isArray(rawOffers)) return [];
  const cleaned = [];
  const seen = new Set();
  for (let offer of rawOffers) {
    if (typeof offer !== 'string') continue;
    if (/exchange|trade\s*in|old\s+phone|old\s+device/i.test(offer)) continue;
    let str = offer.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    str = str.replace(/₹/g, 'INR ');
    str = str.replace(/\bRs\.?(?=\s|\d)/gi, 'INR ');
    str = str.replace(/\s+/g, ' ').trim();
    if (str.length < 10) continue;
    const key = str.toLowerCase().slice(0, 70);
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(str);
    }
  }
  return cleaned.slice(0, 15);
}

async function callGroq(apiKey, price, rawOffers) {
  const promptText = `Product Original Price: INR ${price}\nAvailable Offer Strings:\n${JSON.stringify(rawOffers, null, 2)}\n\nSelect the single best offer using the system rules.`;
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: promptText },
      ],
      temperature: 0.1,
      max_tokens: 256,
      response_format: { type: 'json_object' },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API Error: Status ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from Groq API');
  return text;
}

async function callGemini(apiKey, price, rawOffers) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const promptText = `Product Original Price: INR ${price}\nAvailable Offer Strings:\n${JSON.stringify(rawOffers, null, 2)}\n\nSelect the single best offer using the system rules.`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT + '\n\n' + promptText }]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      }
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: Status ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini API');
  return text;
}

async function callOpenAI(apiKey, price, rawOffers) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const promptText = `Product Original Price: INR ${price}\nAvailable Offer Strings:\n${JSON.stringify(rawOffers, null, 2)}\n\nSelect the single best offer using the system rules.`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: promptText }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API Error: Status ${response.status} - ${errorText}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI API');
  return text;
}

function cleanJsonResponse(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  return cleaned;
}

export async function evaluateBestOffer(price, rawOffers) {
  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  const defaultNoOfferResponse = {
    bestOfferBank: '',
    discountAmount: 0,
    finalPriceAfterDiscount: price,
    offerDescription: 'No card discount available',
  };
  const processedOffers = cleanOffers(rawOffers);
  if (!processedOffers || processedOffers.length === 0) {
    return defaultNoOfferResponse;
  }
  let rawJsonText = '';
  try {
    if (groqKey) {
      rawJsonText = await callGroq(groqKey, price, processedOffers);
    } else if (geminiKey) {
      rawJsonText = await callGemini(geminiKey, price, processedOffers);
    } else if (openAIKey) {
      rawJsonText = await callOpenAI(openAIKey, price, processedOffers);
    } else {
      return parseOffersLocally(price, processedOffers);
    }
    const cleanJson = cleanJsonResponse(rawJsonText);
    const result = JSON.parse(cleanJson);
    const discountAmount = Math.max(0, Math.min(price, typeof result.discountAmount === 'number' ? result.discountAmount : 0));
    return {
      bestOfferBank: result.bestOfferBank || '',
      discountAmount,
      finalPriceAfterDiscount: Math.max(0, price - discountAmount),
      offerDescription: result.offerDescription || 'Card offer applied',
    };
  } catch (error) {
    return parseOffersLocally(price, processedOffers);
  }
}

function parseOffersLocally(price, rawOffers) {
  let bestOffer = {
    bestOfferBank: '',
    discountAmount: 0,
    finalPriceAfterDiscount: price,
    offerDescription: 'No card discount available',
  };
  const BANK_RULES = [
    { name: 'HDFC', pattern: /\b(HDFC|HDFC Bank)\b/i },
    { name: 'ICICI', pattern: /\b(ICICI|ICICI Bank)\b/i },
    { name: 'SBI Card', pattern: /\b(SBI|State Bank of India|SBI Card)\b/i },
    { name: 'Axis Bank', pattern: /\b(AXIS|Axis Bank)\b/i },
    { name: 'Kotak Mahindra', pattern: /\b(KOTAK|Kotak Mahindra)\b/i },
    { name: 'Federal Bank', pattern: /\b(FEDERAL|Federal Bank)\b/i },
    { name: 'IDFC FIRST', pattern: /\b(IDFC|IDFC First)\b/i },
    { name: 'RBL Bank', pattern: /\b(RBL|RBL Bank)\b/i },
    { name: 'HSBC', pattern: /\bHSBC\b/i },
    { name: 'BOB', pattern: /\b(BOB|Bank of Baroda)\b/i },
    { name: 'IndusInd', pattern: /\bIndusInd\b/i },
    { name: 'AU Small Finance', pattern: /\b(AU|AU Bank|AU Small Finance)\b/i },
    { name: 'OneCard', pattern: /\bOneCard\b/i },
    { name: 'Yes Bank', pattern: /\bYes Bank\b/i },
    { name: 'Amex', pattern: /\b(Amex|American Express)\b/i },
    { name: 'Citi', pattern: /\b(Citi|Citibank)\b/i },
  ];
  for (const offer of rawOffers) {
    if (/exchange|trade\s*in|old\s+phone|old\s+device/i.test(offer)) continue;
    let bank = '';
    for (const b of BANK_RULES) {
      if (b.pattern.test(offer)) { bank = b.name; break; }
    }
    if (!bank) continue;
    let minPurchase = 0;
    const minMatch = offer.match(/min(?:imum)?\s+(?:purchase|tx|txn|spend|order)?\s*(?:value|of|amt)?\s*(?:INR|\$)?\s*([\d,]+(?:\.\d+)?)/i);
    if (minMatch) {
      minPurchase = Math.floor(parseFloat(minMatch[1].replace(/,/g, '')));
    }
    if (minPurchase && price < minPurchase) continue;
    let discount = 0;
    let offerDesc = offer.substring(0, 150);
    
    const flatRe1 = /(?:flat|discount\s+of|off\s+up\s+to|save|INR)\s*([\d,]+(?:\.\d+)?)\s*(?:off|instant|cashback|discount)/gi;
    let m;
    while ((m = flatRe1.exec(offer)) !== null) {
      const val = Math.floor(parseFloat(m[1].replace(/,/g, '')));
      if (val > discount) discount = val;
    }
    
    const flatRe2 = /(?:INR)?\s*([\d,]+(?:\.\d+)?)\s*(?:off|instant\s+discount|discount|cashback)/gi;
    while ((m = flatRe2.exec(offer)) !== null) {
      const val = Math.floor(parseFloat(m[1].replace(/,/g, '')));
      if (val > discount) discount = val;
    }

    const percentRe = /(\d+)%\s*(?:instant|discount|off|cashback)/gi;
    while ((m = percentRe.exec(offer)) !== null) {
      const pct = parseInt(m[1], 10);
      let calculated = Math.floor(price * (pct / 100));
      const capMatch = offer.match(/(?:up\s+to|max(?:imum)?)?\s*(?:INR)?\s*([\d,]+(?:\.\d+)?)\s*(?:max|limit|cap|off|discount|cashback)?/i);
      if (capMatch) {
        const cap = Math.floor(parseFloat(capMatch[1].replace(/,/g, '')));
        if (cap > 0 && calculated > cap) calculated = cap;
      }
      if (calculated > discount) discount = calculated;
    }
    if (discount > 0 && discount < price && discount > bestOffer.discountAmount) {
      bestOffer = {
        bestOfferBank: bank,
        discountAmount: discount,
        finalPriceAfterDiscount: Math.max(0, price - discount),
        offerDescription: offerDesc,
      };
    }
  }
  return bestOffer;
}
