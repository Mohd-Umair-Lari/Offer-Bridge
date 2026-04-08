"use client";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CacheService } from './cacheService';

const AuthContext = createContext(null);

const STORAGE_KEY = 'offerbridge_auth_user';

export function AuthProvider({ children }) {
  // undefined = still loading, null = not logged in, object = logged in
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(null);

  const fetchProfile = useCallback(async (uid) => {
    try {
      // Fetch profile from MongoDB via API route
      const res = await fetch(`/api/profile/${uid}`);
      const json = await res.json();
      
      if (!res.ok) {
        console.warn('[Auth] Profile fetch warning:', json.error);
        setProfile(null);
        return null;
      }
      
      setProfile(json.data ?? null);
      return json.data;
    } catch (error) {
      console.warn('[Auth] Profile fetch error:', error.message);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    // On mount, restore user from localStorage if exists
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUser(user);
        if (user?.id) {
          fetchProfile(user.id);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.warn('[Auth] Restore from storage error:', error);
      setUser(null);
    }
  }, [fetchProfile]);

  // ── Auth actions ───────────────────────────────────────────────────
  const signIn = async (email, password) => {
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        return { data: null, error: new Error(json.error || 'Sign in failed') };
      }

      // Store user in localStorage and state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json.user));
      setUser(json.user);

      // Fetch profile
      if (json.user?.id) {
        await fetchProfile(json.user.id);
      }

      return { data: json.user, error: null };
    } catch (error) {
      console.error('[Auth] Sign in error:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email, password, fullName, role) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role }),
      });

      const json = await res.json();

      if (!res.ok) {
        return { data: null, error: new Error(json.error || 'Sign up failed') };
      }

      // Store user in localStorage and state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(json.user));
      setUser(json.user);

      // Fetch profile
      if (json.user?.id) {
        await fetchProfile(json.user.id);
      }

      return { data: json.user, error: null };
    } catch (error) {
      console.error('[Auth] Sign up error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      // Call logout endpoint
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Clear user state and localStorage
      setUser(null);
      setProfile(null);
      CacheService.clear();
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────
  // Role priority: profile table > user metadata > default 'customer'
  const role = profile?.role ?? user?.role ?? 'customer';
  const loading = user === undefined;

  const displayName =
    profile?.full_name ?? user?.full_name ?? user?.email ?? 'User';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      displayName,
      loading,
      signIn,
      signUp,
      signOut,
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

// ── Role helpers ─────────────────────────────────────────────────────
export const ROLE_LABELS = {
  admin:             'Admin',
  customer:          'Customer',
  provider:          'Provider',
  customer_provider: 'Customer + Provider',
};

export const ROLE_COLORS = {
  admin:             'bg-slate-100 text-slate-700',
  customer:          'bg-blue-100 text-blue-700',
  provider:          'bg-green-100 text-green-700',
  customer_provider: 'bg-purple-100 text-purple-700',
};
