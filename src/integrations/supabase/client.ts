// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Lovable Cloud auto-injects VITE_SUPABASE_PUBLISHABLE_KEY for its managed
// Supabase projects, while other setups (e.g. Netlify env vars) may use
// VITE_SUPABASE_ANON_KEY. Accept either so both build targets work.
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Runtime guard to prevent cryptic failures
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[client.ts] Supabase credentials missing. " +
    "Ensure VITE_SUPABASE_URL and either VITE_SUPABASE_ANON_KEY or " +
    "VITE_SUPABASE_PUBLISHABLE_KEY are set as environment variables for " +
    "this build (Lovable Cloud env vars and/or Netlify site environment " +
    "variables). No custom envPrefix is required - Vite exposes " +
    "VITE_-prefixed vars by default."
  );
}

// Safe storage adapter: avoids Chrome iframe partitioning errors in Lovable preview
const createSafeStorage = (): Storage => {
  try {
    const testKey = '__supabase_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    const memoryStore = new Map<string, string>();
    return {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => { memoryStore.set(key, value); },
      removeItem: (key: string) => { memoryStore.delete(key); },
      clear: () => { memoryStore.clear(); },
      get length() { return memoryStore.size; },
      key: (index: number) => Array.from(memoryStore.keys())[index] ?? null,
    };
  }
};

// Create Supabase client with secure PKCE flow
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createSafeStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
