// The app is served under /app; the site root is the landing page.
//
// One constant, because three separate places have to agree and a mismatch fails in ways that are
// hard to spot: the router's basename, the auth redirect (a magic link that lands on the wrong path
// drops you on the marketing page instead of signing you in), and the PWA's start_url.
export const APP_BASE = "/app";

// Served by apps/web/vercel.json — NOT the repo root. Vercel's root directory for this project is
// apps/web (which is why apps/web/api/* answers at /api/*), so a vercel.json at the repo root is
// never read. There used to be one there, quietly doing nothing.
//
// How the split is actually served, because vercel.json cannot carry comments and this is easy to
// "tidy" into something broken:
//
//   routes: [ { src: "/", dest: "/landing/index.html" },
//             { handle: "filesystem" },
//             { src: "/app(?:/.*)?", dest: "/index.html" } ]
//
// It MUST be `routes`, not `rewrites`. Rewrites are consulted only after the filesystem, and the
// build writes the app shell to dist/index.html — so a rewrite for "/" never fires and the root
// keeps serving the app. `routes` is evaluated before the filesystem, so the first rule wins.
// `handle: filesystem` in the middle is what keeps assets, the manifest and the API functions
// working. And no `comment` keys: route entries are additionalProperties:false, so one makes the
// whole config invalid and the deploy fails validation while the previous build stays live.

// Absolute URL of a path inside the app — what Supabase must send people back to.
export function appUrl(path = ""): string {
  return `${window.location.origin}${APP_BASE}${path}`;
}
