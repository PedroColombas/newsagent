import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check apps/web/.env.local",
  );
}

// Frontend client uses the public anon key; RLS keeps each user to their own rows.
export const supabase = createClient(url, anonKey);
