import { Router } from 'express';
import { connectDB } from '../lib/mongodb';
import { Notification } from '../lib/models';
import { getUser } from '../lib/authHelpers';

const router = Router();

// GET /api/notifications?limit=20
router.get('/notifications', async (req, res) => {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const limit = Math.min(Number(req.query['limit'] || 20), 50);
    const notifs = await Notification.find({ user_id: user.id }).sort({ createdAt: -1 }).limit(limit).lean();

    return res.json({
      data: notifs.map((n: any) => ({ ...n, id: n._id.toString(), _id: undefined })),
      unread: notifs.filter((n: any) => !n.read).length,
    });
  } catch (err) {
    req.log.error({ err }, '[notifications GET]');
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/notifications — mark read
router.patch('/notifications', async (req, res) => {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body;
    if (body.markAllRead) {
      await Notification.updateMany({ user_id: user.id, read: false }, { read: true });
      return res.json({ success: true });
    }
    if (body.id) {
      await Notification.findByIdAndUpdate(body.id, { read: true });
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Nothing to update' });
  } catch (err) {
    req.log.error({ err }, '[notifications PATCH]');
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
