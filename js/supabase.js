import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Mode démo actif si les clés n'ont pas été remplies
const IS_DEMO = !SUPABASE_URL || SUPABASE_URL.includes('YOUR_PROJECT');

let supabase;

if (IS_DEMO) {
  const { createLocalClient } = await import('./local-db.js');
  supabase = createLocalClient();
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export { supabase, IS_DEMO };
