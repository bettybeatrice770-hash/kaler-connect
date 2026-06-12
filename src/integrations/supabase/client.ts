import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// FIX: In some browsers (notably Chrome when this app is rendered inside a
// cross-origin iframe, e.g. the Lovable preview pane), accessing
// window.localStorage throws a SecurityError due to storage partitioning.
// This adapter probes localStorage once and falls back to an safely-typed 
// in-memory store if it's inaccessible, so the app always boots.
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
    // FIX: detectSessionInUrl is required so that password-reset and magic-link
    // tokens in the URL hash are automatically exchanged for a session.
    // Without this, ResetPassword.tsx never receives a valid session and
    // hangs on "Validating link..." forever.
    detectSessionInUrl: true,
    // FIX: Use the 'pkce' flow for all auth operations. PKCE is more secure and,
    // critically, it ensures that the session established by a recovery link is
    // correctly picked up by onAuthStateChange as a PASSWORD_RECOVERY event
    // rather than being silently dropped.
    flowType: 'pkce',
  },
});
