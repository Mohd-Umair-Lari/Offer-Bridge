import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction, Notification } from '@/lib/models';

// ── GET /api/payment/refund-check
// This route is called on a schedule (or on every page load) to auto-refund
// transactions where tracking_due_at has passed and status is still 'tracking_pending'
// In production, call this via a Vercel cron job or on each dashboard load.
export async function GET() {
  try {
    await connectDB();
    const now = new Date();

    // Find all expired tracking_pending transactions
    const expired = await Transaction.find({
      status:          'tracking_pending',
      tracking_due_at: { $lte: now },
    });

    const results = [];
    for (const tx of expired) {
      tx.status      = 'refunded';
      tx.refunded_at = now;
      await tx.save();



      // Notify BUYER: refund issued
      await Notification.create({
        user_id: tx.buyer_id,
        type:    'refund',
        title:   '💰 Payment Refunded',
        message: `The provider did not submit a tracking ID within 24 hours for "${tx.product_title}". Your full payment of ₹${tx.amount.toLocaleString('en-IN')} has been refunded — no deductions.`,
        tx_id:   tx._id.toString(),
      });

      // Notify PROVIDER: penalty notice
      await Notification.create({
        user_id: tx.provider_id,
        type:    'info',
        title:   '⚠️ Order Refunded',
        message: `You failed to submit a tracking ID for "${tx.product_title}" within 24 hours. The payment has been refunded to the buyer.`,
        tx_id:   tx._id.toString(),
      });

      results.push(tx._id.toString());
    }

    return NextResponse.json({ refunded: results.length, ids: results });
  } catch (err) {
    console.error('[payment/refund-check]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
