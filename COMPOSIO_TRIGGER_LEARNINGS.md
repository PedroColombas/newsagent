# Composio + Trigger.dev — Hard-Won Learnings

A self-contained reference of non-obvious gotchas, quirks, and workarounds discovered
while building production-style workloads with Composio (v3, `@composio/core`) and
Trigger.dev (v4). Drop this file into a new project's root and tell your Claude Code
session to read it before debugging — most of these took hours to find.

Last updated: 2026-06-20. Composio's surface area shifts; treat date-tagged items as
"true at time of writing."

---

## Quick-reference symptom table

| You're seeing... | Jump to |
|---|---|
| `ComposioToolVersionRequiredError` / "Toolkit version not specified" | [Composio §1](#composio-1-toolkit-versioning) |
| Generic `Error executing the tool <SLUG>` with no detail | [Composio §2](#composio-2-surfacing-real-error-cause) |
| HTTP 413 "Upstream_PayloadTooLarge" | [Composio §3](#composio-3-payload-size-cap-on-gmail_fetch_emails) |
| `Invalid request data... 'recipient_email' must be provided` on a thread reply | [Composio §4](#composio-4-gmail-tool-param-name-inconsistencies) |
| Reply email sent but body is empty | [Composio §4](#composio-4-gmail-tool-param-name-inconsistencies) |
| State markers (HTML comments) missing on fetched message body | [Composio §5](#composio-5-top-level-body-is-textplain) |
| HTTP 403 "insufficient authentication scopes" after granting scopes | [Composio §6](#composio-6-scopes-config-time-vs-grant-time) |
| Tool execution silently times out from Vercel/Cloudflare | [Composio §7](#composio-7-egress-filtering) |
| API key gives "no permission" but was just created | [Composio §8](#composio-8-default-ip-restrictions-may-2026-incident) |
| 307 redirect when hitting Composio MCP URL | [Composio §9](#composio-9-mcp-endpoint-mcp-suffix) |
| "Cannot find module trigger.config.mjs" on deploy | [Trigger.dev §1](#triggerdev-1-paths-with-spaces-break-deploy) |
| Indexer fails with "env var is required" at deploy time | [Trigger.dev §2](#triggerdev-2-lazy-client-initialization) |
| esbuild can't resolve `chromium-bidi` | [Trigger.dev §3](#triggerdev-3-playwright-core-bundling) |
| Debug-level logs not showing in dashboard | [Trigger.dev §4](#triggerdev-4-default-log-level-is-log-not-debug) |
| Task in Prod can't read env var set in Dev | [Trigger.dev §5](#triggerdev-5-env-vars-are-per-environment) |
| State passed via email body roundtrip is silently empty | [Patterns §1](#patterns-1-email-stateful-workflows) |

---

# Composio (`@composio/core` v3)

## Composio §1 — Toolkit versioning

**Symptom:** `ComposioToolVersionRequiredError: Toolkit version not specified. For
manual execution of the tool please pass a specific toolkit version`

**Cause:** As of `@composio/core` v0.2.0+ (and Python SDK v0.9.0+), every direct
`composio.tools.execute()` call must explicitly resolve to a concrete toolkit version.
Passing `version: "latest"` alone is **not** sufficient — "latest" isn't a resolved
snapshot, so the SDK throws.

**Fix (recommended for resilience):**
```ts
await composio.tools.execute(slug, {
  userId,
  arguments: args,
  version: "latest",
  dangerouslySkipVersionCheck: true,
} as any);
```
`dangerouslySkipVersionCheck: true` lets Composio's backend resolve "latest" to the
current snapshot. Cast to `any` because the TS types may not expose this flag publicly.

**Alternative (deterministic):** pin a concrete date string, e.g.
`version: "20251027_00"`. Fragile because dates drift as Composio publishes new
snapshots; ops can rotate via env var `COMPOSIO_TOOLKIT_VERSION_<UPPERCASE_SLUG>`.

**Also valid:** pin at SDK construction:
```ts
new Composio({ toolkitVersions: { gmail: "latest" } });
```
But this didn't reliably override the per-call check in our testing; per-call wins.

## Composio §2 — Surfacing real error cause

**Symptom:** `Error executing the tool GMAIL_FETCH_EMAILS` with no detail in `.message`.

**Cause:** `ComposioToolExecutionError` (extends `ComposioError`) wraps the real
`APIError` inside `.cause`. The base error exposes:
- `.message` — generic wrapper text
- `.code` — e.g. `'TS-SDK::TOOL_EXECUTION_ERROR'`
- `.statusCode` — HTTP status
- `.errorId` — Composio-internal id
- `.meta` — metadata
- `.possibleFixes` — string array of suggestions
- `.cause` — the wrapped APIError with the real Composio backend response

**Fix:** Always extract `.cause` in your catch block:
```ts
catch (e: any) {
  const cause = e?.cause;
  const causeBody =
    cause?.error ?? cause?.response?.data ?? cause?.body ?? null;
  logger.error(`composio.${slug} threw`, {
    message: e?.message,
    code: e?.code,
    statusCode: e?.statusCode,
    possibleFixes: e?.possibleFixes,
    causeMessage: cause?.message,
    causeBody,
    causeLogId: cause?.log_id ?? cause?.error?.log_id,
  });
  throw new Error(`Composio ${slug} failed: ${e?.message} | cause=${JSON.stringify(causeBody)}`);
}
```

**Also:** Composio sometimes returns a non-throwing 200 with `{successful: false, error}`.
Check `result.successful === false` and surface it as an error too — otherwise you
silently get `data.messages = undefined` and the next layer fails confusingly.

**`log_id` is your dashboard handle.** When you see `log_id` in any error response,
look it up at the Composio dashboard → Logs page for the unwrapped upstream error.

## Composio §3 — Payload size cap on GMAIL_FETCH_EMAILS

**Symptom:** HTTP 413 `Upstream_PayloadTooLarge` from `GMAIL_FETCH_EMAILS` with
`include_payload: true`.

**Cause:** Composio's edge caps response payload around ~50–100 messages-with-full-payload
depending on individual message sizes (HTML body + headers + attachments).

**Fix — paginate via `page_token`:**
```ts
let pageToken: string | undefined;
const all = [];
while (all.length < target) {
  const args = { query, max_results: 40, include_payload: true };
  if (pageToken) args.page_token = pageToken;
  const r: any = await composio.tools.execute("GMAIL_FETCH_EMAILS", { ... args }, ...);
  const messages = r?.data?.messages ?? [];
  all.push(...messages);
  pageToken =
    r?.data?.next_page_token ??
    r?.data?.nextPageToken ??
    r?.next_page_token ??
    r?.nextPageToken;
  if (!pageToken || messages.length === 0) break;
}
```

Probe multiple cursor field names — Composio's response shape isn't consistent across
versions. Use **page size ~40** to leave margin for emails with attachments.

## Composio §4 — Gmail tool param name inconsistencies

Composio's Gmail toolkit uses **inconsistent param names** across tools. Common pitfalls:

| Tool | Body param | Other notes |
|---|---|---|
| `GMAIL_FETCH_EMAILS` | n/a | `query`, `max_results`, `include_payload`, `page_token` (snake_case) |
| `GMAIL_SEND_EMAIL` | **`body`** | `recipient_email`, `subject`, `is_html` |
| `GMAIL_REPLY_TO_THREAD` | **`message_body`** ⚠️ | `thread_id`, **also requires `recipient_email`** even though it's a thread reply, `is_html` |

**Critical:**
- `GMAIL_REPLY_TO_THREAD` uses **`message_body`**, not `body`. Passing `body` is silently
  accepted as unknown — the email gets sent but with empty content.
- `GMAIL_REPLY_TO_THREAD` also requires `recipient_email` (returns
  `"At least one of 'recipient_email', 'cc', or 'bcc' must be provided"` 400 if missing).
- `GMAIL_REPLY_TO_THREAD` does **not** add a "Re:" prefix to the subject. Your reply's
  subject equals the original thread's subject — you cannot identify your own replies
  by subject regex.

**Symptom of the empty-body bug:** the reply email arrives in the recipient's inbox
but contains only Gmail's auto-quoted parent message, no original content.

## Composio §5 — Top-level `body` is text/plain

**Symptom:** HTML state markers (e.g. `<!--MY_STATE:base64-->`) missing from fetched
message bodies, even though you embedded them in the sent HTML.

**Cause:** `GMAIL_FETCH_EMAILS` exposes a top-level `body` field that's the
**text/plain rendition** — Gmail regenerates text/plain from HTML on storage and **strips
all HTML comments** in the process. The text/html part with your markers lives in
`payload.parts[]`, often inside a nested `multipart/alternative` container.

**Fix — recursive part walker:**
```ts
function extractBody(raw: any): string {
  const collected = { html: [] as string[], plain: [] as string[] };
  collectParts(raw.payload, collected);
  // Prefer html that contains your marker
  const htmlWithMarker = collected.html.find(h => h.includes("MY_STATE_MARKER"));
  if (htmlWithMarker) return htmlWithMarker;
  if (collected.html.length) return collected.html[0];
  // Fall through to plain text / convenience fields
  if (collected.plain.length) return collected.plain[0];
  if (typeof raw.body === "string") return raw.body;
  return "";
}

function collectParts(node: any, out: { html: string[]; plain: string[] }): void {
  if (!node || typeof node !== "object") return;
  const mime = String(node.mimeType ?? "").toLowerCase();
  if (mime === "text/html" && node.body?.data) {
    out.html.push(decodeB64Url(node.body.data));
  } else if (mime === "text/plain" && node.body?.data) {
    out.plain.push(decodeB64Url(node.body.data));
  }
  if (Array.isArray(node.parts)) for (const p of node.parts) collectParts(p, out);
}

const decodeB64Url = (s: string) =>
  Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
```

**Do not use the top-level `body` field for state-carrying content.** It will silently
strip your markers.

## Composio §6 — Scopes: config-time vs grant-time

**Symptom:** HTTP 403 `Request had insufficient authentication scopes` even though you
verified the auth config has the scopes you need.

**Cause:** Composio's Auth Configuration UI shows the scopes that will be **requested**
on the next OAuth flow. An existing user's connected account has whatever scopes
Google granted **at the time they originally connected** — adding scopes to the auth
config does **not** retroactively upgrade existing OAuth tokens.

**Fix:** Disconnect and reconnect the user's account. On the next OAuth flow, Google
shows the new (broader) consent screen; the user accepts; the new grant has the new
scopes.

In Composio dashboard: **Auth Configurations** → click the toolkit → **Connected Accounts**
sub-tab → find the user → **Disconnect / Delete** → re-initiate the connection.

For Gmail full access, the umbrella scope is `https://mail.google.com/` — covers
read, send, modify in one. Narrower scopes work too if you want least-privilege.

## Composio §7 — Egress filtering

**Symptom:** Composio API calls work from your laptop / Trigger.dev / Render, but
**silently time out** from Vercel or Cloudflare Workers (no response at all, request
just hangs until the proxy times out).

**Cause:** Composio's edge applies bot/abuse filtering that drops POSTs from certain
serverless egress IP ranges. Vercel and Cloudflare are in the blocked set as of
mid-2026; Trigger.dev (AWS) and direct residential traffic are not.

**Fix:** Do not deploy Composio-touching code to Vercel or Cloudflare Workers. Use
Trigger.dev, Render, Fly.io, a real VPS, or any AWS-backed runtime.

**Verification probe** (run from the platform you want to test):
```ts
const r = await fetch("https://backend.composio.dev/api/v3/...", {
  method: "POST",
  headers: { "x-api-key": process.env.COMPOSIO_API_KEY },
  body: JSON.stringify({ ... }),
});
console.log("status", r.status, "time", Date.now() - start);
```
If it returns within 1s with a 2xx/4xx, egress is fine. If it hangs 25s+ and you get
a function timeout, you're filtered.

## Composio §8 — Default IP restrictions (May 2026 incident)

**Context:** Composio had a security incident in May 2026. As mitigation, all API keys
created before 2026-05-23 were deleted, and new keys for orgs created on/after
2026-03-05 now default to **IP-restricted** (only IPs that the org used in the prior
two weeks can use the key).

**Symptom:** Newly-created API key works from your laptop but fails (often as a
generic error) when called from cloud infrastructure.

**Fix:** When creating an API key in Composio dashboard, explicitly select
**"No restriction"** in the IP Allowlist column. Verify in the API Keys list — the
column should show "No restriction" (not a list of IPs).

For static-IP environments (a single fixed-IP VPS, for example), keep the restrictions
and add the egress IP — slightly safer.

## Composio §9 — MCP endpoint `/mcp` suffix

**Symptom:** A Composio MCP URL retrieved from `composio.mcp.generate()` returns HTTP
307 redirect when you POST to it.

**Cause:** The URL `composio.mcp.generate()` returns is a redirect stub. The actual
streamable HTTP endpoint has an extra `/mcp` segment before the query string:

- Returned: `https://backend.composio.dev/v3/mcp/<UUID>?include_composio_helper_actions=...`
- Actual:  `https://backend.composio.dev/v3/mcp/<UUID>/mcp?include_composio_helper_actions=...`

**Fix:** Append `/mcp` to the path before the query string. Some HTTP clients follow
the redirect cleanly but serverless proxies often don't, causing silent stalls. Better
to point at the canonical URL directly.

```ts
function ensureMcpSuffix(url: string): string {
  if (url.includes("/mcp?") || url.endsWith("/mcp")) return url;
  if (url.includes("?")) {
    const [base, query] = url.split("?");
    return `${base.replace(/\/$/, "")}/mcp?${query}`;
  }
  return url.replace(/\/$/, "") + "/mcp";
}
```

**Bonus:** Composio MCP requires the `x-api-key` header to be sent (project-level
`require_mcp_api_key` setting controls this; defaults to `true` post-incident). Toggling
this off in the dashboard doesn't always take effect in practice — verify with a curl
probe before assuming.

## Composio §10 — Connection lifecycle

**Connection status** (find in dashboard → Auth Configurations → toolkit → Connected
Accounts):

| Status | Meaning | Tool execution works? |
|---|---|---|
| `ACTIVE` | OAuth complete, tokens valid | Yes |
| `INITIATED` | OAuth started but user hasn't completed | **No** (silent failure) |
| `EXPIRED` | Tokens expired, can't refresh | **No** |
| `FAILED` | Auth attempt failed | **No** |
| `INACTIVE` | Manually disabled via API | **No** |

**Before debugging anything else**, verify the user's connection shows `ACTIVE` in
the dashboard. Tool execution against any non-ACTIVE connection often fails with the
same generic "Error executing the tool" wrapper as everything else.

**`pg-test-` user_id prefix** = connection created via Composio's dashboard
"Connect Apps" flow. It works for tool execution; you don't need to recreate via SDK.
But per GH `ComposioHQ/composio#3270`, dashboard-created connections under unusual
auth configs can occasionally be linkable but non-executable — if you see weird
generic errors with an ACTIVE connection, recreate via SDK as a sanity check.

---

# Trigger.dev (v4)

## Trigger.dev §1 — Paths with spaces break deploy

**Symptom:** `npx trigger.dev@latest deploy` fails with:
```
Error: Cannot find module '/app/My%20Folder/trigger-probe/trigger.config.mjs'
```
Note the `%20` — that's a URL-encoded space.

**Cause:** Trigger.dev's bundler URL-encodes the project path when generating the
internal `trigger.config.mjs` import path. Node's ESM loader can't resolve the encoded
URL back to a filesystem path.

**Fix:** Don't put Trigger.dev projects (or any ancestor directory) under a path
containing spaces. Rename `My Folder` → `My_Folder`. There's no escape-hatch flag for
this; it's the bundler's behavior.

## Trigger.dev §2 — Lazy client initialization

**Symptom:** Deploy fails with `TaskIndexingImportError: COMPOSIO_USER_ID env var is
required` — the deploy is throwing on a check meant for runtime.

**Cause:** Trigger.dev's "indexer" runs at deploy time on Trigger.dev's build server
and **imports your task files to discover them**. Your runtime env vars (set in the
dashboard) are not available during indexing. Any module-top-level code that reads
or asserts on `process.env.X` will throw and break the deploy.

**Fix:** Defer all client construction and env-var checks to **inside** functions:

```ts
// ❌ BAD — throws at deploy-time indexing
const composio = new Composio();
const USER_ID = process.env.COMPOSIO_USER_ID;
if (!USER_ID) throw new Error("...");

// ✅ GOOD — lazy
let _composio: Composio | null = null;
function composio(): Composio {
  if (!_composio) _composio = new Composio();
  return _composio;
}
function userId(): string {
  const u = process.env.COMPOSIO_USER_ID;
  if (!u) throw new Error("COMPOSIO_USER_ID env var is required");
  return u;
}
```

Apply this to **every** SDK constructor and env-var assertion: Composio, Anthropic,
Browserbase, your own helpers.

## Trigger.dev §3 — Playwright-core bundling

**Symptom:** Deploy build fails with:
```
Could not resolve "chromium-bidi/lib/cjs/bidiMapper/BidiMapper"
Could not resolve "chromium-bidi/lib/cjs/cdp/CdpConnection"
```

**Cause:** `playwright-core` ships a pre-bundled file that references `chromium-bidi`'s
internals esbuild can't resolve. The bundler tries to bundle playwright-core and trips
on its giant transitive dep tree.

**Fix:** Mark `playwright-core` as external in `trigger.config.ts`:
```ts
export default defineConfig({
  // ...
  build: {
    external: ["playwright-core"],
  },
});
```

This tells the bundler to leave `playwright-core` in `node_modules` rather than
bundling it. Trigger.dev's runtime loads it at task execution time from the package.

**Note:** If you're using Browserbase or another remote browser via
`chromium.connectOverCDP()`, you only need playwright-core for the JS API — no local
Chromium binary required, so marking it external is sufficient. If you actually need
a local browser, also use Trigger.dev's official Playwright build extension
(`@trigger.dev/build/extensions/playwright`).

## Trigger.dev §4 — Default log level is "log", not "debug"

**Symptom:** `logger.debug(...)` calls don't show up in the dashboard's Logs tab.

**Cause:** Trigger.dev's default `logLevel` in `defineConfig` is `"log"`, which filters
out `debug`-level entries.

**Fix:** Either set `logLevel: "debug"` in `trigger.config.ts`, or just use
`logger.info(...)` for anything you want visible by default. `info` shows at the
default level and is appropriate for most diagnostic logging.

```ts
logger.info("descriptive label", { ...structuredFields });
```

Trigger.dev's dashboard renders the structured payload as expandable JSON next to the
log line — favor structured fields over string interpolation.

## Trigger.dev §5 — Env vars are per-environment

**Symptom:** Test run uses env vars you set in "Prod" but errors with `env var X is
required`.

**Cause:** Trigger.dev has separate variable lists per environment (Dev, Prod,
sometimes Staging). The variables don't share. Test runs use whichever environment
is selected on the run page.

**Fix:** Duplicate every env var into both environments unless you have a reason to
differ. The duplication overhead is trivial and you avoid "ran in the wrong env"
mistakes during testing.

## Trigger.dev §6 — Project init wizard has two paths

When you run `npx trigger.dev@latest init`, the wizard asks "Choose how you want to
initialize your project". The options can include:

- **Trigger.dev MCP** — installs the Trigger.dev MCP server into Claude Code (or
  Cursor / Zed). Doesn't scaffold a project. Useful for letting an AI coding session
  trigger / inspect runs.
- **Existing project** / **New project** — scaffolds `package.json`,
  `trigger.config.ts`, `tsconfig.json`. This is what you want for a new project.

If you accidentally pick "Trigger.dev MCP" and the wizard finishes without creating
the config files, re-run `init` and pick the project path. (And if `init` fails partway
through with "Directory already exists", just write `trigger.config.ts` and
`tsconfig.json` by hand — `package.json` and `node_modules/` will already be set up.)

## Trigger.dev §7 — Pin SDK versions exactly

**Symptom:** Deploy warning suggests pinned versions, and intermittent
"`@trigger.dev/sdk` version mismatch" errors during deploy.

**Cause:** The Trigger.dev CLI compares its own version against `@trigger.dev/sdk` and
`@trigger.dev/build` in your project's `package.json`. If you use `^4.4.6`, npm might
install a newer patch version that doesn't match the CLI's expected version.

**Fix:** Pin exactly (no `^` or `~`):
```json
{
  "dependencies": {
    "@trigger.dev/sdk": "4.4.6"
  },
  "devDependencies": {
    "@trigger.dev/build": "4.4.6"
  }
}
```
The CLI will prompt you to do this on first deploy; accept the prompt.

## Trigger.dev §8 — Cron is UTC

`schedules.task({ cron: "0 8 * * 1" })` runs at 08:00 **UTC**, not local time. If you
want 8 AM in Europe/Madrid (UTC+2 in summer), use `cron: "0 6 * * 1"` during DST. For
strict local-time scheduling across DST transitions, Trigger.dev supports `timezone`
in the schedule options — see their docs.

---

# Integration patterns

## Patterns §1 — Email-stateful workflows

When you split a workflow into two tasks connected by an email round-trip — task A
sends an email with embedded state, the user replies, task B fetches state from the
sent email and acts on the reply — there are several non-obvious failure modes.

### Where to put the state

Options ranked by reliability:

1. **External KV** (Upstash Redis, Trigger.dev metadata if cross-run is supported) —
   most reliable. Key by message ID or thread ID. Survives Gmail rendering quirks
   entirely. Costs $0 on free tiers for low volume.
2. **HTML comment in the original sent body** (`<!--MY_STATE:base64-->`) — works if
   you fetch the state from your **own sent message in the Sent folder**. Survives
   Gmail's API roundtrip when read from the `text/html` part of `payload.parts[]`.
   Does **not** survive Gmail's reply-quoting transformation, so you cannot read
   state from the user's reply body.
3. **Hidden styled div** (`<div data-state="..." style="display:none">`) — equivalent
   reliability to HTML comments for the sent-folder case. Slightly more robust because
   visible-but-hidden elements survive some sanitizers that strip comments.
4. **Custom email header** (`X-MyApp-State: base64`) — requires building raw MIME
   yourself; Composio's high-level Gmail tools don't accept custom headers. Preserved
   through send→storage, not preserved in reply quotes.
5. **State encoded in subject line** — survives everything, but >100 bytes of base64
   in a subject breaks UX (Gmail truncates, mail clients refuse to display).

### Key invariant: state lives in the original sent message, not the reply

Gmail strips HTML comments from auto-quoted content when the user replies. Even if
the user's reply body contains a (visually) quoted block showing your digest, the
HTML comment with your state is **gone** from the quoted markup.

So your "execute" task must:
1. Find the user's reply (to detect the trigger).
2. Find the original sent message that started the thread (in your Sent folder).
3. Read state from #2's `text/html` body part.
4. Read the user's intent from #1's body.

Do **not** try to recover state from the reply body — it won't be there.

### Identifying your own messages

Gmail subject prefixing is unreliable for distinguishing your sent messages from
user replies:
- The user's web-client reply usually gets "Re:" prepended (locale-dependent).
- **Composio's `GMAIL_REPLY_TO_THREAD` does not add "Re:".**
- If your app sends to itself (DIGEST_TO = the connected account's own email), then
  both your sends and user replies end up in the Sent folder.

**Reliable approach: identify by content marker, not subject.** Embed a unique string
(e.g. `MYAPP_STATE_MARKER` for the digest, `MYAPP_REPLY_MARKER` for your own thread
replies) and filter sent-folder messages by body content. The marker is present in
your originals, absent from user replies (whose markup Gmail sanitizes on send).

### Avoiding double-execution

If your "execute" task runs on a polling schedule, you need to detect "I've already
handled this thread" to avoid re-replying. The simplest approach: include a different
unique marker (`MYAPP_REPLY_MARKER`) in every reply you send. On each polling run,
check the thread for any sent message containing that marker — if present, you've
already handled it.

When your app sends to itself, the user's reply also ends up in Sent. **Don't** use
"any sent message in the thread after the trigger" as your "already handled" check;
the user's reply triggers it incorrectly. Use the content marker.

## Patterns §2 — Composio + Trigger.dev combination

**Why this stack works well:**
- Trigger.dev's AWS-backed egress isn't in Composio's blocked set ([Composio §7](#composio-7-egress-filtering)).
- Trigger.dev's structured logging maps naturally to Composio's error-surfacing pattern.
- Both have decent free tiers for personal/internal tools.

**Setup checklist for a fresh project:**
1. Compose env-var list: `COMPOSIO_API_KEY`, `COMPOSIO_USER_ID` (the connection's
   user_id, often UUID), `COMPOSIO_TOOLKIT_VERSION_<SLUG>` (optional).
2. Set them in both Dev and Prod environments in the Trigger.dev dashboard.
3. Lazy client construction at every `@composio/core` instantiation.
4. Wrap every `composio.tools.execute()` in a helper that:
   - Adds `version: "latest"` + `dangerouslySkipVersionCheck: true`
   - Catches and logs all error properties including `.cause`
   - Detects `result.successful === false` and surfaces as an error
5. Use snake_case for Gmail tool arguments. Reference the toolkit page for each tool's
   exact param names — they're not consistent across the toolkit.
6. For tasks that need >50 messages, write a paginated helper using `page_token`.

## Patterns §3 — Surfacing errors loudly

A recurring pattern across both libraries: **generic outer error messages hide the
real cause.** Be aggressive about extracting and logging diagnostic detail.

```ts
async function execWithDiagnostics<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const result = await fn();
    return result;
  } catch (e: any) {
    logger.error(`${label} threw`, {
      message: e?.message,
      name: e?.name,
      code: e?.code,
      statusCode: e?.statusCode,
      possibleFixes: e?.possibleFixes,
      causeMessage: e?.cause?.message,
      causeBody: e?.cause?.error ?? e?.cause?.response?.data ?? null,
      causeLogId: e?.cause?.log_id,
      stack: e?.stack,
    });
    throw e;
  }
}
```

Wrap any third-party SDK call in something like this during development. Once you've
seen the error shape once and understood what fields actually carry signal, you can
prune the log.

---

# Notes for AI coding agents reading this file

When working on a project that uses this stack, your highest-leverage moves are:

1. **Read the symptom table at the top first.** Most failures match a known pattern.
2. **Surface error detail before guessing.** A generic "Error executing the tool" message
   tells you nothing; the `.cause` chain tells you everything. Apply [Patterns §3](#patterns-3-surfacing-errors-loudly)
   reflexively when something fails.
3. **Verify connection status and IP-restriction settings before debugging code.**
   These are configuration issues, not bugs in your wrapper.
4. **Defer SDK construction** at module top-level. Trigger.dev's indexer is allergic
   to anything that reads env vars at import time.
5. **For Gmail-state workflows, read state from the original sent message, not the reply.**
   This is a hard invariant; many designs reflexively try to scrape state from the reply
   and silently fail.
6. **When something "should work" but doesn't, suspect Composio's surface area is
   shifting.** Check the changelog and the Gmail toolkit reference page for current
   param names and tool slugs — they evolve.
