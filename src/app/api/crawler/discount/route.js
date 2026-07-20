import { NextResponse } from 'next/server';

const MERCHANT_DISCOUNTS = {
  'amazon': { base: 5, max: 20 },
  'flipkart': { base: 5, max: 15 },
  'cred': { base: 3, max: 25 },
  'swiggy': { base: 10, max: 20 },
  'bookmyshow': { base: 5, max: 15 },
  'myntra': { base: 5, max: 20 },
  'yatra': { base: 5, max: 15 },
  'makemytrip': { base: 5, max: 15 },
};

const CARD_BANK_BONUSES = {
  'HDFC': 2,
  'ICICI': 1.5,
  'Axis': 2,
  'SBI': 1,
  'Amex': 3,
  'Mastercard': 0.5,
  'Visa': 0.5,
};

function extractMerchant(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    if (domain.includes('amazon')) return 'amazon';
    if (domain.includes('flipkart')) return 'flipkart';
    if (domain.includes('cred')) return 'cred';
    if (domain.includes('swiggy')) return 'swiggy';
    if (domain.includes('bookmyshow')) return 'bookmyshow';
    if (domain.includes('myntra')) return 'myntra';
    if (domain.includes('yatra')) return 'yatra';
    if (domain.includes('makemytrip') || domain.includes('mmt')) return 'makemytrip';
    
    return 'generic';
  } catch {
    return 'generic';
  }
}

function calculateDiscount(merchant, bank, cardName) {
  // Base discount from merchant
  const merchantData = MERCHANT_DISCOUNTS[merchant] || { base: 2, max: 10 };
  let discount = merchantData.base;
  
  // Bank bonus
  const bankBonus = Object.entries(CARD_BANK_BONUSES).find(
    ([b]) => bank?.toUpperCase?.().includes(b.toUpperCase())
  );
  if (bankBonus) discount += bankBonus[1];
  
  // Cap at merchant max
  discount = Math.min(discount, merchantData.max);
  
  // Round to nearest 0.5%
  discount = Math.round(discount * 2) / 2;
  
  return Math.max(discount, 1); // Minimum 1% discount
}

export async function POST(request) {
  try {
    const { productUrl, bank, cardName } = await request.json();

    if (!productUrl) {
      return NextResponse.json({ error: 'productUrl required' }, { status: 400 });
    }

    const merchant = extractMerchant(productUrl);
    const discount = calculateDiscount(merchant, bank, cardName);

    return NextResponse.json({
      success: true,
      merchant,
      discount_percent: discount,
      breakdown: {
        merchant_base: MERCHANT_DISCOUNTS[merchant]?.base || 2,
        bank_bonus: CARD_BANK_BONUSES[bank?.toUpperCase?.()] || 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Crawler] Error:', err);
    return NextResponse.json({ error: 'Crawler failed' }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const productUrl = searchParams.get('url');
  const bank = searchParams.get('bank');
  const cardName = searchParams.get('card');

  if (!productUrl) {
    return NextResponse.json({ error: 'url query param required' }, { status: 400 });
  }

  const merchant = extractMerchant(productUrl);
  const discount = calculateDiscount(merchant, bank, cardName);

  return NextResponse.json({
    success: true,
    merchant,
    discount_percent: discount,
  });
}
