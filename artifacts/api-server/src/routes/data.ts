import { Router } from 'express';
import { connectDB } from '../lib/mongodb';
import { Request as RequestModel, Offer, Transaction } from '../lib/models';
import { getUser } from '../lib/authHelpers';

const router = Router();

const getModel = (type: string) => ({ requests: RequestModel, offers: Offer, transactions: Transaction }[type]);

// GET /api/data?type=all|requests|offers|transactions[&userId=...]
router.get('/data', async (req, res) => {
  try {
    await connectDB();
    const { type, userId } = req.query as Record<string, string>;

    if (type === 'all') {
      const [requests, offers, transactions] = await Promise.all([
        RequestModel.find().sort({ createdAt: -1 }).limit(200).lean(),
        Offer.find().sort({ createdAt: -1 }).limit(200).lean(),
        Transaction.find().sort({ createdAt: -1 }).limit(200).lean(),
      ]);
      const mapId = (arr: any[]) => arr.map(d => ({ ...d, id: d._id.toString(), _id: undefined }));
      return res.json({ requests: mapId(requests), offers: mapId(offers), transactions: mapId(transactions) });
    }

    const Model = getModel(type);
    if (!Model) return res.status(400).json({ error: 'Invalid type' });

    const filter = userId ? { user_id: userId } : {};
    const data = await Model.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    const mapped = data.map((d: any) => ({ ...d, id: d._id.toString(), _id: undefined }));
    return res.json({ data: mapped });
  } catch (err) {
    req.log.error({ err }, '[data GET]');
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/data — create
router.post('/data', async (req, res) => {
  try {
    await connectDB();
    const user = getUser(req);
    const { type, ...payload } = req.body;
    const Model = getModel(type);
    if (!Model) return res.status(400).json({ error: 'Invalid type' });
    if (user) payload.user_id = user.id;
    const doc = await Model.create(payload);
    return res.status(201).json({ data: { ...(doc as any).toObject(), id: (doc as any)._id.toString() } });
  } catch (err) {
    req.log.error({ err }, '[data POST]');
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/data — update
router.patch('/data', async (req, res) => {
  try {
    await connectDB();
    const user = getUser(req);
    const { type, id, ...updates } = req.body;
    const Model = getModel(type);
    if (!Model) return res.status(400).json({ error: 'Invalid type' });

    if (type === 'requests' && user) {
      const existing = await RequestModel.findById(id).lean() as any;
      if (!existing) return res.status(404).json({ error: 'Not found' });
      if (existing.user_id.toString() !== user.id) return res.status(403).json({ error: 'Unauthorized' });
      if (existing.status === 'completed') return res.status(400).json({ error: 'Cannot edit completed requests' });
    }

    const doc = await Model.findByIdAndUpdate(id, updates, { new: true }).lean() as any;
    if (!doc) return res.status(404).json({ error: 'Not found' });
    return res.json({ data: { ...doc, id: doc._id.toString() } });
  } catch (err) {
    req.log.error({ err }, '[data PATCH]');
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/data?type=...&id=...
router.delete('/data', async (req, res) => {
  try {
    await connectDB();
    const user = getUser(req);
    const { type, id } = req.query as Record<string, string>;
    const Model = getModel(type);
    if (!Model) return res.status(400).json({ error: 'Invalid type' });

    if (type === 'requests' && user) {
      const existing = await RequestModel.findById(id).lean() as any;
      if (!existing) return res.status(404).json({ error: 'Not found' });
      if (existing.user_id.toString() !== user.id) return res.status(403).json({ error: 'Unauthorized' });
      if (existing.status === 'completed') return res.status(400).json({ error: 'Cannot delete completed requests' });
    }

    await Model.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, '[data DELETE]');
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
