import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log configuration status (for debugging)
if (typeof window !== 'undefined') {
  console.log('[Supabase] Configuration:', {
    url: supabaseUrl ? '✅ Set' : '❌ Missing',
    key: supabaseKey ? '✅ Set' : '❌ Missing',
  });
}

// If environment variables are missing (local testing without .env),
// inject a safe mock client that intentionally and instantly fails so the app safely defaults to Mock Data mode.
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : {
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