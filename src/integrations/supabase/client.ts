// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
// Hardcoded fallbacks: the Supabase URL and publishable/anon key are safe to
// expose client-side. These match the project's Lovable Cloud Supabase
// instance and act as a fallback if env vars aren't injected at build time.
const FALLBACK_SUPABASE_URL = "https://ohkswkuoexbntukkmxso.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oa3N3a3VlbndibnR1a2tteHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NDMxNjcsImV4cCI6MjA5MzIxOTE2N30.QSZ8H-_1S_WAZfKDQoF3jb-dD0eHp9I3b4jK7fpgbmE";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;
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
