import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Request, Offer, Transaction, Notification } from '@/lib/models';
import { getUser } from '@/lib/auth';

<<<<<<< Updated upstream
=======
export const runtime = 'nodejs';

function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

async function razorpayRequest(path, options = {}) {
  const config = razorpayConfig();
  if (!config) throw new Error('Payments are not configured yet. Add Razorpay test keys to the server environment.');

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.description || 'Razorpay request failed');
  return body;
}

async function markPaymentCaptured(tx, { paymentId, orderId, signature = '' }) {
  const now = new Date();
  const updated = await Transaction.findOneAndUpdate(
    {
      _id: tx._id,
      status: { $in: ['pending_payment', 'payment_received'] },
    },
    {
      $set: {
        status: 'tracking_pending',
        payment_provider: 'razorpay',
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        payment_at: now,
        tracking_due_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    },
    { new: true },
  );

  if (!updated) return tx;

  await Notification.create([
    {
      user_id: updated.provider_id,
      type: 'action',
      title: 'Payment Secured — Ship Order',
      message: `₹${updated.amount.toLocaleString('en-IN')} held in escrow for "${updated.product_title}". Submit tracking ID within 24h.`,
      tx_id: updated._id.toString(),
    },
    {
      user_id: updated.buyer_id,
      type: 'info',
      title: 'Payment Confirmed',
      message: `₹${updated.amount.toLocaleString('en-IN')} secured in escrow for "${updated.product_title}". Provider has 24h to ship.`,
      tx_id: updated._id.toString(),
    },
  ]);

  return updated;
}

>>>>>>> Stashed changes
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const txs = await Transaction.find({
      $or: [{ buyer_id: userId }, { provider_id: userId }],
    }).sort({ createdAt: -1 }).limit(50).lean();

    return NextResponse.json({ data: (txs || []).map(t => ({ ...t, id: t._id.toString(), _id: undefined })) });
  } catch (err) {
    console.error('[payment GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { request_id, offer_id } = await req.json();
    if (!request_id || !offer_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const [requestDoc, offerDoc, providerDoc] = await Promise.all([
      Request.findById(request_id).lean(),
      Offer.findById(offer_id).lean(),
      User.findById(user.id).lean(),
    ]);
    if (!requestDoc) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (!offerDoc)   return NextResponse.json({ error: 'Offer not found'   }, { status: 404 });

    const buyerDoc = await User.findById(requestDoc.user_id).lean();
    const amount = Number(requestDoc.amount);

    let actualDiscountAmount = requestDoc.best_card_info?.discount_amount || 0;
    let bestCardForDiscount = requestDoc.best_card_info || null;

    if (!actualDiscountAmount && requestDoc.product_link && amount) {
      try {
        const crawlerRes = await fetch(new URL('/api/crawler/extract-product', req.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productUrl: requestDoc.product_link }),
        });

        if (crawlerRes.ok) {
          const crawlerData = await crawlerRes.json();
          if (crawlerData.success && crawlerData.best_card) {
            actualDiscountAmount = crawlerData.best_card.discount_amount || Math.round(amount * 0.05);
            bestCardForDiscount = {
              bank: crawlerData.best_card.bank,
              card_name: crawlerData.best_card.card_name || crawlerData.best_card.cardName || null,
              discount_amount: actualDiscountAmount,
              source: crawlerData.best_card.source || 'estimated',
            };

            await Request.findByIdAndUpdate(request_id, {
              best_card_info: bestCardForDiscount,
            });
          }
        }
      } catch (e) {
        console.error('[Payment] Extract-product crawler failed:', e);
      }
    }

    if (!actualDiscountAmount) {
      actualDiscountAmount = Math.round(amount * 0.05);
    }

    const customerSavings = Math.round(actualDiscountAmount * 0.50);
    const providerEarning = Math.round(actualDiscountAmount * 0.35);
    const platformCommission = Math.round(actualDiscountAmount * 0.15);

    const tx = await Transaction.create({
      request_id:    requestDoc._id,
      offer_id:      offerDoc._id,
      buyer_id:      requestDoc.user_id,
      provider_id:   user.id,
      buyer_name:    buyerDoc?.fullName  || 'Buyer',
      provider_name: providerDoc?.fullName || 'Provider',
      amount,
      product_title: requestDoc.title,
      product_link:  requestDoc.product_link || '',
      category:      requestDoc.category     || '',
      card_discount_amount: actualDiscountAmount,
      customer_savings: customerSavings,
      provider_earning: providerEarning,
      platform_commission: platformCommission,
      discount_source: bestCardForDiscount?.source || 'estimated',
      status:        'pending_payment',
    });

    await Notification.create({
      user_id: requestDoc.user_id,
      type:    'payment',
      title:   'Offer Received — Pay Now',
      message: `${providerDoc?.fullName || 'A provider'} matched "${requestDoc.title}". Pay ₹${amount.toLocaleString('en-IN')} to secure order.`,
      tx_id:   tx._id.toString(),
    });

    await Request.findByIdAndUpdate(request_id, { status: 'matched' });

    return NextResponse.json({ data: { ...tx.toObject(), id: tx._id.toString() } }, { status: 201 });
  } catch (err) {
    console.error('[payment POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tx_id, upi_ref } = await req.json();
    if (!tx_id) return NextResponse.json({ error: 'tx_id required' }, { status: 400 });

    const tx = await Transaction.findById(tx_id);
    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    if (tx.status !== 'pending_payment')
      return NextResponse.json({ error: 'Already paid or invalid status' }, { status: 409 });

    const now = new Date();
    const trackingDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    tx.status          = 'tracking_pending';
    tx.upi_ref         = upi_ref || `UPI${Date.now()}`;
    tx.payment_at      = now;
    tx.tracking_due_at = trackingDue;
    await tx.save();

    await Notification.create({
      user_id: tx.provider_id,
      type:    'action',
      title:   '🚀 Payment Secured — Place the Order Now',
      message: `Payment of ₹${tx.amount.toLocaleString('en-IN')} for "${tx.product_title}" is held in escrow. Submit the tracking ID within 24 hours or the payment will be refunded.`,
      tx_id:   tx._id.toString(),
    });

    await Notification.create({
      user_id: tx.buyer_id,
      type:    'info',
      title:   '✅ Payment Confirmed',
      message: `Your payment of ₹${tx.amount.toLocaleString('en-IN')} is secured in escrow. The provider has 24 hours to place your order and provide a tracking ID.`,
      tx_id:   tx._id.toString(),
    });

    return NextResponse.json({ data: { ...tx.toObject(), id: tx._id.toString() } });
  } catch (err) {
    console.error('[payment PUT]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
