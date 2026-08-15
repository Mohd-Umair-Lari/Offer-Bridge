import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { connectDB } from '@/lib/mongodb';
import { User, Request, Offer, Transaction, Notification } from '@/lib/models';
import { getUser } from '@/lib/auth';

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

export async function GET(req) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
    if (requestDoc.user_id.toString() === user.id)
      return NextResponse.json({ error: 'You cannot make an offer on your own request' }, { status: 400 });
    if (offerDoc.user_id.toString() !== user.id)
      return NextResponse.json({ error: 'You can only use your own card offer' }, { status: 403 });
    if (requestDoc.status !== 'pending')
      return NextResponse.json({ error: 'This request is no longer available' }, { status: 409 });

    const existingTx = await Transaction.findOne({ request_id, status: { $in: ['pending_payment', 'payment_received', 'tracking_pending', 'tracking_submitted'] } }).lean();
    if (existingTx) return NextResponse.json({ error: 'This request already has an active transaction' }, { status: 409 });

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

    const { action, tx_id, razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();
    if (!tx_id) return NextResponse.json({ error: 'tx_id required' }, { status: 400 });

    const tx = await Transaction.findById(tx_id);
    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

    // ── Provider Action: Withdraw Proposed Offer (Awaiting Buyer Payment) ─────
    if (action === 'withdraw-offer') {
      if (tx.provider_id.toString() !== user.id) return NextResponse.json({ error: 'Forbidden: only the provider can withdraw this offer' }, { status: 403 });
      if (tx.status !== 'pending_payment') {
        return NextResponse.json({ error: 'Cannot withdraw offer: payment has already been secured by the buyer' }, { status: 400 });
      }

      tx.status = 'cancelled';
      await tx.save();

      // Reset the request back to pending so other providers can match it
      if (tx.request_id) {
        await Request.findByIdAndUpdate(tx.request_id, {
          status: 'pending',
          pushed_at: new Date(),
        });
      }

      // Notify the buyer
      await Notification.create({
        user_id: tx.buyer_id,
        type: 'info',
        title: 'Offer Withdrawn',
        message: `${tx.provider_name || 'The cardholder'} withdrew their offer for "${tx.product_title}". Your request is back in the marketplace for new offers.`,
        tx_id: tx._id.toString(),
      });

      // Notify the provider
      await Notification.create({
        user_id: tx.provider_id,
        type: 'info',
        title: 'Offer Withdrawn',
        message: `You successfully withdrew your proposed offer for "${tx.product_title}".`,
        tx_id: tx._id.toString(),
      });

      return NextResponse.json({ success: true, data: { ...tx.toObject(), id: tx._id.toString() } });
    }

    // ── Buyer Actions (create-order, verify-payment) ───────────────────────────
    if (tx.buyer_id.toString() !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'create-order') {
      if (tx.status !== 'pending_payment') return NextResponse.json({ error: 'This payment is no longer available' }, { status: 409 });

      let orderId = tx.razorpay_order_id;
      let orderValid = false;

      // Verify if the cached order exists and matches the active Razorpay credentials
      if (orderId) {
        try {
          const existingOrder = await razorpayRequest(`/orders/${orderId}`);
          if (existingOrder && existingOrder.status === 'created' && Number(existingOrder.amount) === Math.round(Number(tx.amount) * 100)) {
            orderValid = true;
          }
        } catch {
          // If fetching order fails (e.g. key changed between test and live, or order expired), invalidate
          orderValid = false;
        }
      }

      if (!orderValid) {
        const order = await razorpayRequest('/orders', {
          method: 'POST',
          body: JSON.stringify({
            amount: Math.round(Number(tx.amount) * 100),
            currency: 'INR',
            receipt: `ob_${tx._id.toString().slice(-24)}`,
            notes: { transaction_id: tx._id.toString(), buyer_id: user.id },
          }),
        });
        orderId = order.id;
        tx.razorpay_order_id = orderId;
        tx.payment_provider = 'razorpay';
        await tx.save();
      }

      const activeConfig = razorpayConfig();
      return NextResponse.json({
        data: {
          keyId: activeConfig.keyId,
          orderId,
          amount: Math.round(Number(tx.amount) * 100),
          currency: 'INR',
        },
      });
    }

    if (action === 'verify-payment') {
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature)
        return NextResponse.json({ error: 'Missing Razorpay payment details' }, { status: 400 });
      if (tx.razorpay_order_id !== razorpay_order_id)
        return NextResponse.json({ error: 'Payment order does not match this transaction' }, { status: 400 });

      const config = razorpayConfig();
      if (!config) return NextResponse.json({ error: 'Payments are not configured yet' }, { status: 503 });
      const expected = crypto.createHmac('sha256', config.keySecret).update(`${tx.razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
      const receivedSignature = Buffer.from(razorpay_signature);
      if (receivedSignature.length !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(expected), receivedSignature))
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });

      const payment = await razorpayRequest(`/payments/${razorpay_payment_id}`);
      if (payment.order_id !== tx.razorpay_order_id || payment.amount !== Math.round(Number(tx.amount) * 100))
        return NextResponse.json({ error: 'Payment details do not match this transaction' }, { status: 400 });
      if (payment.status !== 'captured')
        return NextResponse.json({ error: 'Payment is not captured yet. Please wait a moment and try again.' }, { status: 409 });

      const updated = await markPaymentCaptured(tx, { paymentId: razorpay_payment_id, orderId: razorpay_order_id, signature: razorpay_signature });
      return NextResponse.json({ data: { ...updated.toObject(), id: updated._id.toString() } });
    }

    return NextResponse.json({ error: 'Invalid payment action' }, { status: 400 });
  } catch (err) {
    console.error('[payment PUT]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
