import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// The app will prioritize the real environment variables. 
// If they are missing (causing the "URL is required" error), it falls back 
// to a placeholder to prevent the app from crashing entirely.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project-id.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

// FIX: In some browsers (notably Chrome when this app is rendered inside a
// cross-origin iframe, e.g. the Lovable preview pane), accessing
// window.localStorage throws a SecurityError due to storage partitioning.
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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createSafeStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
