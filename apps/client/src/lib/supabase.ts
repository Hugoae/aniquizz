import { createClient } from '@supabase/supabase-js';

// On récupère les clés depuis le fichier .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Il manque les clés Supabase dans le fichier .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);