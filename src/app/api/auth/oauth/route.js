import { NextResponse } from 'next/server';
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
    onboarding_complete: user.onboarding_complete ?? true,  // existing users = already done
  };
}

/**
 * POST /api/auth/oauth
 * Body: { provider: 'google'|'github', id_token: string } (from client-side OAuth)
 *   OR  { provider, oauth_id, email, name, picture }     (from server-side NextAuth callback)
 *
 * Returns: { token, user, is_new }
 */
export async function POST(req) {
  try {
    await connectDB();
    const { provider, oauth_id, email, name, picture } = await req.json();

    if (!provider || !oauth_id || !email)
      return NextResponse.json({ error: 'provider, oauth_id and email are required' }, { status: 400 });

    const normalEmail = email.toLowerCase();

    // 1. Try to find by oauth_id + provider (fastest path)
    let user = await User.findOne({ oauth_provider: provider, oauth_id });

    // 2. Try to find by email (account might exist from password signup)
    if (!user) {
      user = await User.findOne({ email: normalEmail });
      if (user) {
        // Link the OAuth provider to existing account
        user.oauth_provider = provider;
        user.oauth_id = oauth_id;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
      }
    }

    // 3. Brand-new user — create with onboarding_complete = false
    const is_new = !user;
    if (!user) {
      user = await User.create({
        email: normalEmail,
        fullName: name || '',
        avatar: picture || '',
        oauth_provider: provider,
        oauth_id,
        role: 'customer',             // default; wizard will update
        onboarding_complete: false,   // will trigger OnboardingWizard
      });
    }

    return NextResponse.json({ token: makeToken(user), user: safeUser(user), is_new });
  } catch (err) {
    console.error('[API/auth/oauth]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
