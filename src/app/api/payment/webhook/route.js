import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Transaction, Notification, PaymentEvent } from '@/lib/models';

export const runtime = 'nodejs';

function validSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = Buffer.from(signature);
  return received.length === Buffer.byteLength(expected) && crypto.timingSafeEqual(Buffer.from(expected), received);
}

export async function POST(request) {
  const rawBody = await request.text();
  if (!validSignature(rawBody, request.headers.get('x-razorpay-signature'))) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    await connectDB();
    const event = JSON.parse(rawBody);
    const payment = event.payload?.payment?.entity;
    const eventId = request.headers.get('x-razorpay-event-id') || `${event.event}:${payment?.id || event.created_at}`;

    try {
      await PaymentEvent.create({ provider: 'razorpay', event_id: eventId, type: event.event });
    } catch (error) {
      if (error?.code === 11000) return NextResponse.json({ received: true, duplicate: true });
      throw error;
    }

    if (event.event === 'payment.captured' && payment?.order_id && payment?.id) {
      const now = new Date();
      const tx = await Transaction.findOneAndUpdate(
        {
          razorpay_order_id: payment.order_id,
          status: { $in: ['pending_payment', 'payment_received'] },
        },
        {
          $set: {
            status: 'tracking_pending',
            payment_provider: 'razorpay',
            razorpay_payment_id: payment.id,
            payment_at: now,
            tracking_due_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        { new: true },
      );

      if (tx) {
        await Notification.create([
          { user_id: tx.provider_id, type: 'action', title: 'Payment received — place the order', message: `Payment for "${tx.product_title}" was verified. Submit the tracking ID within 24 hours.`, tx_id: tx._id.toString() },
          { user_id: tx.buyer_id, type: 'info', title: 'Payment confirmed', message: `Your payment for "${tx.product_title}" was verified. The provider now has 24 hours to submit tracking details.`, tx_id: tx._id.toString() },
        ]);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[payment webhook]', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
