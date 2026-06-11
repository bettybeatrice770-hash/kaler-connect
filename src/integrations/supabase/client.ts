import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Safely bridge both platform naming conventions (Lovable vs Standard)
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Throw immediately if the runtime variables are completely missing
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "CRITICAL INITIALIZATION ERROR: Missing Supabase connection details. " +
    "Verify that VITE_SUPABASE_URL and your environment tokens are populated."
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
