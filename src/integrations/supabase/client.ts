// Modified to prevent white-screen crashes on production builds
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Safely pull the environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Log a warning in the browser console if variables are missing, instead of breaking compilation
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    "⚠️ WARNING: Supabase credentials are not detected in the current environment. " +
    "Ensure environment variables are configured in your hosting dashboard."
  );
}

// Fallback values prevent 'supabaseUrl is required' initialization crashes
const fallbackUrl = SUPABASE_URL || 'https://placeholder-project-id.supabase.co';
const fallbackKey = SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key-string';

export const supabase = createClient<Database>(fallbackUrl, fallbackKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
