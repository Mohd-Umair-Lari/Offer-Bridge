import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { Request, Transaction, Notification } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'gozivo-default-secret-change-me';

function getUser(req) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); }
  catch { return null; }
}

// ── POST /api/payment/tracking  →  provider submits tracking ID
// body: { tx_id, tracking_id, courier }
export async function POST(req) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tx_id, tracking_id, courier } = await req.json();
    if (!tx_id || !tracking_id) return NextResponse.json({ error: 'tx_id and tracking_id required' }, { status: 400 });

    const tx = await Transaction.findById(tx_id);
    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    if (tx.status !== 'tracking_pending')
      return NextResponse.json({ error: 'Cannot submit tracking at this stage' }, { status: 409 });

    // Verify it's the provider
    if (tx.provider_id.toString() !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Check 24h deadline hasn't passed
    if (tx.tracking_due_at && new Date() > new Date(tx.tracking_due_at))
      return NextResponse.json({ error: 'Tracking deadline passed — payment was refunded' }, { status: 410 });

    tx.tracking_id  = tracking_id;
    tx.courier      = courier || '';
    tx.status       = 'tracking_submitted';
    tx.completed_at = new Date();
    await tx.save();


    // Update Request to completed
    await Request.findByIdAndUpdate(tx.request_id, { status: 'completed' });

    // Notify BUYER with tracking info
    await Notification.create({
      user_id: tx.buyer_id,
      type:    'tracking',
      title:   '📦 Order Placed — Tracking ID Available',
      message: `Your order "${tx.product_title}" has been placed. Tracking: ${tracking_id}${courier ? ' via ' + courier : ''}. The deal is complete!`,
      tx_id:   tx._id.toString(),
    });

    // Notify PROVIDER: payment released
    await Notification.create({
      user_id: tx.provider_id,
      type:    'info',
      title:   '💸 Payment Released',
      message: `Escrow payment of ₹${(tx.amount - tx.platform_fee).toLocaleString('en-IN')} for "${tx.product_title}" has been released to your account.`,
      tx_id:   tx._id.toString(),
    });

    return NextResponse.json({ data: { ...tx.toObject(), id: tx._id.toString() } });
  } catch (err) {
    console.error('[payment/tracking POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
