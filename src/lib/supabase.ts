import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase env vars missing. Set SUPABASE_URL/SUPABASE_ANON_KEY or PUBLIC_SUPABASE_URL/PUBLIC_SUPABASE_ANON_KEY."
  );
}

// Create ONE shared client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Workers have no localStorage
    autoRefreshToken: false,
  },
});
