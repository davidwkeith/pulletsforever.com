# pulletsforever.com

Personal blog. Built with [Anglesite](https://anglesite.dwk.io) (Astro 6 + Markdoc + Keystatic CMS) and deployed to Cloudflare Workers (Static Assets) with a Worker that handles content negotiation. Posts live in `src/content/posts/` as `.mdoc` files.

## Commands

- `npm start` — Astro dev server (with Keystatic CMS at `/keystatic`)
- `npm run build` — Production build to `dist/`
- `npm run typecheck` — `astro check`
- `npm test` — Worker tests (vitest, `--prefix worker`)
- `npm run lint:css` / `npm run lint:md` — stylelint / markdownlint (advisory)
- `npm run deploy` — Manual laptop deploy: build + scan + `wrangler deploy` + WebSub ping + send webmentions (pings are fatal here so you notice failures interactively)
- `npm run cloudflare:deploy` — Deploy command Cloudflare **Workers Builds** invokes in CI: `wrangler deploy` then `npm run notify`
- `npm run notify` — Post-deploy pings, non-fatal (`websub:ping || true; webmentions:send || true`) so a transient hub error can't fail a CI build

## Deploying

Two paths, same Worker:

- **Manual (laptop):** `npm run deploy` from `main`. Still available as a fallback / for ad-hoc deploys.
- **CI (Cloudflare Workers Builds):** auto-builds + deploys on push once wired in the dashboard. Settings → Builds for the `pulletsforever-com` Worker:
  - Build command: `npm run build && npm run scan` (keeps the security/SEO gate in CI)
  - Production branch (`main`) deploy command: `npm run cloudflare:deploy`
  - Non-production branch deploy command: `npx wrangler versions upload` (uploads a preview version + `*.workers.dev` preview URL; does **not** run the production pings)
  - `preview_urls: true` in `wrangler.jsonc` enables the preview URL Workers Builds posts on PRs.

  Neither `websub:ping` nor `webmentions:send` needs a secret, so no build env vars are required. Tracking: GH #26.

## Worktrees

Prefer a git worktree by default when starting any non-trivial change — a feature, a new post, or a multi-file edit — so work stays isolated from the main checkout. Use the harness's native worktree support, or `git worktree add ../pulletsforever-<branch> -b <branch>`. Each worktree is a fresh checkout with no `node_modules` (it isn't shared across worktrees), so run `npm install` in it before any `npm run build` / `npm test` / `npm run new-post`. Deploy from the main checkout after merging, not from a feature worktree.

## Architecture

- **Pages and routes**: `src/pages/*.astro` (UI) and `src/pages/**/*.ts` (API endpoints — feeds, llms.txt, .well-known)
- **Layouts**: `src/layouts/BaseLayout.astro` — single shared layout
- **Site config**: `src/site.config.ts` — single source of truth for identity, IndieWeb endpoints, head links, JSON-LD schema
- **Content**: `src/content/posts/*.mdoc` (Markdoc), schema in `src/content.config.ts`
- **CMS**: `keystatic.config.ts` (visual editor at `/keystatic` in dev)
- **Static assets**: `public/` — copied verbatim to `dist/`. Hero/blog images live **only** in `src/assets/blog/` named `{slug}-{name}.{ext}`; bodies reference them as the virtual path `/images/blog/{slug}-{name}.{ext}`, resolved to the optimized `_astro` asset by `src/utils/blog-images.ts` (page, feeds, and the markdown view). There is no `public/images/blog/`.
- **Worker**: `worker/site-entry.ts` serves `dist/` and handles `Accept: text/markdown` content negotiation by serving the matching `index.md` produced by `src/pages/[slug]/index.md.ts`. Tests in `worker/site-entry.test.ts`.
- **Cloudflare**: `wrangler.jsonc` (Workers Static Assets — worker `main` + `dist/` assets, `run_worker_first`), `public/_headers` (security headers, CSP, content-types), `public/_redirects`
- **Build tooling**: scripts run via `tsx`; `scripts/pre-deploy-check.ts` (+ `config.ts`/`csp.ts`/`seo.ts`/`seo-audit.ts`) is the pre-deploy security/SEO scan; `.stylelintrc.json` / `.markdownlint.jsonc` lint configs

## Creating a new post

```bash
npm run new-post "My Post Title"
```

Writes a `src/content/posts/my-post-title.mdoc` stub with `draft: true`. Edit, set `draft: false`, then build. For posts with images, drop files into `src/assets/blog/` named `{slug}-{name}.{ext}` and reference in the body as `/images/blog/{slug}-{name}.{ext}` (a virtual path resolved to the optimized asset; no file is committed under `public/`).

## Required frontmatter

```yaml
---
title: "Post Title"
description: "1–2 sentence summary for SEO and social"
publishDate: "YYYY-MM-DD"
tags: [tag1, tag2]
draft: false
---
```

Optional: `image` (hero, path under `public/`), `imageAlt`, `syndication` (array of cross-post URLs).

The Zod schema in `src/content.config.ts` and the Keystatic field schema in `keystatic.config.ts` must stay in sync.

## Endpoint conventions

Discovery endpoints (RSS/JSON feeds, llms.txt, license, nodeinfo, .well-known/*) live in `src/pages/` and consume `src/site.config.ts`. The Atom feed and JSON Feed render full post HTML using `@markdoc/markdoc` via `src/utils/feed.ts`.

## Testing changes

Always run `npm run build` after edits. For TypeScript changes also run `npm run typecheck`. Build must succeed before committing.

## No `/privacy` or `/accessibility` page

Anglesite-style health checks may flag these as missing. They are intentionally absent: the site has no contact form, no signup, no ecommerce, no third-party scripts, and Cloudflare Web Analytics is privacy-respecting and aggregate-only. There is nothing to disclose in a privacy policy and no committed accessibility statement to maintain. Don't add either page during a `/anglesite:check` unless the site grows a feature that warrants it.
