"use client";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signIn as nextAuthSignIn, useSession } from 'next-auth/react';
import { api, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(undefined);
  const [loading, setLoading] = useState(true);
  const { data: session, status: sessionStatus } = useSession();

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

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus !== 'authenticated' || !session) return;

    // session.oauth_id is set by the NextAuth JWT→session callbacks.
    // session.user holds { name, email, image } from the provider.
    const oauthId   = session.oauth_id;
    const provider  = session.provider || 'github'; // NextAuth sets this via jwt callback
    const userEmail = session.user?.email || '';
    const userName  = session.user?.name  || '';
    const userImage = session.user?.image || '';

    // Must have both an oauth_id and an email to create/link a DB account
    if (!oauthId || !userEmail) {
      console.warn('[Auth] OAuth session missing oauth_id or email', { oauthId, userEmail, session });
      setLoading(false);
      return;
    }

    // If we already have a valid local token AND user, skip re-syncing
    const existing = typeof window !== 'undefined' ? localStorage.getItem('gz-token') : null;
    if (existing && user) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        oauth_id: oauthId,
        email:    userEmail,
        name:     userName,
        picture:  userImage,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.token) {
          setToken(data.token);
          setUser(data.user);
        } else if (data.error) {
          console.error('[Auth] OAuth bridge error:', data.error);
        }
      })
      .catch(err => console.error('[Auth] OAuth fetch failed:', err))
      .finally(() => setLoading(false));
  }, [sessionStatus, session]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const signInWithOAuth = useCallback((provider) => {
    // Use origin only — avoids NextAuth rejecting preview-branch URLs as untrusted
    const callbackUrl = typeof window !== 'undefined' ? window.location.origin : '/';
    nextAuthSignIn(provider, { callbackUrl });
  }, []);

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('gz-token'); } catch {}
    }
  }, []);

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

  const updateUser = useCallback(async (updatedFields) => {
    try {
      const res = await api.updateProfile(updatedFields);
      if (res.user) {
        setUser(res.user);
        if (res.token) setToken(res.token);
      }
      return { success: true };
    } catch (err) {
      throw new Error(err.message || 'Failed to update profile');
    }
  }, []);

  const role        = user?.role ?? 'customer';
  const displayName = user?.fullName || user?.email || 'User';
  const needsOnboarding = user && user.onboarding_complete === false;

  return (
    <AuthContext.Provider value={{
      user, role, displayName, loading,
      needsOnboarding,
      signIn, signUp, signInWithOAuth, signOut, completeOnboarding, updateUser,
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
