import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'gozivo-default-secret-change-me';

export async function POST(request) {
  try {
    await connectDB();
    const { action, email, password, fullName, role } = await request.json();

    if (action === 'register') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }
      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({
        email: email.toLowerCase(),
        password: hashed,
        fullName: fullName || '',
        role: role || 'customer',
      });
      const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return NextResponse.json({
        token,
        user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
      });
    }

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
      const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return NextResponse.json({
        token,
        user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
      });
    }

    if (action === 'me') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'No token' }, { status: 401 });
      }
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json({
          user: { id: user._id, email: user.email, fullName: user.fullName, role: user.role },
        });
      } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[API/auth]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
