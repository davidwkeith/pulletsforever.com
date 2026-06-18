# Anglesite Re-platform — Phase 4: Worker Restructure + Cloudflare Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Move the content-negotiation worker `workers/site/` → `worker/` (template structure) and convert `wrangler.toml` → `wrangler.jsonc` — preserving the `Accept: text/markdown` content negotiation and all current serving behavior, with **no deploy** (Phase 6) and **no D1/R2/Queues yet** (Phase 5).

> **AMENDMENT (during execution):** Adding the `@astrojs/cloudflare` adapter (Task 2 below) was attempted but **reverted**. Empirically it split `dist/` into `dist/client/` + `dist/server/` and emitted its own `wrangler.json` (`main: entry.mjs`, `assets: ../client`), trying to replace the custom worker as the deploy entrypoint — which breaks the static-assets + content-negotiation-worker model (and `wrangler deploy` could no longer find the HTML). Confirmed the same split occurs with the template's own config. The adapter is unnecessary for a 100% static Astro site served by a custom worker (Astro never SSRs here; IndieWeb is worker-handled). **Phase 4 shipped as the structural move only, no adapter.**

**Architecture:** The site stays 100% static Astro served by a custom Workers-Static-Assets worker (the adapter is added for template fidelity but is functionally inert while all routes are prerendered — the template proves `output: "static"` + `cloudflare()` is a supported combo). The existing content-negotiation worker is re-homed and renamed `worker/site-entry.ts`, keeping its logic and TypeScript tests. D1/R2/Queue bindings and the template's full IndieWeb `site-entry.js` are Phase 5.

**Tech Stack:** @astrojs/cloudflare 13.5.0, wrangler 4, Astro 6 (static), Cloudflare Workers Static Assets.

**Reference:** spec `docs/superpowers/specs/2026-06-17-anglesite-1.1.0-replatform-design.md`; template `~/.claude/plugins/cache/anglesite/anglesite/1.1.0/template/`.

---

## Scope decisions

