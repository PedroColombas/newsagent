import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

// Lazy service-role client (Trigger §2). The pipeline uses the service_role key, which
// bypasses RLS — see supabase/migrations/0002_rls_policies.sql. NEVER ship this key to
// the client; it is server-side only.
let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}
