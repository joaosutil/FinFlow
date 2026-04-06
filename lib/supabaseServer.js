import { createClient } from '@supabase/supabase-js';

export function createSupabaseServerClient(token) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variáveis SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: token } : {},
    },
  });
}
