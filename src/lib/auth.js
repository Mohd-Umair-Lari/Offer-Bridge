import jwt from 'jsonwebtoken';
import { config } from '@/lib/config';

const JWT_SECRET = config.jwt.secret;

/**
 * Extracts and verifies JWT payload from standard Authorization: Bearer <token> header
 * @param {Request} req - Next.js / Web Request object
 * @returns {Object|null} Decoded JWT payload or null if invalid/missing
 */
export function getUser(req) {
  if (!req) return null;
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}
