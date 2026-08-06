import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectDB } from '../lib/mongodb';
import { User } from '../lib/models';
import { makeToken, safeUser, getUser } from '../lib/authHelpers';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-production';

// POST /api/auth — login, register, me, complete-onboarding, update-profile
router.post('/auth', async (req, res) => {
  try {
    await connectDB();
    const body = req.body;
    const { action } = body;

    if (action === 'register') {
      const { email, password, fullName } = body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({ email: email.toLowerCase(), password: hashed, fullName: fullName || '', role: 'customer', onboarding_complete: false });
      return res.json({ token: makeToken(user as any), user: safeUser(user.toObject()) });
    }

    if (action === 'login') {
      const { email, password } = body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });
      if (!user.get('password')) return res.status(401).json({ error: 'This account uses Google/GitHub sign-in. Use the OAuth button.' });
      const valid = await bcrypt.compare(password, user.get('password'));
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
      return res.json({ token: makeToken(user as any), user: safeUser(user.toObject()) });
    }

    if (action === 'me') {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json({ user: safeUser(user.toObject()) });
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    if (action === 'complete-onboarding') {
      const { token: rawToken, role: newRole, fullName: newName, phone } = body;
      if (!rawToken) return res.status(401).json({ error: 'No token' });
      let decoded: any;
      try { decoded = jwt.verify(rawToken, JWT_SECRET); } catch { return res.status(401).json({ error: 'Invalid token' }); }
      const user = await User.findByIdAndUpdate(decoded.id, { role: newRole || decoded.role, fullName: newName || decoded.fullName || '', phone: phone || '', onboarding_complete: true }, { new: true });
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ token: makeToken(user as any), user: safeUser(user.toObject()) });
    }

    if (action === 'update-profile') {
      const user = getUser(req);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const { fullName, phone, age, avatar } = body;
      const updates: Record<string, unknown> = {};
      if (fullName !== undefined) updates.fullName = fullName;
      if (phone !== undefined) updates.phone = phone;
      if (age !== undefined) updates.age = age;
      if (avatar !== undefined) updates.avatar = avatar;
      const updated = await User.findByIdAndUpdate(user.id, updates, { new: true }).select('-password');
      if (!updated) return res.status(404).json({ error: 'User not found' });
      return res.json({ token: makeToken(updated as any), user: safeUser(updated.toObject()) });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    req.log.error({ err }, '[auth] handler error');
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/oauth — OAuth sign-in (Google/GitHub via next-auth)
router.post('/auth/oauth', async (req, res) => {
  try {
    await connectDB();
    const { provider, oauth_id, email, name, picture } = req.body;
    if (!provider || !oauth_id || !email) return res.status(400).json({ error: 'provider, oauth_id and email are required' });
    const normalEmail = email.toLowerCase();

    let user = await User.findOne({ oauth_provider: provider, oauth_id });
    if (!user) {
      user = await User.findOne({ email: normalEmail });
      if (user) {
        user.set({ oauth_provider: provider, oauth_id });
        if (picture && !user.get('avatar')) user.set({ avatar: picture });
        await user.save();
      }
    }
    const is_new = !user;
    if (!user) {
      user = await User.create({ email: normalEmail, fullName: name || '', avatar: picture || '', oauth_provider: provider, oauth_id, role: 'customer', onboarding_complete: false });
    }
    return res.json({ token: makeToken(user as any), user: safeUser(user.toObject()), is_new });
  } catch (err) {
    req.log.error({ err }, '[auth/oauth] handler error');
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
