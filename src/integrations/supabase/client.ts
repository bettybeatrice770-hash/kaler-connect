import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// If keys are missing, we log a safe warning instead of throwing a hard crash error
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase Warning] Environment variables are not set. Using fallback placeholders.');
}

// Providing safe fallback strings prevents createClient from crashing during file load
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder-project.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-fallback-key',
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
