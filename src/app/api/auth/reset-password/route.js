import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

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
    phone: user.phone || '',
    age: user.age || '',
    avatar: user.avatar || '',
    provider: user.oauth_provider || null,
    onboarding_complete: user.onboarding_complete ?? true,
  };
}

export async function POST(request) {
  try {
    await connectDB();
    const { token, password } = await request.json();

    if (!token || typeof token !== 'string' || token.length !== 64) {
      return NextResponse.json({ error: 'Invalid or missing reset token.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const user = await User.findOne({
      reset_token: token,
      reset_token_expires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ error: 'This reset link has expired or is invalid. Please request a new one.' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.findByIdAndUpdate(user._id, {
      password: hashed,
      reset_token: null,
      reset_token_expires: null,
    });

    return NextResponse.json({
      message: 'Password reset successfully.',
      token: makeToken(user),
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}

// Validate token (GET) — used by frontend to validate before showing form
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token || token.length !== 64) {
      return NextResponse.json({ valid: false, error: 'Invalid token format.' }, { status: 400 });
    }

    const user = await User.findOne({
      reset_token: token,
      reset_token_expires: { $gt: new Date() },
    }).select('email fullName');

    if (!user) {
      return NextResponse.json({ valid: false, error: 'This link has expired or is invalid.' }, { status: 400 });
    }

    return NextResponse.json({ valid: true, email: user.email });
  } catch (err) {
    console.error('[auth/reset-password GET]', err);
    return NextResponse.json({ valid: false, error: 'Server error.' }, { status: 500 });
  }
}
