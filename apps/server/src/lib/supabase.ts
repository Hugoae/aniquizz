import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

/**
 * Server-side Supabase client (service role).
 * Used to verify user access tokens via auth.getUser() — works with both
 * legacy HS256 and newer RS256 (JWT Signing Keys) tokens.
 */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
