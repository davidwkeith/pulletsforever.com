# Anglesite Re-platform — Phase 3: Keystatic (posts-only) + React Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the Keystatic CMS (posts-only, mirroring the existing schema) and the React integration for local content editing at `/keystatic`, with **no change to the production build** (stays static at 51 pages).

**Architecture:** Follow the Anglesite 1.1.0 canonical pattern: `output: "static"` always, `react()` always, and `keystatic()` **dev-only** (`...(isDev ? [keystatic()] : [])`). Keystatic edits happen in `astro dev` (local-file storage); the owner commits the `.mdoc` files and deploys a pure-static build. **No Cloudflare adapter in this phase** — the adapter (for the production worker / IndieWeb) lands in Phase 4. This corrects the spec's assumption that `/keystatic` is a production on-demand route; the template makes it dev-only.

**Tech Stack:** @keystatic/astro 5.0.6, @keystatic/core 0.5.50, @astrojs/react 5.0.4, react/react-dom 18.3.1, Astro 6.

**Reference:** spec `docs/superpowers/specs/2026-06-17-anglesite-1.1.0-replatform-design.md`; template `~/.claude/plugins/cache/anglesite/anglesite/1.1.0/template/`.

---

## Scope decisions

1. **Trimmed `posts` collection** — exactly the 8 fields in `src/content.config.ts` (`title, description, publishDate, image, imageAlt, tags, draft, syndication`) plus the Markdoc `content` body. The template's extra fields (`sendNewsletter`, `comments`, `tier`, `publicPreview`, fixed-option tags) are **omitted** — they belong to features this blog doesn't use and would write frontmatter the Zod schema rejects.
2. **Free-form tags** — `fields.array(fields.text())`, not the template's fixed multiselect, because the site's tags are open (`chickens`, `web`, `ai`, …).
3. **Realistic gate** — the spec's "round-trips to *identical* frontmatter" is not literally achievable with any CMS (Keystatic has its own field ordering / serialization). The real gate: production build unchanged (51 static pages), `/keystatic` serves in dev, and the config schema covers all 8 Zod fields so edits produce schema-valid posts.

---

## File Structure

- **Create** `keystatic.config.ts` (repo root) — posts-only collection, local storage.
- **Create** `anglesite.config.json` (repo root) — declares the `posts` collection.
- **Modify** `astro.config.ts` — add `react`/`keystatic` imports; `react()` always + `keystatic()` dev-only in `integrations`. No adapter.
- **Modify** `package.json` — add 5 deps.

---

## Task 1: Dependencies + Keystatic config + astro wiring

**Files:** create `keystatic.config.ts`, `anglesite.config.json`; modify `package.json`, `astro.config.ts`.

- [ ] **Step 1: Add the dependencies**

In `package.json` `dependencies`, add (these are runtime deps — Keystatic/React load in the dev server and React is an integration):
```json
"@astrojs/react": "5.0.4",
"@keystatic/astro": "5.0.6",
"@keystatic/core": "0.5.50",
"react": "18.3.1",
"react-dom": "18.3.1"
```
Then `npm install` (expect clean install; React 18 peer of @keystatic/core).

- [ ] **Step 2: Create `keystatic.config.ts` (repo root)** — exact contents:

```ts
/**
 * Keystatic CMS configuration — the visual editor at `/keystatic` (dev only).
 *
 * Local-file storage: edits write `.mdoc` files in `src/content/posts/`, which
 * are committed and deployed as a static build. The schema here mirrors the Zod
 * schema in `src/content.config.ts`; both validate the same frontmatter.
 *
 * @see https://keystatic.com/docs/configuration
 * @module
 */

import { config, fields, collection } from "@keystatic/core";

export default config({
  storage: { kind: "local" },
  collections: {
    posts: collection({
      label: "Blog Posts",
      slugField: "title",
      path: "src/content/posts/*",
      format: { contentField: "content" },
      schema: {
        title: fields.slug({ name: { label: "Title" } }),
        description: fields.text({
          label: "Description",
          description: "For search engines and social sharing (1–2 sentences)",
        }),
        publishDate: fields.date({
          label: "Publish Date",
          validation: { isRequired: true },
        }),
        image: fields.text({
          label: "Image",
          description: "Hero image path under public/ (optional)",
        }),
        imageAlt: fields.text({
          label: "Image Alt Text",
          description: "Required if image is set",
        }),
        tags: fields.array(fields.text({ label: "Tag" }), {
          label: "Tags",
          itemLabel: (props) => props.value || "tag",
        }),
        draft: fields.checkbox({
          label: "Draft",
          description: "Drafts are not published to the live site",
          defaultValue: false,
        }),
        syndication: fields.array(fields.url({ label: "URL" }), {
          label: "Syndication Links",
          description: "URLs where this post was cross-posted",
          itemLabel: (props) => props.value || "Add URL",
        }),
        content: fields.markdoc({ label: "Content" }),
      },
    }),
  },
});
```

- [ ] **Step 3: Create `anglesite.config.json` (repo root)** — exact contents:

```json
{
  "keystatic": {
    "collections": ["posts"],
    "singletons": []
  }
}
```

