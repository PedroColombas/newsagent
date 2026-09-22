// The app is served under /app; the site root is the landing page.
//
// One constant, because three separate places have to agree and a mismatch fails in ways that are
// hard to spot: the router's basename, the auth redirect (a magic link that lands on the wrong path
// drops you on the marketing page instead of signing you in), and the PWA's start_url.
export const APP_BASE = "/app";

// Absolute URL of a path inside the app — what Supabase must send people back to.
export function appUrl(path = ""): string {
  return `${window.location.origin}${APP_BASE}${path}`;
}
