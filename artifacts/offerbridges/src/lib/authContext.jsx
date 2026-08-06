import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(undefined);
  const [loading, setLoading] = useState(true);

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

  // OAuth via server-side flow – only available when backend OAuth is configured
  const signInWithOAuth = useCallback((_provider) => {
    console.warn('OAuth sign-in is not configured in this environment.');
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
