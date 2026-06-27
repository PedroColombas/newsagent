import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
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
      {
        auth: { persistSession: false, autoRefreshToken: false },
        // Trigger's build image is Node < 22 (no global WebSocket). supabase-js spins up a
        // Realtime client that needs one even though we never use realtime — supply ws.
        realtime: { transport: ws as never },
      },
    );
  }
  return client;
}
