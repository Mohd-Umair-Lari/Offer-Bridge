"use client";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(undefined); // undefined=loading, null=not logged in
  const [loading, setLoading] = useState(true);

  // On mount — check for existing token
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

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('gz-token'); } catch {}
    }
  }, []);

  const role = user?.role ?? 'customer';
  const displayName = user?.fullName || user?.email || 'User';

  return (
    <AuthContext.Provider value={{ user, profile: user, role, displayName, loading, signIn, signUp, signOut }}>
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
