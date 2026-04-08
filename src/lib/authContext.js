"use client";
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { CacheService } from './cacheService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = still loading, null = not logged in, object = logged in
  const [user, setUser]       = useState(undefined);
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
    // Seed initial user state immediately (before onAuthStateChange fires).
    // onAuthStateChange(INITIAL_SESSION) will also fire shortly after,
    // but getSession() guarantees the loading state resolves right away.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
    });

    // Listen for auth state changes (login, logout, token refresh)
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
        }
        // For any other event with a null session (e.g. TOKEN_REFRESHED mid-flight),
        // do nothing — getSession() below already seeds the initial user state.
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
      CacheService.clear();
    }
  };

  // ── Derived values ─────────────────────────────────────────────────
  // Role priority: profile table > JWT metadata > default 'customer'
  const role = profile?.role ?? user?.user_metadata?.role ?? 'customer';
  const loading = user === undefined;

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
