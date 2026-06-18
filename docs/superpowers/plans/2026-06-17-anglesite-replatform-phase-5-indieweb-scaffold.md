# Anglesite Re-platform — Phase 5: Inbound IndieWeb (Scaffold) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the worker IndieWeb-ready by adopting the template's full `site-entry.js` (IndieAuth / Micropub / Webmention handlers, all gated on D1 bindings) **with the existing `Accept: text/markdown` content negotiation merged in**, plus the `@dwk/*` packages and support files. Everything stays **inert** (no bindings → serves exactly as today). Actual provisioning is deferred to the owner via `/anglesite:indieweb` (see runbook).

**Architecture:** The site stays static Astro + custom Workers-Static-Assets worker. `worker/site-entry.ts` (minimal content-neg, TS) is replaced by the template's `worker/site-entry.js` (JS), with the content-negotiation helpers ported into it so behavior is preserved. The `@dwk/*` handlers are instantiated at module top level and dispatched only when their D1 binding is present — absent bindings mean the IndieWeb code never runs.

**Tech Stack:** @dwk/indieauth, @dwk/micropub, @dwk/webmention (0.1.0-beta.2, ESM), Cloudflare Workers.

**Reference:** spec `docs/superpowers/specs/2026-06-17-anglesite-1.1.0-replatform-design.md`; template `~/.claude/plugins/cache/anglesite/anglesite/1.1.0/template/worker/`; provisioning skill `~/.claude/plugins/cache/anglesite/anglesite/1.1.0/skills/indieweb/SKILL.md`.

---

## Scope decisions

