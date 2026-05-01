"use client";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signIn as nextAuthSignIn, useSession } from 'next-auth/react';
import { api, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(undefined); // undefined=loading, null=not logged in
  const [loading, setLoading] = useState(true);
  const { data: session, status: sessionStatus } = useSession();

  // ── On mount: restore from localStorage token ─────────────────
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gz-token') : null;
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    api.me()
      .then(res => setUser(res.user))
      .catch(() => { setToken(null); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  // ── NextAuth session → upsert user via /api/auth/oauth ────────
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus !== 'authenticated' || !session) return;

    // If we already have a local token user, don't re-process
    const existing = typeof window !== 'undefined' ? localStorage.getItem('gz-token') : null;
    if (existing && user) return;

    // Exchange NextAuth session for our custom JWT
    const { provider, oauth_id, user: oauthUser } = session;
    if (!oauth_id) return; // not an OAuth session

    fetch('/api/auth/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider:  provider    || 'google',
        oauth_id:  oauth_id,
        email:     oauthUser?.email  || '',
        name:      oauthUser?.name   || '',
        picture:   oauthUser?.image  || '',
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.token) {
          setToken(data.token);
          setUser(data.user);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionStatus, session]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Email/password sign-in ─────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      setUser(res.user);
      return { data: res, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }, []);

  // ── Email/password register ────────────────────────────────────
  const signUp = useCallback(async (email, password, fullName, role) => {
    try {
      const res = await api.register(email, password, fullName, role);
      setToken(res.token);
      setUser(res.user);
      return { data: res, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  }, []);

  // ── OAuth sign-in (triggers NextAuth redirect) ─────────────────
  const signInWithOAuth = useCallback((provider) => {
    nextAuthSignIn(provider, { callbackUrl: window.location.href });
  }, []);

  // ── Sign out ───────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('gz-token'); } catch {}
    }
  }, []);

  // ── Complete onboarding (called from OnboardingWizard) ─────────
  const completeOnboarding = useCallback(async ({ role, fullName, phone }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gz-token') : null;
    if (!token) return { error: 'Not authenticated' };
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete-onboarding', token, role, fullName, phone }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Failed' };
      setToken(data.token);
      setUser(data.user);
      return { data };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  const role        = user?.role ?? 'customer';
  const displayName = user?.fullName || user?.email || 'User';
  const needsOnboarding = user && user.onboarding_complete === false;

  return (
    <AuthContext.Provider value={{
      user, role, displayName, loading,
      needsOnboarding,
      signIn, signUp, signInWithOAuth, signOut, completeOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export const ROLE_LABELS = {
  admin:             'Admin',
  customer:          'Customer',
  provider:          'Provider',
  customer_provider: 'Customer + Provider',
};

export const ROLE_COLORS = {
  admin:             'bg-slate-100 text-slate-700',
  customer:          'bg-blue-100 text-blue-700',
  provider:          'bg-emerald-100 text-emerald-700',
  customer_provider: 'bg-purple-100 text-purple-700',
};
