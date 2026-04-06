import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log configuration status (for debugging)
if (typeof window !== 'undefined') {
  const isConfigured = !!(supabaseUrl && supabaseKey);
  console.log('[Supabase] Configuration:', {
    url: supabaseUrl ? '✅ Set' : '❌ Missing',
    key: supabaseKey ? '✅ Set' : '❌ Missing',
    isConfigured,
    urlValue: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'undefined',
  });
}

// If environment variables are missing (local testing without .env),
// inject a safe mock client that intentionally and instantly fails so the app safely defaults to Mock Data mode.
export const supabase = supabaseUrl && supabaseKey 
  ? (() => {
      console.log('[Supabase] Creating real client...');
      return createClient(supabaseUrl, supabaseKey);
    })()
  : (() => {
      console.warn('[Supabase] Using mock fallback client - env vars missing!');
      return {
        from: () => ({ 
          select: () => ({ 
            order: () => Promise.resolve({ error: new Error("Offline Mode") }),
            eq: () => ({ single: () => Promise.resolve({ error: new Error("Offline Mode") }) })
          })
        }),
        auth: {
          getSession: async () => ({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithPassword: async () => ({ error: new Error("Not connected to Supabase") }),
          signUp: async () => ({ error: new Error("Not connected to Supabase") }),
          signOut: async () => { return { error: null }; }
        }
      };
    })();