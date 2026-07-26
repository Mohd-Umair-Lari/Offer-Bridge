/**
 * LLM Service to evaluate scraped bank offers and determine the single best discount.
 * Supports Groq, Gemini, and OpenAI API keys, with local regex fallback.
 */

const SYSTEM_PROMPT = `You are a financial offer parser. You are given an e-commerce product price and a list of raw credit card/bank offer descriptions scraped from the product page.
Your goal is to parse these offers, perform the mathematical calculations, and determine the single best discount available.

Rules to evaluate:
1. Parse percentage-based discounts (e.g., '10% Instant Discount') and calculate the exact rupee savings based on the original price.
2. Check for maximum discount caps mentioned in the text (e.g., '10% up to INR 1,500' or 'Max discount INR 1000'). If the calculated percentage discount exceeds the cap, apply the cap.
3. Check for minimum transaction amounts (e.g., 'on minimum purchase of INR 5,000'). If the original price is below the required minimum, that offer cannot be used (savings is 0).
4. Parse flat discounts (e.g., 'Flat INR 1,500 off').
5. Analyze which bank (e.g., HDFC, ICICI, SBI, AXIS, Kotak, Federal, BOB, IDFC, RBL, HSBC, IndusInd, Amex, OneCard) and card type (Credit Card, Debit Card, EMI) gives the highest overall absolute discount in Indian Rupees.
6. Compare all valid offers and select the single offer that yields the MAXIMUM absolute discount.
7. If no offers apply or the list is empty, return a discount of 0.

You must return a STRICT JSON object representing the single best offer. Do not include any markdown formatting, code block markers, or extra text. Return ONLY the JSON object.

JSON Format:
{
  "bestOfferBank": "HDFC",
  "discountAmount": 1500,
  "finalPriceAfterDiscount": 33500,
  "offerDescription": "Flat INR 1500 Off on HDFC Credit Card"
}`;

/**
 * Pre-process and clean up raw scraped offer strings before feeding into LLM/regex
 */
function cleanOffers(rawOffers = []) {
  if (!Array.isArray(rawOffers)) return [];
  const cleaned = [];
  const seen = new Set();

  for (let offer of rawOffers) {
    if (typeof offer !== 'string') continue;
    
    // Strip markdown links [text](url) -> text
    let str = offer.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // Normalize currency symbols
    str = str.replace(/[₹]|Rs\.?|INR/gi, 'INR');
    // Collapse excess whitespace/newlines
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

/**
 * Calls Gemini API using fetch REST request
 */
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

/**
 * Calls OpenAI API using fetch REST request
 */
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

/**
 * Clean up potential markdown formatting from JSON string
 */
function cleanJsonResponse(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  return cleaned;
}

/**
 * Main evaluation function
 */
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
      console.log('[LLM Service] Using Groq (llama3-8b-8192) for offer evaluation');
      rawJsonText = await callGroq(groqKey, price, processedOffers);
    } else if (geminiKey) {
      console.log('[LLM Service] Using Gemini API for offer evaluation');
      rawJsonText = await callGemini(geminiKey, price, processedOffers);
    } else if (openAIKey) {
      console.log('[LLM Service] Using OpenAI API for offer evaluation');
      rawJsonText = await callOpenAI(openAIKey, price, processedOffers);
    } else {
      console.warn('[LLM Service] No LLM API Key found. Running local regex parser.');
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
    console.error('[LLM Service Error] Failed to parse offers using LLM:', error.message);
    return parseOffersLocally(price, processedOffers);
  }
}

/**
 * A regex-based local fallback parser when LLM key is unavailable or fails.
 */
function parseOffersLocally(price, rawOffers) {
  console.log('[LLM Fallback] Running local heuristic parsing of offers');
  
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
    let bank = '';
    for (const b of BANK_RULES) {
      if (b.pattern.test(offer)) { bank = b.name; break; }
    }
    
    if (!bank) continue;

    // Check minimum transaction values if any
    let minPurchase = 0;
    const minMatch = offer.match(/min(?:imum)?\s+(?:purchase|tx|txn|spend|order)?\s*(?:value|of|amt)?\s*(?:INR|\$)?\s*([\d,]+)/i);
    if (minMatch) {
      minPurchase = parseInt(minMatch[1].replace(/,/g, ''), 10);
    }
    if (minPurchase && price < minPurchase) {
      continue; // Skip because purchase amount is below minimum
    }

    let discount = 0;
    
    // 1. Check flat discount amounts
    const flatMatch = offer.match(/(?:flat|discount\s+of|off\s+up\s+to|save|INR)\s*([\d,]+)\s*(?:off|instant|cashback)/i) || 
                       offer.match(/(?:INR)?\s*([\d,]+)\s*(?:off|instant\s+discount)/i);
    if (flatMatch) {
      discount = parseInt(flatMatch[1].replace(/,/g, ''), 10);
    }

    // 2. Check percentage discounts
    const percentMatch = offer.match(/(\d+)%\s*(?:instant|discount|off|cashback)/i);
    if (percentMatch) {
      const pct = parseInt(percentMatch[1], 10);
      let calculated = Math.round(price * (pct / 100));
      
      const capMatch = offer.match(/(?:up\s+to|max(?:imum)?)?\s*(?:INR)?\s*([\d,]+)\s*(?:max|limit|cap|off)?/i);
      if (capMatch) {
        const cap = parseInt(capMatch[1].replace(/,/g, ''), 10);
        if (cap > 0 && calculated > cap) calculated = cap;
      }
      if (calculated > discount) discount = calculated;
    }

    if (discount > 0 && discount < price && discount > bestOffer.discountAmount) {
      bestOffer = {
        bestOfferBank: bank,
        discountAmount: discount,
        finalPriceAfterDiscount: Math.max(0, price - discount),
        offerDescription: offer.substring(0, 120),
      };
    }
  }

  return bestOffer;
}
