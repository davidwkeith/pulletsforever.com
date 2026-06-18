# Anglesite Re-platform — Phase 1: Astro 5→6 + Markdoc 1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `pulletsforever.com` from Astro 5.18 to Astro 6.3.1 (and `@astrojs/markdoc` 0.14→1.0.4) with zero change to rendered output, URLs, feeds, or worker behavior — the hard gate that decides whether the full re-platform proceeds in place.

**Architecture:** In-place dependency + minimal-config upgrade on an isolated worktree off `main`. A byte-level snapshot of the current `dist/` is captured first and used as a regression oracle: after upgrading, the new build must differ only in explainable ways (Shiki 4 code-block markup). No Keystatic, React, Cloudflare adapter, or infra in this phase — those are Phases 3–5.

**Tech Stack:** Astro 6.3.1, `@astrojs/markdoc` 1.0.4, `@astrojs/sitemap` 3.7.2, `@markdoc/markdoc` (direct, for feeds), Node 22, Vite 7, Shiki 4.

**Reference:** Design spec at `docs/superpowers/specs/2026-06-17-anglesite-1.1.0-replatform-design.md`. Astro 6 upgrade guide: https://docs.astro.build/en/guides/upgrade-to/v6/

---

## File Structure

Files touched in Phase 1 (small, deliberate surface):

- **Modify** `package.json` — bump `astro`, `@astrojs/markdoc`, `@astrojs/sitemap`; keep `@markdoc/markdoc`, `@astrojs/check`.
- **Modify** `src/content.config.ts:9` — import `z` from `astro/zod` instead of `astro:content`.
- **Possibly modify** `astro.config.ts` — only if Astro 6 surfaces a config error (none anticipated; current config uses no removed options).
- **Create (throwaway, not committed)** `../pf-baseline-dist/` — the pre-upgrade `dist/` snapshot used as the regression oracle.
- **No change** to: posts, `src/utils/feed.ts`, layouts, pages/endpoints, `workers/site/`, `_headers`, `_redirects`, `site.config.ts`.

---

## Task 1: Isolated workspace + baseline regression oracle

**Files:**
- Create: `../pf-baseline-dist/` (snapshot, throwaway)

- [ ] **Step 1: Establish the isolated worktree**

Use the `superpowers:using-git-worktrees` skill to create a worktree for branch `replatform/anglesite-1.1.0` (already created off `main`). All subsequent steps run inside that worktree. If a worktree already exists for this branch, use it.

- [ ] **Step 2: Install current deps and build the Astro 5 baseline**

Run:
```bash
npm install
npm run build
```
Expected: build succeeds, `dist/` is produced, console ends with `[build] Complete!` and the pre-deploy notes. This is the known-good Astro 5 output.

- [ ] **Step 3: Snapshot the baseline as the regression oracle**

