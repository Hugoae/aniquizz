import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { markPasswordRecovery } from './passwordRecoverySignal';

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Subscribe at module load so PASSWORD_RECOVERY is not missed if `/reset-password`
// mounts after detectSessionInUrl has already consumed the hash.
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') markPasswordRecovery();
});
