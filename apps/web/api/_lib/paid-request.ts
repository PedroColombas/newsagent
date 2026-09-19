import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Shared guard for EVERY endpoint that spends money on a paid API (Anthropic, Perplexity, OpenAI).
//
// The public demo account's credentials ship in the browser bundle deliberately, so anyone can sign
// in as it and call these endpoints directly. Protection therefore has to live here, on the server
// - hiding a button in the UI stops nobody. This verifies the caller's session and then refuses if
// the account is flagged as the demo.
export interface PaidRequestAuth {
  userId?: string;
  supabase?: SupabaseClient; // bound to the caller's session, so RLS applies to further queries
  status?: number;
  error?: string;
}

export async function authorisePaidRequest(
  authHeader: string | undefined,
): Promise<PaidRequestAuth> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { status: 500, error: "Server is missing required env vars" };
  }

  const token = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, error: "Missing auth token" };

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return { status: 401, error: "Invalid session" };
  const userId = userData.user.id;

  const { data: prefs, error: prefsErr } = await supabase
    .from("preferences")
    .select("is_demo")
    .eq("user_id", userId)
    .maybeSingle();

  // Fails CLOSED on purpose: if we cannot establish whether this is the demo, refuse rather than
  // risk spending. The likeliest cause is migration 0014 not being applied, which this log names.
  if (prefsErr) {
    console.error("could not read is_demo (is migration 0014 applied?):", prefsErr.message);
    return { status: 503, error: "Could not verify the account. Please try again." };
  }
  if (prefs?.is_demo) {
    return { status: 403, error: "This is a read-only demo - generating new briefs is disabled." };
  }

  return { userId, supabase };
}