1. **Full template `site-entry.js`** (owner's "full template" choice) — includes gated membership / A/B / consent / webmention-edge-render code in addition to IndieWeb. All dormant until their bindings/vars exist. Adopted verbatim except the content-negotiation merge.
2. **Content negotiation preserved** — the current worker's `contentNegotiation()` + `addVaryHeader()` are ported into `site-entry.js` and run first; the 7 worker tests must still pass.
3. **No bindings, no provisioning** — `wrangler.jsonc` gets NO D1/R2/Queue blocks in this phase; `/anglesite:indieweb` adds them at provision time. Worker stays deployable as an assets-only worker.
4. **Worker becomes JS** — matches the template (and what `/anglesite:indieweb` expects). The TS test stays but imports the `.js` module.

---

## File Structure

- **Delete** `worker/site-entry.ts`; **create** `worker/site-entry.js` (template version + content-neg merge).
- **Create** `worker/indieweb-bridge.js`, `worker/_premium-routes.json` (`[]`) — copied from template.
- **Modify** `worker/site-entry.test.ts` — import `./site-entry.js`; mock `@dwk/*` if needed (see Task 2).
- **Modify** `package.json` — add `@dwk/*` deps.
- **Modify** `wrangler.jsonc` — `main` → `worker/site-entry.js`.

---

## Task 1: Add deps + worker support files

**Files:** `package.json`; create `worker/indieweb-bridge.js`, `worker/_premium-routes.json`.

- [ ] **Step 1: Add the @dwk dependencies**

In root `package.json` `dependencies`, add:
```json
"@dwk/indieauth": "0.1.0-beta.2",
"@dwk/micropub": "0.1.0-beta.2",
"@dwk/webmention": "0.1.0-beta.2"
```
Then `npm install`. Expect a clean install (ESM, no peer deps).

- [ ] **Step 2: Copy the worker support files verbatim**

```bash
cd /Users/dwk/Developer/github.com/pulletsforever.com/.claude/worktrees/replatform
cp ~/.claude/plugins/cache/anglesite/anglesite/1.1.0/template/worker/indieweb-bridge.js worker/indieweb-bridge.js
cp ~/.claude/plugins/cache/anglesite/anglesite/1.1.0/template/worker/_premium-routes.json worker/_premium-routes.json
cat worker/_premium-routes.json   # expect: []
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json worker/indieweb-bridge.js worker/_premium-routes.json
git commit -m "build: add @dwk IndieWeb packages + worker support files"
```

---

## Task 2: Adopt template site-entry.js with content negotiation merged

**Files:** delete `worker/site-entry.ts`; create `worker/site-entry.js`; modify `worker/site-entry.test.ts`, `wrangler.jsonc`.

- [ ] **Step 1: Replace the worker with the template version**

```bash
cp ~/.claude/plugins/cache/anglesite/anglesite/1.1.0/template/worker/site-entry.js worker/site-entry.js
git rm worker/site-entry.ts
```

- [ ] **Step 2: Merge content negotiation into `worker/site-entry.js`**

(a) Inside `worker.fetch`, immediately after the line `const url = new URL(request.url);` (near the top of the handler), insert:
```js
    // Content negotiation: Accept: text/markdown -> serve the matching index.md
    // (preserved from the pre-1.1.0 worker; runs before any other handling).
    const negotiated = await contentNegotiation(request, url, env);
    if (negotiated) return negotiated;
```
(b) Find the final asset-serving return at the end of `fetch` — the line `return response;` that follows the `if (setCookieHeader) { ... }` block. Change it to:
```js
    return addVaryHeader(response);
```
(c) At the bottom of the file (alongside the other helper functions), add these two helpers verbatim:
```js
// ---------------------------------------------------------------------------
// Content negotiation (Accept: text/markdown -> index.md) — preserved from the
// pre-1.1.0 worker. Serves the per-post markdown emitted by [slug]/index.md.ts.
// ---------------------------------------------------------------------------

async function contentNegotiation(request, url, env) {
  const accept = request.headers.get("accept") || "";
  if (!accept.includes("text/markdown")) return null;

  const mdPath = url.pathname.endsWith("/")
    ? `${url.pathname}index.md`
    : `${url.pathname}.md`;

  const mdUrl = new URL(url);
  mdUrl.pathname = mdPath;
  const mdResponse = await env.ASSETS.fetch(mdUrl.toString());

  if (mdResponse.ok) {
    const body = await mdResponse.text();
    const tokenEstimate = Math.ceil(body.length / 4);
    return new Response(body, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "vary": "accept",
        "x-markdown-tokens": String(tokenEstimate),
        "content-signal": "ai-train=yes, search=yes, ai-input=yes",
      },
    });
  }
  return null;
}

function addVaryHeader(response) {
  if (response.headers.get("content-type")?.includes("text/html")) {
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("vary", "accept");
    return newResponse;
  }
  return response;
}
```

- [ ] **Step 3: Point wrangler at the JS worker**

In `wrangler.jsonc`, change `"main": "worker/site-entry.ts"` to `"main": "worker/site-entry.js"`.

- [ ] **Step 4: Update the worker test import**

In `worker/site-entry.test.ts`, change line 2 `import worker from "./site-entry.ts";` to `import worker from "./site-entry.js";`.

- [ ] **Step 5: Run the worker tests; handle the test environment if needed**

```bash
npm test --prefix worker 2>&1 | tail -20
```
Expected: `7 passed` (content-negotiation behavior unchanged). 

**Contingency:** `site-entry.js` instantiates the `@dwk/*` handlers at module top level (`createIndieAuth()` etc.) and uses Worker globals (`HTMLRewriter`) inside functions. If importing the worker throws in vitest's node environment (e.g. a `@dwk/*` top-level call or a missing Worker global), add module mocks at the top of `worker/site-entry.test.ts` (the content-negotiation tests don't exercise these):
```ts
import { vi } from "vitest";
vi.mock("@dwk/indieauth", () => ({ createHandler: () => () => new Response(null) }));
vi.mock("@dwk/micropub", () => ({ createHandler: () => () => new Response(null) }));
vi.mock("@dwk/webmention", () => ({ createHandler: () => Object.assign(() => new Response(null), { queue: async () => {}, scheduled: async () => {} }) }));
```
Re-run until `7 passed`. Do not weaken the content-negotiation assertions.

- [ ] **Step 6: Commit**

