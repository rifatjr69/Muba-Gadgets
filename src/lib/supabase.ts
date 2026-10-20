// @ts-ignore
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ybklofybvifuiiugldas.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlia2xvZnlidmlmdWlpdWdsZGFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MTU0MjYsImV4cCI6MjEwNzk5MTQyNn0.GJRLnz9D3u7daz7RmWAsYc_HqsrHgPRZbvxlc9NqXE4';

let client: any = null;

try {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
} catch (err) {
  console.error('Supabase initialization error, using fallback:', err);
  client = {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ error: { message: 'Supabase offline' } }),
      signUp: async () => ({ error: { message: 'Supabase offline' } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: null }), order: async () => ({ data: [], error: null }) }),
        or: () => ({ order: async () => ({ data: [], error: null }) }),
        order: async () => ({ data: [], error: null })
      }),
      insert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }),
      delete: async () => ({ data: null, error: null })
    })
  };
}

export const supabase = client;
