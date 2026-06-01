/**
 * LLM Service to evaluate scraped bank offers and determine the single best discount.
 * Supports both Gemini API and OpenAI API keys.
 */

const SYSTEM_PROMPT = `You are a financial offer parser. You are given an e-commerce product price and a list of raw credit card/bank offer descriptions scraped from the product page.
Your goal is to parse these offers, perform the mathematical calculations, and determine the single best discount available.

Rules to evaluate:
1. Parse percentage-based discounts (e.g., '10% Instant Discount') and calculate the exact rupee savings based on the original price.
2. Check for maximum discount caps mentioned in the text (e.g., '10% up to INR 1,500' or 'Max discount INR 1000'). If the calculated percentage discount exceeds the cap, apply the cap.
3. Check for minimum transaction amounts (e.g., 'on minimum purchase of INR 5,000'). If the original price is below the required minimum, that offer cannot be used (savings is 0).
4. Parse flat discounts (e.g., 'Flat INR 1,500 off').
5. Analyze which bank (e.g., HDFC, ICICI, SBI, AXIS) and card type (Credit Card, Debit Card, EMI) gives the highest overall absolute discount in Indian Rupees.
6. Compare all valid offers and select the single offer that yields the MAXIMUM absolute discount.
7. If no offers apply or the list is empty, return a discount of 0.

You must return a STRICT JSON object representing the single best offer. Do not include any markdown formatting, code block markers, or extra text. Return ONLY the JSON object.

JSON Format:
{
  "bestOfferBank": "HDFC", // Name of the bank or card issuer (e.g., HDFC, ICICI, SBI, AXIS) in uppercase. If no offer applies, empty string "".
  "discountAmount": 1500, // The numerical discount value in INR. Integer only. If no offer, 0.
  "finalPriceAfterDiscount": 33500, // Original price minus the discountAmount. Integer only.
  "offerDescription": "Flat INR 1500 Off on HDFC Credit Card" // A clear, concise summary of the selected card's offer. If no offer, "No card discount available".
}`;

/**
 * Calls Gemini API using fetch REST request
 */
async function callGemini(apiKey, price, rawOffers) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const promptText = `
Product Original Price: INR ${price}
Available Offer Strings:
${JSON.stringify(rawOffers, null, 2)}

Select the single best offer using the system rules.
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  return text;
}

/**
 * Calls OpenAI API using fetch REST request
 */
async function callOpenAI(apiKey, price, rawOffers) {
  const url = 'https://api.openai.com/v1/chat/completions';

  const promptText = `
Product Original Price: INR ${price}
Available Offer Strings:
${JSON.stringify(rawOffers, null, 2)}

Select the single best offer using the system rules.
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
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
  if (!text) {
    throw new Error('Empty response from OpenAI API');
  }

  return text;
}

/**
 * Clean up potential markdown formatting from JSON string
 */
function cleanJsonResponse(rawText) {
  let cleaned = rawText.trim();
  // Strip ```json ... ``` blocks if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  }
  return cleaned;
}

/**
 * Main evaluation function
 */
