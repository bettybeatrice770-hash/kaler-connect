import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log a safe warning instead of throwing an uncatchable error that breaks the browser bundle load
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase Warning] Connection credentials missing. Standard fallbacks used.');
}

// Fallback values prevent createClient from failing during initial engine compilation loops
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder-project.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-fallback-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
