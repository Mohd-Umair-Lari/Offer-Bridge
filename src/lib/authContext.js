"use client";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { CacheService } from './cacheService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still loading, null = not logged in, object = logged in
  const [user, setUser]               = useState(undefined);
  const [profile, setProfile]         = useState(null);
  // true while the profile row is being fetched for the current user
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (uid) => {
    setProfileLoading(true);
    try {
      // maybeSingle() returns null (not a 406) when no row exists
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle();
      if (error) console.warn('[Auth] Profile fetch warning:', error.message);
      setProfile(data ?? null);
      return data;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    // ── Single source of truth ────────────────────────────────────────
    // onAuthStateChange always fires INITIAL_SESSION with the persisted
    // session on mount (just like getSession would), so we do NOT call
    // getSession() separately. Doing both caused fetchProfile() to run
    // twice simultaneously, racing each other and saturating the
    // connection pool on every normal page refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null;

        if (u) {
          setUser(u);
          await fetchProfile(u.id);
        } else if (event === 'SIGNED_OUT') {
          // Only clean up on an explicit sign-out.
          // DO NOT clear here for TOKEN_REFRESHED or other transitional events —
          // those can briefly emit a null session while the new token is being
          // written, and clearing auth keys at that moment kills the live session.
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
          CacheService.clear();
          try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.includes('sb-') && key.includes('auth')) {
                localStorage.removeItem(key);
              }
            });
          } catch (e) {
            console.warn('Could not clear localStorage:', e);
          }
        } else if (event === 'INITIAL_SESSION') {
          // No session on initial load — resolve loading state immediately.
          setUser(null);
        }
        // For any other event with a null session (e.g. TOKEN_REFRESHED
        // mid-flight) do nothing — the existing user state is still valid.
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // ── Auth actions ───────────────────────────────────────────────────
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signUp = async (email, password, fullName, role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
      },
    });
    return { data, error };
  };

  const signOut = async () => {
    try {
      // supabase.auth.signOut() triggers onAuthStateChange(SIGNED_OUT),
      // which handles all cleanup (state, cache, localStorage).
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback cleanup if signOut itself fails and the event never fires
      setUser(null);
      setProfile(null);
      setProfileLoading(false);
      CacheService.clear();
    }
  };

  // ── Derived values ─────────────────────────────────────────────────
  // Role priority: profile table > JWT metadata > default 'customer'
  const role = profile?.role ?? user?.user_metadata?.role ?? 'customer';

  // loading is true until:
  //   • we know whether a session exists (user !== undefined), AND
  //   • if a user exists, their profile row has finished loading
  // This prevents page.js from calling fetchAll() before we have the
  // correct role, which was the second half of the refresh bug.
  const loading = user === undefined || (user !== null && profileLoading);

  const displayName =
    profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? 'User';

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
  provider:          'bg-emerald-100 text-emerald-700',
  customer_provider: 'bg-purple-100 text-purple-700',
};
