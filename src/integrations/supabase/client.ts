// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.APP_SUPABASE_ANON_KEY;

// Runtime guard to prevent cryptic failures
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[client.ts] Supabase credentials missing. " +
    "Ensure APP_SUPABASE_URL and APP_SUPABASE_ANON_KEY are saved in Lovable Secrets " +
    "and that vite.config.ts has envPrefix: 'APP_'."
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
