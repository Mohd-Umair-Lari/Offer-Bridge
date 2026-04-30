import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { User, Request, Offer, Escrow, Transaction, Notification } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'gozivo-default-secret-change-me';
const PLATFORM_FEE_RATE = 0.02; // 2%

function getUser(req) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); }
  catch { return null; }
}

// ── GET /api/payment?userId=xxx  →  all transactions for a user
export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const txs = await Transaction.find({
      $or: [{ buyer_id: userId }, { provider_id: userId }],
    }).sort({ createdAt: -1 }).limit(50).lean();

    return NextResponse.json({ data: txs.map(t => ({ ...t, id: t._id.toString(), _id: undefined })) });
  } catch (err) {
    console.error('[payment GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── POST /api/payment  →  provider clicks "Make an Offer" → initiates transaction
// body: { request_id, offer_id }
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

    const amount       = Number(requestDoc.amount);
    const platform_fee = Math.round(amount * PLATFORM_FEE_RATE);

    // Create Transaction
    const tx = await Transaction.create({
      request_id:    requestDoc._id,
      offer_id:      offerDoc._id,
      buyer_id:      requestDoc.user_id,
      provider_id:   user.id,
      buyer_name:    buyerDoc?.fullName  || 'Buyer',
      provider_name: providerDoc?.fullName || 'Provider',
      amount,
      platform_fee,
      product_title: requestDoc.title,
      product_link:  requestDoc.product_link || '',
      category:      requestDoc.category     || '',
      status:        'pending_payment',
    });

    // Notify the BUYER to pay
    await Notification.create({
      user_id: requestDoc.user_id,
      type:    'payment',
      title:   '💳 Action Required: Complete Payment',
      message: `${providerDoc?.fullName || 'A provider'} made an offer for "${requestDoc.title}". Pay ₹${amount.toLocaleString('en-IN')} to secure your order.`,
      tx_id:   tx._id.toString(),
    });

    // Mark request as matched
    await Request.findByIdAndUpdate(request_id, { status: 'matched' });

    return NextResponse.json({ data: { ...tx.toObject(), id: tx._id.toString() } }, { status: 201 });
  } catch (err) {
    console.error('[payment POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── PUT /api/payment  →  consumer confirms UPI payment
// body: { tx_id, upi_ref }
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
    const trackingDue = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

    // Create Escrow record
    const escrow = await Escrow.create({
      deal_id:    tx._id.toString(),
      buyer:      tx.buyer_name,
      cardholder: tx.provider_name,
      item:       tx.product_title,
      amount:     tx.amount,
      fee:        tx.platform_fee,
      status:     'held',
    });

    // Update transaction
    tx.status          = 'tracking_pending';
    tx.upi_ref         = upi_ref || `UPI${Date.now()}`;
    tx.payment_at      = now;
    tx.tracking_due_at = trackingDue;
    tx.escrow_id       = escrow._id;
    await tx.save();

    // Notify PROVIDER: must submit tracking within 24h
    await Notification.create({
      user_id: tx.provider_id,
      type:    'action',
      title:   '🚀 Payment Secured — Place the Order Now',
      message: `Payment of ₹${tx.amount.toLocaleString('en-IN')} for "${tx.product_title}" is held in escrow. Submit the tracking ID within 24 hours or the payment will be refunded.`,
      tx_id:   tx._id.toString(),
    });

    // Notify BUYER: payment confirmed, waiting for tracking
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
