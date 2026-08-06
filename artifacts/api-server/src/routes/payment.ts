import { Router } from 'express';
import { connectDB } from '../lib/mongodb';
import { Request as RequestModel, Offer, Transaction, User, Notification } from '../lib/models';
import { getUser } from '../lib/authHelpers';

const router = Router();

// GET /api/payment?userId=... — get transactions for user
router.get('/payment', async (req, res) => {
  try {
    await connectDB();
    const { userId } = req.query as Record<string, string>;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const txs = await Transaction.find({ $or: [{ buyer_id: userId }, { provider_id: userId }] }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ data: txs.map((t: any) => ({ ...t, id: t._id.toString(), _id: undefined })) });
  } catch (err) {
    req.log.error({ err }, '[payment GET]');
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/payment — initiate payment / create transaction
router.post('/payment', async (req, res) => {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { request_id, offer_id } = req.body;
    if (!request_id || !offer_id) return res.status(400).json({ error: 'Missing fields' });

    const [requestDoc, offerDoc, providerDoc] = await Promise.all([
      RequestModel.findById(request_id).lean() as any,
      Offer.findById(offer_id).lean() as any,
      User.findById(user.id).lean() as any,
    ]);
    if (!requestDoc) return res.status(404).json({ error: 'Request not found' });
    if (!offerDoc) return res.status(404).json({ error: 'Offer not found' });

    const buyerDoc = await User.findById(requestDoc.user_id).lean() as any;
    const amount = Number(requestDoc.amount);

    let actualDiscountAmount = requestDoc.best_card_info?.discount_amount || 0;
    let bestCardForDiscount = requestDoc.best_card_info || null;

    if (!actualDiscountAmount) {
      actualDiscountAmount = Math.round(amount * 0.05);
    }

    const customerSavings    = Math.round(actualDiscountAmount * 0.50);
    const providerEarning    = Math.round(actualDiscountAmount * 0.35);
    const platformCommission = Math.round(actualDiscountAmount * 0.15);

    const now = new Date();
    const trackingDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tx = await Transaction.create({
      request_id:   requestDoc._id,
      offer_id:     offerDoc._id,
      buyer_id:     requestDoc.user_id,
      provider_id:  user.id,
      buyer_name:   buyerDoc?.fullName  || 'Buyer',
      provider_name:providerDoc?.fullName || 'Provider',
      amount,
      product_title:requestDoc.title,
      product_link: requestDoc.product_link || '',
      category:     requestDoc.category || '',
      card_discount_amount: actualDiscountAmount,
      customer_savings:     customerSavings,
      provider_earning:     providerEarning,
      platform_commission:  platformCommission,
      discount_source:      bestCardForDiscount?.source || 'estimated',
      status:         'pending_payment',
      payment_at:     now,
      tracking_due_at:trackingDue,
    });

    await RequestModel.findByIdAndUpdate(request_id, { status: 'matched' });

    // Notify buyer
    await Notification.create({
      user_id: requestDoc.user_id,
      type:    'payment',
      title:   '🎉 Offer Matched!',
      message: `A cardholder has matched your request for "${requestDoc.title}". Proceed to payment to lock the deal.`,
      tx_id:   tx._id.toString(),
    });

    return res.status(201).json({ data: { ...(tx as any).toObject(), id: (tx as any)._id.toString() } });
  } catch (err) {
    req.log.error({ err }, '[payment POST]');
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/payment — confirm payment (buyer submits UPI ref)
router.put('/payment', async (req, res) => {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { tx_id, upi_ref } = req.body;
    if (!tx_id) return res.status(400).json({ error: 'tx_id required' });

    const tx = await Transaction.findById(tx_id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (tx.get('buyer_id').toString() !== user.id) return res.status(403).json({ error: 'Forbidden' });

    tx.set({ upi_ref: upi_ref || '', status: 'tracking_pending' });
    await tx.save();

    await Notification.create({
      user_id: tx.get('provider_id'),
      type:    'payment',
      title:   '💸 Payment Received — Place the Order',
      message: `Payment of ₹${tx.get('amount').toLocaleString('en-IN')} confirmed for "${tx.get('product_title')}". Place the order and submit the tracking ID within 24 hours.`,
      tx_id:   tx._id.toString(),
    });

    return res.json({ data: { ...(tx as any).toObject(), id: (tx as any)._id.toString() } });
  } catch (err) {
    req.log.error({ err }, '[payment PUT]');
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/payment/tracking — submit tracking ID
router.post('/payment/tracking', async (req, res) => {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { tx_id, tracking_id, courier } = req.body;
    if (!tx_id || !tracking_id) return res.status(400).json({ error: 'tx_id and tracking_id required' });

    const tx = await Transaction.findById(tx_id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    if (!['tracking_pending', 'payment_received'].includes(tx.get('status'))) {
      return res.status(409).json({ error: 'Cannot submit tracking at this stage' });
    }
    if (tx.get('provider_id').toString() !== user.id) return res.status(403).json({ error: 'Forbidden' });

    const due = tx.get('tracking_due_at');
    if (due && new Date() > new Date(due)) {
      return res.status(410).json({ error: 'Tracking deadline passed — payment was refunded' });
    }

    tx.set({ tracking_id, courier: courier || '', status: 'tracking_submitted', completed_at: new Date() });
    await tx.save();

    await RequestModel.findByIdAndUpdate(tx.get('request_id'), { status: 'completed' });

    await Notification.create({
      user_id: tx.get('buyer_id'),
      type:    'tracking',
      title:   '📦 Order Placed — Tracking ID Available',
      message: `Your order "${tx.get('product_title')}" has been placed. Tracking: ${tracking_id}${courier ? ' via ' + courier : ''}. The deal is complete!`,
      tx_id:   tx._id.toString(),
    });

    const released = tx.get('amount') - (tx.get('platform_commission') || 0);
    await Notification.create({
      user_id: tx.get('provider_id'),
      type:    'info',
      title:   '💸 Payment Released',
      message: `Escrow payment of ₹${released.toLocaleString('en-IN')} for "${tx.get('product_title')}" has been released to your account.`,
      tx_id:   tx._id.toString(),
    });

    return res.json({ data: { ...(tx as any).toObject(), id: (tx as any)._id.toString() } });
  } catch (err) {
    req.log.error({ err }, '[payment/tracking POST]');
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/payment/refund-check — check and process overdue tracking
router.get('/payment/refund-check', async (req, res) => {
  try {
    await connectDB();
    const now = new Date();
    const expired = await Transaction.find({ status: 'tracking_pending', tracking_due_at: { $lte: now } });
    const results: string[] = [];

    for (const tx of expired) {
      tx.set({ status: 'refunded', refunded_at: now });
      await tx.save();

      await Notification.create({
        user_id: tx.get('buyer_id'),
        type:    'refund',
        title:   '💰 Payment Refunded',
        message: `The provider did not submit a tracking ID within 24 hours for "${tx.get('product_title')}". Your full payment of ₹${tx.get('amount').toLocaleString('en-IN')} has been refunded.`,
        tx_id:   tx._id.toString(),
      });
      await Notification.create({
        user_id: tx.get('provider_id'),
        type:    'info',
        title:   '⚠️ Order Refunded',
        message: `You failed to submit a tracking ID for "${tx.get('product_title')}" within 24 hours. The payment has been refunded to the buyer.`,
        tx_id:   tx._id.toString(),
      });
      results.push(tx._id.toString());
    }

    return res.json({ refunded: results.length, ids: results });
  } catch (err) {
    req.log.error({ err }, '[payment/refund-check]');
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
