import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Offer } from '@/lib/models';

const MERCHANT_PROFILES = {
  'amazon': {
    name: 'Amazon',
    base: 5,
    max: 20,
    categories: ['Electronics', 'Fashion & Clothing', 'Home'],
    categoryBonus: { 'Electronics': 3, 'Fashion & Clothing': 2 }
  },
  'flipkart': {
    name: 'Flipkart',
    base: 5,
    max: 15,
    categories: ['Electronics', 'Mobile & Tablets', 'Fashion & Clothing'],
    categoryBonus: { 'Electronics': 2.5, 'Mobile & Tablets': 3 }
  },
  'cred': {
    name: 'CRED',
    base: 3,
    max: 25,
    categories: ['Dining', 'Travel'],
    categoryBonus: { 'Dining': 5, 'Travel': 3 }
  },
  'swiggy': {
    name: 'Swiggy',
    base: 10,
    max: 20,
    categories: ['Dining'],
    categoryBonus: { 'Dining': 10 }
  },
  'bookmyshow': {
    name: 'BookMyShow',
    base: 5,
    max: 15,
    categories: [],
    categoryBonus: {}
  },
  'myntra': {
    name: 'Myntra',
    base: 5,
    max: 20,
    categories: ['Fashion & Clothing'],
    categoryBonus: { 'Fashion & Clothing': 4 }
  },
  'yatra': {
    name: 'Yatra',
    base: 5,
    max: 15,
    categories: ['Travel'],
    categoryBonus: { 'Travel': 3 }
  },
  'makemytrip': {
    name: 'MakeMyTrip',
    base: 5,
    max: 15,
    categories: ['Travel', 'Hotels'],
    categoryBonus: { 'Travel': 4, 'Hotels': 3 }
  },
};

const CARD_BANK_BONUSES = {
  'HDFC': 2,
  'ICICI': 1.5,
  'Axis': 2,
  'SBI': 1,
  'Amex': 3,
  'Mastercard': 0.5,
  'Visa': 0.5,
  'RBL': 1.5,
  'IDFC': 1.5,
  'Kotak': 1.5,
};

const CARD_CATEGORY_BONUSES = {
  'Amex Platinum': { 'Dining': 3, 'Travel': 4 },
  'HDFC Regalia': { 'Travel': 3, 'Dining': 2 },
  'ICICI Travel': { 'Travel': 4 },
  'Axis My Zones': { 'Dining': 3, 'Fuel': 2 },
  'SBI Prime': { 'Dining': 2, 'Shopping': 1 },
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

function calculateCardDiscount(merchant, card, productCategory = '') {
  const merchantData = MERCHANT_PROFILES[merchant] || {
    name: merchant,
    base: 2,
    max: 10,
    categoryBonus: {}
  };

  let discount = merchantData.base;

  const bankKey = Object.keys(CARD_BANK_BONUSES).find(
    b => card.bank?.toUpperCase?.().includes(b.toUpperCase())
  );
  if (bankKey) {
    discount += CARD_BANK_BONUSES[bankKey];
  }

  const categoryBonus = merchantData.categoryBonus[productCategory];
  if (categoryBonus) {
    discount += categoryBonus;
  }

  const cardSpecificBonus = CARD_CATEGORY_BONUSES[card.card_name];
  if (cardSpecificBonus && cardSpecificBonus[productCategory]) {
    discount += cardSpecificBonus[productCategory];
  }

  discount = Math.min(discount, merchantData.max);
  discount = Math.max(Math.round(discount * 2) / 2, 1);

  return discount;
}

async function findBestCard(productUrl, productCategory = '') {
  try {
    await connectDB();

    const allCards = await Offer.find({ status: 'available', verified: true })
      .sort({ rating: -1 })
      .lean();

    if (!allCards.length) {
      return {
        success: false,
        message: 'No active provider cards found',
        best_card: null,
        discount: 0,
        all_options: [],
      };
    }

    const merchant = extractMerchant(productUrl);

    const options = allCards.map(card => {
      const discount = calculateCardDiscount(merchant, card, productCategory);
      return {
        card_id: card._id.toString(),
        card_name: card.card_name,
        bank: card.bank,
        holder_name: card.holder_name,
        rating: card.rating,
        deals_done: card.deals_done,
        discount_percent: discount,
        max_amount: card.max_amount,
        categories: card.categories,
      };
    });

    options.sort((a, b) => b.discount_percent - a.discount_percent);

    const bestCard = options[0];

    return {
      success: true,
      merchant,
      best_card: {
        card_id: bestCard.card_id,
        card_name: bestCard.card_name,
        bank: bestCard.bank,
        holder_name: bestCard.holder_name,
        rating: bestCard.rating,
      },
      best_discount: bestCard.discount_percent,
      top_3_options: options.slice(0, 3),
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[Best Card Crawler] Error:', err);
    return {
      success: false,
      message: 'Crawler failed',
      error: err.message,
    };
  }
}

export async function POST(request) {
  try {
    const { productUrl, productCategory } = await request.json();

    if (!productUrl) {
      return NextResponse.json({ error: 'productUrl required' }, { status: 400 });
    }

    const result = await findBestCard(productUrl, productCategory);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (err) {
    console.error('[Crawler POST]', err);
    return NextResponse.json({ error: 'Server error', details: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productUrl = searchParams.get('url');
    const productCategory = searchParams.get('category') || '';

    if (!productUrl) {
      return NextResponse.json({ error: 'url query param required' }, { status: 400 });
    }

    const result = await findBestCard(productUrl, productCategory);
    return NextResponse.json(result, { status: result.success ? 200 : 404 });
  } catch (err) {
    console.error('[Crawler GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