```bash
git add worker/site-entry.js worker/site-entry.test.ts wrangler.jsonc
git commit -m "feat: adopt template site-entry.js worker with content negotiation merged"
```

---

## Task 3: Final gate

**Files:** none (verification).

- [ ] **Step 1: Full green check**

```bash
npm run build 2>&1 | tail -2          # 51 page(s) / Complete!
npm test 2>&1 | grep -E "Tests|passed" # 7 passed
npm run typecheck 2>&1 | tail -4      # 0 errors, 0 warnings (5 vendored hints OK)
npm run predeploy 2>&1 | tail -1      # Pre-deploy security scan passed.
grep ANGLESITE_VERSION .site-config   # still 1.0.0-beta.6
```

- [ ] **Step 2: wrangler dry-run bundles the new worker (with @dwk imports)**

```bash
rm -rf .wrangler/deploy 2>/dev/null
npm run deploy:preview 2>&1 | tail -12
```
Expected: wrangler bundles `worker/site-entry.js` (pulling in `@dwk/*` + `indieweb-bridge.js`), recognizes the `ASSETS` binding, and the dry-run succeeds. If bundling fails on a `@dwk/*` module (Worker-incompat syntax), report it — that would block the scaffold and need a compatibility flag (`nodejs_compat`) in `wrangler.jsonc`.

- [ ] **Step 3: Confirm IndieWeb is inert (no bindings)**

```bash
grep -c "d1_databases\|r2_buckets\|queues" wrangler.jsonc   # expect 0
```
With no D1/R2/Queue bindings, every IndieWeb guard in `site-entry.js` is false → the worker serves identically to before (content negotiation + static assets only).

---

## Gate Summary (Phase 5 scaffold done when ALL hold)

- `worker/site-entry.js` is the template worker + merged content negotiation; `@dwk/*` deps + `indieweb-bridge.js` + `_premium-routes.json` present; `wrangler.jsonc` `main` → `worker/site-entry.js`, NO D1/R2/Queue bindings.
- `npm run build` → 51 pages; `npm test` → 7/7; `astro check` → 0 errors / 0 warnings; `npm run predeploy` → passes; `npm run deploy:preview` (dry-run) succeeds.
- `ANGLESITE_VERSION` still `1.0.0-beta.6`.

---

## Provisioning runbook (owner — deferred, NOT part of this phase)

To activate inbound IndieWeb later, run **`/anglesite:indieweb`**. Its preflight requires, in `.site-config`:

1. **`CF_PROJECT_NAME`** — set by deploying at least once (`/anglesite:deploy`). Phase 6 / first deploy establishes this.
2. **`GITHUB_REPO`** (`owner/repo`) — set by `/anglesite:backup`. Needed for the Micropub→Git publish bridge.
3. **Custom domain** on `SITE_DOMAIN` (already true: `pulletsforever.com`).

`/anglesite:indieweb` then: provisions D1 (`indieauth`/`micropub`/`webmention`), R2 (`micropub-media`, Micropub only), Queue (`webmention-queue`, Webmention only); wires the bindings into `wrangler.jsonc`; stores secrets (`INDIEAUTH_SIGNING_KEY` via `openssl rand -hex 32`; `GITHUB_TOKEN` fine-grained PAT, contents:write); writes `INDIEWEB_*` flags to `.site-config`. The `@dwk/*` packages self-manage their D1 schemas (auto-migrate on first request). Everything is free-tier.

**Extra prerequisite for Micropub specifically:** Micropub commits new posts as `.mdoc` files under `src/content/notes/`. This project is **posts-only** (no `notes` collection / route), so Micropub-published notes would not render until a `notes` content collection + page route + Keystatic collection are added. Decide whether you want a microblog before enabling Micropub; IndieAuth and Webmention work without it.

**Endpoint switch:** Once enabled, update `src/site.config.ts` to advertise the self-hosted endpoints (`authorization_endpoint`/`token_endpoint` → your domain; `webmention` → your domain) instead of the current external services (`indieauth.com`, `webmention.io`). `/anglesite:indieweb` may handle this; verify the head links after running it.
