import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { Request, Offer, Transaction } from '@/lib/models';
import { config } from '@/lib/config';

const JWT_SECRET = config.jwt.secret;

function getUser(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.split(' ')[1], JWT_SECRET); }
  catch { return null; }
}

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type   = searchParams.get('type');   // requests | offers | transactions | all
    const userId = searchParams.get('userId'); // optional — filter by owner

    if (type === 'all') {
      const [requests, offers, transactions] = await Promise.all([
        Request.find().sort({ createdAt: -1 }).limit(100).lean(),
        Offer.find().sort({ createdAt: -1 }).limit(100).lean(),
        Transaction.find().sort({ createdAt: -1 }).limit(100).lean(),
      ]);
      // Map _id → id for frontend compatibility
      const mapId = arr => arr.map(d => ({ ...d, id: d._id.toString(), _id: undefined }));
      return NextResponse.json({ requests: mapId(requests), offers: mapId(offers), transactions: mapId(transactions) });
    }

    const Model = { requests: Request, offers: Offer, transactions: Transaction }[type];
    if (!Model) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    // Scope to a single user when userId is supplied
    const filter = userId ? { user_id: userId } : {};
    const data   = await Model.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    const mapped = data.map(d => ({ ...d, id: d._id.toString(), _id: undefined }));
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

    // Authorization: only allow users to edit their own requests
    if (type === 'requests' && user) {
      const existing = await Request.findById(id).lean();
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (existing.user_id.toString() !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      // Cannot edit completed requests
      if (existing.status === 'completed') return NextResponse.json({ error: 'Cannot edit completed requests' }, { status: 400 });
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

    const Model = { requests: Request, offers: Offer, transactions: Transaction }[type];
    if (!Model) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    // Ownership check for requests — only the owner may delete
    if (type === 'requests' && user) {
      const existing = await Request.findById(id).lean();
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      if (existing.user_id.toString() !== user.id)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      if (existing.status === 'completed')
        return NextResponse.json({ error: 'Cannot delete completed requests' }, { status: 400 });
    }

    await Model.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API/data DELETE]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
