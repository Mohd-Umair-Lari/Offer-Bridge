import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Request, Transaction, Notification } from '@/lib/models';
import { getUser } from '@/lib/auth';

export async function POST(req) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tx_id, tracking_id, courier } = await req.json();
    if (!tx_id || !tracking_id) return NextResponse.json({ error: 'tx_id and tracking_id required' }, { status: 400 });

    const tx = await Transaction.findById(tx_id);
    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    if (tx.status !== 'tracking_pending' && tx.status !== 'payment_received')
      return NextResponse.json({ error: 'Cannot submit tracking at this stage' }, { status: 409 });

    if (tx.provider_id.toString() !== user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (tx.tracking_due_at && new Date() > new Date(tx.tracking_due_at))
      return NextResponse.json({ error: 'Tracking deadline passed — payment was refunded' }, { status: 410 });

    tx.tracking_id  = tracking_id;
    tx.courier      = courier || '';
    tx.status       = 'tracking_submitted';
    tx.completed_at = new Date();
    await tx.save();

    await Request.findByIdAndUpdate(tx.request_id, { status: 'completed' });

    await Notification.create({
      user_id: tx.buyer_id,
      type:    'tracking',
      title:   '📦 Order Placed — Tracking ID Available',
      message: `Your order "${tx.product_title}" has been placed. Tracking: ${tracking_id}${courier ? ' via ' + courier : ''}. The deal is complete!`,
      tx_id:   tx._id.toString(),
    });

    const releasedAmount = tx.amount - (tx.platform_commission || 0);
    await Notification.create({
      user_id: tx.provider_id,
      type:    'info',
      title:   '💸 Payment Released',
      message: `Escrow payment of ₹${releasedAmount.toLocaleString('en-IN')} for "${tx.product_title}" has been released to your account.`,
      tx_id:   tx._id.toString(),
    });

    return NextResponse.json({ data: { ...tx.toObject(), id: tx._id.toString() } });
  } catch (err) {
    console.error('[payment/tracking POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