1. ~~**Adapter included**~~ → **Adapter dropped** (see amendment above). Task 2 was executed then reverted; the site stays static-Astro + custom worker with flat `dist/`.
2. **Worker stays TypeScript** — the existing worker + its 7 vitest tests are TS; preserve them (don't convert to JS). The template ships `.js`, but adopting *our* content-negotiation logic in TS keeps the tests and types. The dir/name align with the template (`worker/site-entry.ts`).
3. **No D1/R2/Queues / no `@dwk/*` IndieWeb packages** in this phase — `wrangler.jsonc` carries only the ASSETS binding. Phase 5 swaps in the template's full `site-entry.js` (merging content negotiation) and provisions infra.
4. **No deploy** — gate validates with `wrangler deploy --dry-run` only.

---

## File Structure

- **Move** `workers/site/` → `worker/` (git mv); rename `index.ts` → `site-entry.ts`, `index.test.ts` → `site-entry.test.ts`. Keep `package.json`, `tsconfig.json`, `vitest.config.ts`.
- **Modify** `worker/site-entry.test.ts` — update the import path `./index.ts` → `./site-entry.ts`.
- **Create** `wrangler.jsonc`; **delete** `wrangler.toml`.
- **Modify** `astro.config.ts` — import + add the `cloudflare` adapter; set `output: "static"` explicitly.
- **Modify** `package.json` — `test` script `--prefix workers/site` → `--prefix worker`; add `@astrojs/cloudflare` dep.

---

## Task 1: Re-home the worker and convert wrangler config

**Files:** move `workers/site/` → `worker/`; modify `worker/site-entry.test.ts`, `package.json`; create `wrangler.jsonc`; delete `wrangler.toml`.

- [ ] **Step 1: Move and rename via git**

```bash
cd /Users/dwk/Developer/github.com/pulletsforever.com/.claude/worktrees/replatform
git mv workers/site worker
git mv worker/index.ts worker/site-entry.ts
git mv worker/index.test.ts worker/site-entry.test.ts
rmdir workers 2>/dev/null || true
ls worker/
```
Expected: `worker/` contains `site-entry.ts`, `site-entry.test.ts`, `package.json`, `tsconfig.json`, `vitest.config.ts` (and a moved `node_modules`/`package-lock.json`). The `workers/` parent is gone.

- [ ] **Step 2: Fix the test import path**

In `worker/site-entry.test.ts`, line 2 reads `import worker from "./index.ts";`. Change it to:
```ts
import worker from "./site-entry.ts";
```

- [ ] **Step 3: Ensure worker deps + run the worker tests from the new path**

```bash
npm install --prefix worker
npm test --prefix worker 2>&1 | grep -E "Tests|passed|failed"
```
Expected: `7 passed`. These tests exercise the content-negotiation logic, so passing here confirms it survived the move.

- [ ] **Step 4: Update the root `test` script**

In `package.json`, change `"test": "npm test --prefix workers/site"` to `"test": "npm test --prefix worker"`.

- [ ] **Step 5: Create `wrangler.jsonc`** (repo root) with EXACTLY this content (a faithful conversion of `wrangler.toml`, `main` repointed, `run_worker_first` preserved for content negotiation):

```jsonc
{
  // Wrangler config for the Cloudflare Workers Static Assets deployment.
  // The worker (worker/site-entry.ts) runs first on every request
  // (run_worker_first) so it can do Accept: text/markdown content negotiation
  // before falling through to the static assets in dist/.
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "pulletsforever-com",
  "compatibility_date": "2026-02-18",
  "main": "worker/site-entry.ts",
  "upload_source_maps": true,
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "run_worker_first": true
  },
  "observability": {
    "enabled": false,
    "head_sampling_rate": 1,
    "logs": {
      "enabled": true,
      "head_sampling_rate": 1,
      "persist": true,
      "invocation_logs": true
    },
    "traces": {
      "enabled": true,
      "persist": true,
      "head_sampling_rate": 1
    }
  }
}
```

- [ ] **Step 6: Delete `wrangler.toml`**

```bash
git rm wrangler.toml
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move worker to worker/site-entry.ts; wrangler.toml -> wrangler.jsonc"
```

---

## Task 2: Add the Cloudflare adapter — ⚠️ EXECUTED THEN REVERTED (see amendment at top)

> Kept for the record. The adapter broke the serving model (dist/ client/server split); commit `445dbcc` was reset off the branch. Skip this task.

**Files:** `astro.config.ts`, `package.json`.

- [ ] **Step 1: Add the dependency**

In `package.json` `dependencies`, add `"@astrojs/cloudflare": "13.5.0"`. Then `npm install` (expect clean install against Astro 6.3.1).

- [ ] **Step 2: Wire the adapter into `astro.config.ts`**

Add the import after the existing `import keystatic from "@keystatic/astro";` line:
```ts
import cloudflare from "@astrojs/cloudflare";
```
In the `defineConfig({ ... })` object, add an explicit `output` and an `adapter` (place `output` near `site`, and `adapter` as the last property):
```ts
  output: "static",
```
```ts
  // Cloudflare adapter is wired for production builds only — its dev-mode
  // routing conflicts with Astro 6.3.x. With all routes prerendered it emits
  // no SSR worker; worker/site-entry.ts remains the wrangler `main`.
  adapter: isDev ? undefined : cloudflare({ prerenderEnvironment: "node" }),
```
Change nothing else (keep `react()`, `markdoc()`, dev-only `keystatic()`, `sitemap()`, `vite`, `build`).

- [ ] **Step 3: Build must stay static at 51 pages**

```bash
npm run build 2>&1 | tail -3
ls dist/_worker.js 2>/dev/null && echo "WARNING: _worker.js present" || echo "no _worker.js (all static, expected)"
find dist -name '*.html' | wc -l
```
Expected: `51 page(s) built` / `Complete!`, **51** html files, and **no `dist/_worker.js`** (all routes prerendered → the adapter emits no SSR worker). If `_worker.js` IS emitted, report it — we then need to confirm it is excluded from asset serving (Workers Static Assets ignores `_worker.js`) or adjust; do not silently ship an exposed worker file.

- [ ] **Step 4: Commit**

```bash
git add astro.config.ts package.json package-lock.json
git commit -m "build: add @astrojs/cloudflare adapter (production builds)"
```

---

## Task 3: Final Phase 4 gate

**Files:** none (verification).

- [ ] **Step 1: Full green check**

```bash
npm run build 2>&1 | tail -2          # 51 page(s) / Complete!
npm test 2>&1 | grep -E "Tests|passed" # 7 passed (via --prefix worker)
npm run typecheck 2>&1 | tail -4      # 0 errors, 0 warnings (5 vendored hints OK)
npm run predeploy 2>&1 | tail -1      # Pre-deploy security scan passed.
grep ANGLESITE_VERSION .site-config   # still 1.0.0-beta.6
```

- [ ] **Step 2: Validate the wrangler config + worker bundle (dry-run, NO deploy)**

```bash
npm run deploy:preview 2>&1 | tail -15
```
(`deploy:preview` = `npm run build && wrangler deploy --dry-run`.) Expected: wrangler parses `wrangler.jsonc`, bundles `worker/site-entry.ts`, recognizes the ASSETS binding, and reports a successful dry-run (no upload). If wrangler errors on the jsonc schema or the TS entry, fix and re-run. A warning about no account/route is fine (dry-run).

- [ ] **Step 3: Confirm content negotiation is preserved (worker test coverage)**

The 7 worker tests in `worker/site-entry.test.ts` cover the `Accept: text/markdown` → `index.md` path and the `Vary: accept` HTML stamping. Confirm they all pass (Step 1 already ran them); spot-read the test names:
```bash
npm test --prefix worker 2>&1 | grep -iE "markdown|vary|accept|✓" | head
```

---

## Gate Summary (Phase 4 done when ALL hold)

- `worker/site-entry.ts` is the worker; `workers/` is gone; `wrangler.jsonc` replaces `wrangler.toml` with `main: worker/site-entry.ts` and `run_worker_first: true`.
- `astro.config.ts` has the `cloudflare()` adapter (production-only) + explicit `output: "static"`.
- `npm run build` → 51 static pages, **no `dist/_worker.js`**; `npm test` → 7/7; `astro check` → 0 errors / 0 warnings (5 vendored hints OK); `npm run predeploy` → passes.
- `npm run deploy:preview` (wrangler dry-run) succeeds.
- `ANGLESITE_VERSION` still `1.0.0-beta.6`.
