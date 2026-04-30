import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { Notification } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'gozivo-default-secret-change-me';

function getUser(req) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); }
  catch { return null; }
}

// GET /api/notifications?limit=20   → fetch user's notifications
export async function GET(req) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

    const notifs = await Notification.find({ user_id: user.id })
      .sort({ createdAt: -1 }).limit(limit).lean();

    return NextResponse.json({
      data: notifs.map(n => ({ ...n, id: n._id.toString(), _id: undefined })),
      unread: notifs.filter(n => !n.read).length,
    });
  } catch (err) {
    console.error('[notifications GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/notifications   body: { id } or { markAllRead: true }
export async function PATCH(req) {
  try {
    await connectDB();
    const user = getUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    if (body.markAllRead) {
      await Notification.updateMany({ user_id: user.id, read: false }, { read: true });
      return NextResponse.json({ success: true });
    }

    if (body.id) {
      await Notification.findByIdAndUpdate(body.id, { read: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  } catch (err) {
    console.error('[notifications PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
