import { createClient } from "@supabase/supabase-js";

// Cloudflare / Astro safe env access
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!;

// Create ONE shared client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Workers have no localStorage
    autoRefreshToken: false,
  },
});
