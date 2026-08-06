import jwt from 'jsonwebtoken';
import type { Request } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-production';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  onboarding_complete: boolean;
}

export function getUser(req: Request): JwtPayload | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.split(' ')[1], JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function makeToken(user: { _id: unknown; email: string; role: string; onboarding_complete: boolean }): string {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, onboarding_complete: user.onboarding_complete },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export function safeUser(user: Record<string, unknown>) {
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
