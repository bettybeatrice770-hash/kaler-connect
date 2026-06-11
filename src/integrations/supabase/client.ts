import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
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
