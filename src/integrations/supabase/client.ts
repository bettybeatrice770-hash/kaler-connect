import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Restoring the strict reference to your Lovable Cloud database environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Keep the storage adapter to prevent SecurityError crashes in the Lovable preview iframe
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

export const supabase = createClient<Database>(
  supabaseUrl as string, 
  supabaseAnonKey as string, 
  {
    auth: {
      storage: createSafeStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  }
);
