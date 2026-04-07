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
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    setProfile(data ?? null);
    return data;
  }, []);

  useEffect(() => {
    // Load current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else setUser(null); // triggers loading = false
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        
        if (u) {
          await fetchProfile(u.id);
        } else {
          // Explicitly handle logout events
          setUser(null);
          setProfile(null);
          
          // Clear all cached data when user logs out
          CacheService.clear();
          
          // Clear any remaining auth data
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
      // Sign out from Supabase - this clears the session and tokens
      await supabase.auth.signOut();
      
      // Clear local state
      setUser(null);
      setProfile(null);
      
      // Clear all cached data when logging out
      CacheService.clear();
      
      // Additional cleanup: Clear any lingering auth data from localStorage
      // Supabase stores session in `sb-{project-ref}-auth-token`
      // We need to ensure it's completely cleared
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
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, clear local state to prevent stuck state
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