- [ ] **Step 4: Wire `react()` + dev-only `keystatic()` into `astro.config.ts`**

Add these imports near the existing `markdoc`/`sitemap` imports (after line 12):
```ts
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";
```
Change the integrations line from:
```ts
  integrations: [markdoc(), sitemap()],
```
to:
```ts
  integrations: [react(), markdoc(), ...(isDev ? [keystatic()] : []), sitemap()],
```
Leave everything else (`output` is implicitly static, `vite`, `build`, `site`) unchanged. **Do NOT add a Cloudflare adapter** — that is Phase 4. (`isDev` is already defined at the top of the file.)

- [ ] **Step 5: Production build must be unchanged (static, no Keystatic)**

```bash
npm run build 2>&1 | tail -2
```
Expected: `51 page(s) built` / `Complete!`. Because `keystatic()` is dev-only and there is no adapter, the production build has no on-demand routes and stays static. If the build errors with "found an on-demand route but no adapter," then `keystatic()` was not correctly gated behind `isDev` — re-check Step 4.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck 2>&1 | tail -4
```
Expected: `0 errors`, `0 warnings` (the 5 pre-existing vendored-script hints from Phase 2 may remain — that is acceptable; there must be no NEW errors/warnings from the React/Keystatic config).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json keystatic.config.ts anglesite.config.json astro.config.ts
git commit -m "feat: add Keystatic CMS (posts-only, dev) and React integration"
```

---

## Task 2: Validate `/keystatic` in the dev server

**Files:** none (verification).

- [ ] **Step 1: Start the dev server in the background**

```bash
(npm run dev > /tmp/keystatic-dev.log 2>&1 &) ; sleep 12 ; tail -20 /tmp/keystatic-dev.log
```
Expected: Astro dev server starts, logs a local URL (e.g. `http://localhost:4321/`). No config error, no `virtual:keystatic-config` fatal error. (A cosmetic scan warning may appear — acceptable per the template's notes.)

- [ ] **Step 2: Confirm the `/keystatic` admin route serves**

```bash
curl -sk -o /dev/null -w "%{http_code}\n" https://localhost:4321/keystatic || curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/keystatic
curl -sk https://localhost:4321/keystatic 2>/dev/null | grep -oiE "keystatic|<div id=\"root\"|<title>[^<]*</title>" | head -3
```
Expected: HTTP `200`, and the response is the Keystatic SPA shell (matches `keystatic` / a root div). Use the `https://` form if local HTTPS certs exist (`.certs/`), else `http://`.

- [ ] **Step 3: Confirm Keystatic reads the existing posts**

```bash
curl -sk "https://localhost:4321/keystatic/branch/_local/collection/posts" 2>/dev/null | grep -oiE "Blog Posts|posts" | head -2 || echo "(SPA route — verify in browser)"
ls src/content/posts/*.mdoc | wc -l   # expect ~34 source posts the CMS will list
```
Expected: the posts collection is the one configured; the 34 `.mdoc` source files are what the CMS lists. (The collection list itself renders client-side; full visual confirmation is a browser step — see manual note below.)

- [ ] **Step 4: Stop the dev server**

```bash
pkill -f "astro dev" || true ; sleep 1 ; echo "dev stopped"
```

---

## Task 3: Final Phase 3 gate

**Files:** none (verification).

- [ ] **Step 1: Full green check**

```bash
npm run build 2>&1 | tail -2          # 51 page(s) / Complete!
npm run typecheck 2>&1 | tail -4      # 0 errors, 0 warnings (5 vendored hints OK)
npm test 2>&1 | tail -3               # 7 passed
npm run predeploy 2>&1 | tail -1      # Pre-deploy security scan passed.
grep ANGLESITE_VERSION .site-config   # still 1.0.0-beta.6
```

- [ ] **Step 2: Confirm no production-output change**

The static build must be byte-equivalent to Phase 2's output (Keystatic/React add nothing to the static pages). Confirm page count is still 51 and there are no new files under `dist/` related to keystatic/react (no `dist/keystatic/`, no client React bundles on content pages).
```bash
find dist -path '*keystatic*' | head ; echo "(expected: no keystatic paths in dist)"
```

---

## Gate Summary (Phase 3 done when ALL hold)

- `keystatic.config.ts` (posts-only, 8 fields) + `anglesite.config.json` present; `astro.config.ts` wires `react()` always and `keystatic()` dev-only; no adapter added.
- `npm run build` → 51 static pages, **no `dist/keystatic/`**; `astro check` → 0 errors / 0 warnings (5 vendored hints OK); `npm test` → 7/7; `npm run predeploy` → passes.
- `astro dev` serves `/keystatic` (HTTP 200, Keystatic SPA) with no config error.
- `ANGLESITE_VERSION` still `1.0.0-beta.6`.

## Manual validation (owner, post-merge or anytime in dev)
Run `npm run dev`, open `/keystatic`, confirm the Blog Posts list shows the existing posts, open one (e.g. *Copper Charlie*), make a trivial edit, save, and confirm the `.mdoc` file still validates (`npm run build`). Full visual round-trip is a browser action outside this automated plan.