Run:
```bash
rm -rf ../pf-baseline-dist && cp -R dist ../pf-baseline-dist
ls ../pf-baseline-dist/handwriting-is-an-inheritance-typing-is-a-right/index.html 2>/dev/null; echo "baseline captured"
```
Expected: prints `baseline captured`. (Note: the handwriting post only exists if PR #40 is merged into `main`; its absence is fine — the oracle is whatever `main` builds.)

- [ ] **Step 4: Record the current passing test/typecheck state**

Run:
```bash
npm run typecheck
npm test
```
Expected: `astro check` reports `0 errors`; worker tests pass. Record the counts — Phase 1 must end at the same green state.

---

## Task 2: Bump the Astro ecosystem to v6

**Files:**
- Modify: `package.json` (dependencies)

- [ ] **Step 1: Update the dependency versions**

Edit `package.json` to set these exact versions (matching the Anglesite 1.1.0 template peers):
```json
"dependencies": {
  "@astrojs/markdoc": "1.0.4",
  "@astrojs/sitemap": "3.7.2",
  "@markdoc/markdoc": "^0.5.0",
  "astro": "6.3.1",
  "markdown-it-footnote": "^4.0.0"
}
```
Leave `devDependencies` as-is (`@astrojs/check` `^0.9.4` already satisfies Astro 6's `^0.9.0`).

- [ ] **Step 2: Install and let npm resolve the new tree**

Run:
```bash
npm install
```
Expected: installs without peer-dependency errors. If npm reports a peer conflict for `@markdoc/markdoc` against `@astrojs/markdoc@1.0.4`, note the version `@astrojs/markdoc` expects and align `@markdoc/markdoc` to it, then re-run `npm install`.

- [ ] **Step 3: Confirm the installed Astro major**

Run:
```bash
npx astro --version
```
Expected: `astro  6.3.1` (or a 6.3.x patch).

- [ ] **Step 4: Commit the dependency bump**

```bash
git add package.json package-lock.json
git commit -m "build: bump Astro to 6.3.1 and @astrojs/markdoc to 1.0.4"
```

---

## Task 3: Migrate the deprecated Zod import

**Files:**
- Modify: `src/content.config.ts:9`

- [ ] **Step 1: Switch the `z` import to `astro/zod`**

In `src/content.config.ts`, change line 9 from:
```ts
import { defineCollection, z } from "astro:content";
```
to:
```ts
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
```
(`z` re-exported from `astro:content` is deprecated in Astro 6; `astro/zod` is the supported path. `defineCollection` still comes from `astro:content`.)

- [ ] **Step 2: Typecheck the change**

Run:
```bash
npm run typecheck
```
Expected: `0 errors`. If `astro:content` reports an unused-import or type error, confirm `defineCollection` is still imported from `astro:content` and `z` only from `astro/zod`.

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts
git commit -m "refactor: import zod from astro/zod for Astro 6"
```

---

## Task 4: First Astro 6 build and surfaced-error fixes

**Files:**
- Possibly modify: `astro.config.ts` (only if an error requires it)

- [ ] **Step 1: Run the Astro 6 build**

Run:
```bash
npm run build
```
Expected outcomes, in order of likelihood:
- **Build succeeds** → proceed to Task 5.
- **Config error** about a removed/renamed option → the current `astro.config.ts` uses only `site`, `devToolbar`, `build.inlineStylesheets`, `integrations`, `vite.server.https`, all of which remain valid in Astro 6; if an error nonetheless appears, apply the exact fix the error names and re-run.
- **Vite 7 `https` warning/error** in dev config → does not affect `astro build` (the `vite.server.https` branch is dev-only via `isDev`); ignore for the build gate.

- [ ] **Step 2: Scan for any remaining removed-API usage**

Run:
```bash
grep -rnE "Astro\.glob|ViewTransitions|emitESMImage|astro:schema" src/
```
Expected: no matches (pre-verified clean on `main`). If any appear, replace per the Astro 6 guide (`Astro.glob` → `import.meta.glob`; `<ViewTransitions />` → `<ClientRouter />`).

- [ ] **Step 3: Re-run build until green**

Run:
```bash
npm run build
```
Expected: `[build] Complete!` with the same page count as the baseline (Task 1, Step 2).

- [ ] **Step 4: Commit any config fixes (skip if none)**

```bash
git add astro.config.ts
git commit -m "fix: Astro 6 config compatibility"
```

---

## Task 5: Verify the preserve-everything gate

**Files:** none (verification only)

- [ ] **Step 1: Typecheck and worker tests stay green**

Run:
```bash
npm run typecheck
npm test
```
Expected: `0 errors` and worker tests pass — same counts as Task 1, Step 4.

- [ ] **Step 2: Diff the new build against the baseline oracle**

Run:
```bash
diff -rq ../pf-baseline-dist dist | grep -v "_astro/" || echo "no non-asset differences"
```
Expected: the only differing files are HTML pages that contain **code blocks** (Shiki 4 changes highlight markup) and possibly `_astro/` hashed assets (filtered out). Any differing `*.xml`, `*.json`, `llms.txt`, `.well-known/*`, or `index.md` file is a **regression — investigate before proceeding.**

- [ ] **Step 3: Inspect a code-block delta to confirm it's only highlighting**

Pick one differing HTML file from Step 2 (e.g. a post with a fenced code block) and run:
```bash
diff <(sed 's/></>\n</g' ../pf-baseline-dist/<slug>/index.html) <(sed 's/></>\n</g' dist/<slug>/index.html) | head -40
```
Expected: differences confined to `<span class="...">` token markup inside `<pre>`/`<code>`. Prose, headings, links, and footnotes are identical. If structure outside code blocks differs, that's a regression.

- [ ] **Step 4: Verify feed rendering (the `@markdoc/markdoc` direct-use risk)**

The Atom feed (`src/pages/feed.xml.ts`) and JSON Feed (`src/pages/feed.json.ts`) render post HTML via `@markdoc/markdoc` in `src/utils/feed.ts`. Confirm both built feeds are non-empty and match the baseline item counts:
```bash
test -s dist/feed.xml && head -20 dist/feed.xml
diff <(grep -c "<entry>" ../pf-baseline-dist/feed.xml) <(grep -c "<entry>" dist/feed.xml) && echo "atom: same entry count"
test -s dist/feed.json && diff <(grep -c '"id"' ../pf-baseline-dist/feed.json) <(grep -c '"id"' dist/feed.json) && echo "json feed: same item count"
```
Expected: `feed.xml` contains `<entry>` elements and `feed.json` exists, both with the same item counts as the baseline. A count mismatch or empty feed means the Markdoc 1.0 render path regressed — investigate `src/utils/feed.ts`.

- [ ] **Step 5: Verify content-negotiation markdown variants still build**

Run:
```bash
find dist -name index.md | head -3 && echo "index.md variants present"
```
Expected: per-post `index.md` files exist (produced by `src/pages/[slug]/index.md.ts`), matching the baseline's set.

---

## Task 6: Finalize Phase 1

**Files:** none (commit + cleanup)

- [ ] **Step 1: Confirm a clean working tree**

Run:
```bash
git status -sb
```
Expected: only committed changes; no stray modifications. (`dist/` is gitignored.)

- [ ] **Step 2: Remove the baseline snapshot**

Run:
```bash
rm -rf ../pf-baseline-dist
echo "baseline removed"
```

- [ ] **Step 3: Record Phase 1 completion**

The branch `replatform/anglesite-1.1.0` now builds on Astro 6 with output verified equivalent to Astro 5. **Do not bump `ANGLESITE_VERSION` yet** — that happens in Phase 6 after the full stack lands. Phase 2 (1.1.0 tooling) is the next plan.

---

## Gate Summary (Phase 1 is done when ALL hold)

- `npm run build` succeeds with the same page count as the Astro 5 baseline.
- `npm run typecheck` → `0 errors`; `npm test` → worker tests pass.
- `diff -rq` baseline vs new `dist/` shows differences only in code-block highlighting (Shiki 4) and `_astro/` asset hashes.
- `feed.xml` entry count matches baseline; `index.md` content-negotiation variants present.

If the build cannot be made green within reason (deep Astro 6 / Markdoc 1.0 breakage), invoke the spec's fallback: ship the Astro 6 upgrade as its own standalone PR and pause the re-platform.
