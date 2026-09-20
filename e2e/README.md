# Demo-path tests

Browser tests covering the path a visitor actually walks, plus the checks that stop the public demo
account spending money on the paid APIs.

Scoped deliberately: this is **not** general test coverage. The demo is the thing strangers see, and
the spending gate is the thing that costs real money if it breaks, so those are what is covered.

## Running them

The suite points at a deployed URL rather than a local dev server, so there is nothing to set up
beyond the address:

```bash
cd e2e
npm install
npx playwright install chromium
DEMO_BASE_URL=https://your-app.vercel.app npm test
```

On Windows PowerShell:

```powershell
$env:DEMO_BASE_URL = "https://your-app.vercel.app"; npm test
```

## What is covered

| File | What it protects |
|---|---|
| `tests/demo-path.spec.ts` | A visitor can sign in, read a brief, browse history, edit preferences, replay the setup wizard, and dock/expand the podcast player. |
| `tests/spending-gate.spec.ts` | The demo account is refused by `/api/generate` and `/api/podcast`, and all three paid endpoints refuse anonymous callers. |

The spending gate is asserted at the **server**, not in the UI. The demo's credentials are public by
design, so anyone can sign in as it and call the endpoints directly — a hidden button proves nothing.

Assertions are intentionally coarse (does it render, does it navigate, does the player dock). A red
badge on a public repo is worse than no badge, so nothing here depends on timing or pixels.
