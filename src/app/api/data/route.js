import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Request, Offer, Transaction, Notification } from '@/lib/models';
import { getUser } from '@/lib/auth';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type   = searchParams.get('type');
    const userId = searchParams.get('userId');

    if (type === 'all') {
      const [requests, offers, transactions] = await Promise.all([
        Request.find().sort({ createdAt: -1 }).limit(100).lean(),
        Offer.find().sort({ createdAt: -1 }).limit(100).lean(),
        Transaction.find().sort({ createdAt: -1 }).limit(100).lean(),
      ]);
      const mapId = arr => (arr || []).map(d => ({ ...d, id: d._id.toString(), _id: undefined }));
      return NextResponse.json({ requests: mapId(requests), offers: mapId(offers), transactions: mapId(transactions) });
    }

    const Model = { requests: Request, offers: Offer, transactions: Transaction }[type];
    if (!Model) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    const filter = userId ? { user_id: userId } : {};
    const data   = await Model.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    const mapped = (data || []).map(d => ({ ...d, id: d._id.toString(), _id: undefined }));
    return NextResponse.json({ data: mapped });
  } catch (err) {
    console.error('[API/data GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const user = getUser(request);
    const body = await request.json();
    const { type, ...payload } = body;

    const Model = { requests: Request, offers: Offer, transactions: Transaction }[type];
    if (!Model) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    if (user) payload.user_id = user.id;
    const doc = await Model.create(payload);
    return NextResponse.json({ data: { ...doc.toObject(), id: doc._id.toString() } }, { status: 201 });
  } catch (err) {
    console.error('[API/data POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    await connectDB();
    const user = getUser(request);
    const body = await request.json();
    const { type, id, ...updates } = body;

    const Model = { requests: Request, offers: Offer, transactions: Transaction }[type];
    if (!Model) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    if (type === 'requests' && user) {
      const existing = await Request.findById(id).lean();
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (existing.user_id && existing.user_id.toString() !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      if (existing.status === 'completed') return NextResponse.json({ error: 'Cannot edit completed requests' }, { status: 400 });
      
      // Block edits while actively matched with a provider
      if (existing.status === 'matched' && updates.status !== 'pending' && updates.status !== 'cancelled') {
        return NextResponse.json({ error: 'Cannot edit a request that is currently matched with a provider' }, { status: 400 });
      }

      // If re-initializing from refunded or cancelled back to pending, reset status and push timestamp
      if (existing.status === 'refunded' || existing.status === 'cancelled' || updates.status === 'pending') {
        updates.status = 'pending';
        updates.pushed_at = new Date();
      }
    }

    const doc = await Model.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: { ...doc, id: doc._id.toString() } });
  } catch (err) {
    console.error('[API/data PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const user = getUser(request);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id   = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const Model = { requests: Request, offers: Offer, transactions: Transaction }[type];
    if (!Model) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    if (type === 'requests') {
      if (user) {
        const existing = await Request.findById(id).lean();
        if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        if (existing.user_id && existing.user_id.toString() !== user.id)
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        if (existing.status === 'completed')
          return NextResponse.json({ error: 'Cannot delete completed requests' }, { status: 400 });
      }

      // Cascading deletion to completely clean from database for both provider and consumer models
      await Promise.all([
        Request.findByIdAndDelete(id),
        Transaction.deleteMany({ request_id: id }),
        Notification.deleteMany({ tx_id: id }),
      ]);

      return NextResponse.json({ success: true });
    }

    await Model.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API/data DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
