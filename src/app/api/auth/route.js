import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';

const JWT_SECRET = process.env.JWT_SECRET || 'gozivo-default-secret-change-me';

function makeToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, onboarding_complete: user.onboarding_complete },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function safeUser(user) {
  return {
    id: user._id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    avatar: user.avatar || '',
    onboarding_complete: user.onboarding_complete ?? false,
  };
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { action, email, password, fullName, role } = body;

    // ── register ──────────────────────────────────────────────────
    if (action === 'register') {
      if (!email || !password)
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing)
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });

      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({
        email: email.toLowerCase(),
        password: hashed,
        fullName: fullName || '',
        role: role || 'customer',
        onboarding_complete: true, // email/password users finish onboarding inline during signup
      });

      return NextResponse.json({ token: makeToken(user), user: safeUser(user) });
    }

    // ── login ─────────────────────────────────────────────────────
    if (action === 'login') {
      if (!email || !password)
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user)
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

      if (!user.password)
        return NextResponse.json({ error: 'This account uses Google/GitHub sign-in. Use the OAuth button.' }, { status: 401 });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid)
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

      return NextResponse.json({ token: makeToken(user), user: safeUser(user) });
    }

    // ── me ────────────────────────────────────────────────────────
    if (action === 'me') {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer '))
        return NextResponse.json({ error: 'No token' }, { status: 401 });

      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
        return NextResponse.json({ user: safeUser(user) });
      } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }

    // ── complete-onboarding ───────────────────────────────────────
    if (action === 'complete-onboarding') {
      const { token: rawToken, role: newRole, fullName: newName, phone } = body;
      if (!rawToken) return NextResponse.json({ error: 'No token' }, { status: 401 });

      let decoded;
      try { decoded = jwt.verify(rawToken, JWT_SECRET); }
      catch { return NextResponse.json({ error: 'Invalid token' }, { status: 401 }); }

      const user = await User.findByIdAndUpdate(
        decoded.id,
        {
          role: newRole || decoded.role,
          fullName: newName || decoded.fullName || '',
          phone: phone || '',
          onboarding_complete: true,
        },
        { new: true },
      );
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      return NextResponse.json({ token: makeToken(user), user: safeUser(user) });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[API/auth]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