export async function evaluateBestOffer(price, rawOffers) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  // Fallback default response if no keys configured or no offers present
  const defaultNoOfferResponse = {
    bestOfferBank: '',
    discountAmount: 0,
    finalPriceAfterDiscount: price,
    offerDescription: 'No card discount available',
  };

  if (!rawOffers || rawOffers.length === 0) {
    return defaultNoOfferResponse;
  }

  let rawJsonText = '';
  try {
    if (geminiKey) {
      console.log('[LLM Service] Using Gemini API for offer evaluation');
      rawJsonText = await callGemini(geminiKey, price, rawOffers);
    } else if (openAIKey) {
      console.log('[LLM Service] Using OpenAI API for offer evaluation');
      rawJsonText = await callOpenAI(openAIKey, price, rawOffers);
    } else {
      console.warn('[LLM Service] No LLM API Key found in env. Applying a rule-based mock parser for testing.');
      // Rule-based basic parsing as absolute fallback
      return parseOffersLocally(price, rawOffers);
    }

    const cleanJson = cleanJsonResponse(rawJsonText);
    const result = JSON.parse(cleanJson);

    // Validate structure and fill default values
    return {
      bestOfferBank: result.bestOfferBank || '',
      discountAmount: typeof result.discountAmount === 'number' ? result.discountAmount : 0,
      finalPriceAfterDiscount: typeof result.finalPriceAfterDiscount === 'number' 
        ? result.finalPriceAfterDiscount 
        : price - (result.discountAmount || 0),
      offerDescription: result.offerDescription || 'Card offer applied',
    };
  } catch (error) {
    console.error('[LLM Service Error] Failed to parse offers using LLM:', error.message);
    return parseOffersLocally(price, rawOffers);
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

  for (const offer of rawOffers) {
    const uppercaseOffer = offer.toUpperCase();
    
    // Identify Bank
    let bank = '';
    if (uppercaseOffer.includes('HDFC')) bank = 'HDFC';
    else if (uppercaseOffer.includes('ICICI')) bank = 'ICICI';
    else if (uppercaseOffer.includes('SBI')) bank = 'SBI';
    else if (uppercaseOffer.includes('AXIS')) bank = 'AXIS';
    else if (uppercaseOffer.includes('KOTAK')) bank = 'KOTAK';
    else if (uppercaseOffer.includes('FEDERAL')) bank = 'FEDERAL';
    else if (uppercaseOffer.includes('IDFC')) bank = 'IDFC';
    else if (uppercaseOffer.includes('RBL')) bank = 'RBL';
    else if (uppercaseOffer.includes('HSBC')) bank = 'HSBC';
    else if (uppercaseOffer.includes('BOB')) bank = 'BOB';
    
    if (!bank) continue;

    // Check minimum transaction values if any
    let minPurchase = 0;
    const minMatch = offer.match(/min(?:imum)?\s+(?:purchase|tx|txn)?\s*(?:value|of|amt)?\s*(?:rs\.?|inr)?\s*([\d,]+)/i);
    if (minMatch) {
      minPurchase = parseInt(minMatch[1].replace(/,/g, ''), 10);
    }
    if (minPurchase && price < minPurchase) {
      continue; // Skip because purchase amount is below minimum
    }

    // Try to extract discount amount
    let discount = 0;
    
    // 1. Check for flat discount amounts (e.g. "Flat 1500 off", "discount of 1000")
    const flatMatch = offer.match(/(?:flat|discount\s+of|off\s+up\s+to|save|rs\.?|inr)\s*([\d,]+)\s*(?:off|instant|cashback)/i) || 
                       offer.match(/(?:rs\.?|inr)?\s*([\d,]+)\s*(?:off|instant\s+discount)/i);
    if (flatMatch) {
      discount = parseInt(flatMatch[1].replace(/,/g, ''), 10);
    }

    // 2. Check for percentage discounts (e.g. "10% off")
    const percentMatch = offer.match(/(\d+)%\s*(?:instant|discount|off|cashback)/i);
    if (percentMatch) {
      const pct = parseInt(percentMatch[1], 10);
      let calculated = Math.round(price * (pct / 100));
      
      // Look for a cap (e.g. "up to Rs. 1500")
      const capMatch = offer.match(/(?:up\s+to|max(?:imum)?)?\s*(?:rs\.?|inr)?\s*([\d,]+)\s*(?:max|limit|cap|off)?/i);
      let cap = 0;
      if (capMatch) {
        cap = parseInt(capMatch[1].replace(/,/g, ''), 10);
      }
      if (cap && calculated > cap) {
        calculated = cap;
      }
      if (calculated > discount) {
        discount = calculated;
      }
    }

    if (discount > bestOffer.discountAmount) {
      bestOffer = {
        bestOfferBank: bank,
        discountAmount: discount,
        finalPriceAfterDiscount: price - discount,
        offerDescription: offer.substring(0, 100),
      };
    }
  }

  return bestOffer;
}
