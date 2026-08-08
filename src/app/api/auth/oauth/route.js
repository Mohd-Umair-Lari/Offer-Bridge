import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models';
import { config } from '@/lib/config';

const JWT_SECRET = config.jwt?.secret || process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

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
    onboarding_complete: user.onboarding_complete ?? true,
  };
}

export async function POST(req) {
  try {
    await connectDB();
    const { provider, oauth_id, email, name, picture } = await req.json();

    if (!provider || !oauth_id || !email)
      return NextResponse.json({ error: 'provider, oauth_id and email are required' }, { status: 400 });

    const normalEmail = email.toLowerCase();

    let user = await User.findOne({ oauth_provider: provider, oauth_id });

    if (!user) {
      user = await User.findOne({ email: normalEmail });
      if (user) {
        user.oauth_provider = provider;
        user.oauth_id = oauth_id;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
      }
    }

    const is_new = !user;
    if (!user) {
      user = await User.create({
        email: normalEmail,
        fullName: name || '',
        avatar: picture || '',
        oauth_provider: provider,
        oauth_id,
        role: 'customer',
        onboarding_complete: false,
      });
    }

    return NextResponse.json({ token: makeToken(user), user: safeUser(user), is_new });
  } catch (err) {
    console.error('[API/auth/oauth]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
