# pulletsforever.com

Personal blog. Built with [Anglesite](https://anglesite.dev) (Astro 5 + Markdoc + Keystatic CMS) and deployed as a Cloudflare Pages site fronted by a Worker for content negotiation. Posts live in `src/content/posts/` as `.mdoc` files.

## Commands

- `npm start` — Astro dev server (with Keystatic CMS at `/keystatic`)
- `npm run build` — Production build to `dist/`
- `npm run typecheck` — `astro check`
- `npm test --prefix workers/site` — Worker tests
- `npm run deploy` — Build + pre-deploy security scan + `wrangler deploy` + WebSub ping + send webmentions

## Architecture

- **Pages and routes**: `src/pages/*.astro` (UI) and `src/pages/**/*.ts` (API endpoints — feeds, llms.txt, .well-known)
- **Layouts**: `src/layouts/BaseLayout.astro` — single shared layout
- **Site config**: `src/site.config.ts` — single source of truth for identity, IndieWeb endpoints, head links, JSON-LD schema
- **Content**: `src/content/posts/*.mdoc` (Markdoc), schema in `src/content.config.ts`
- **CMS**: `keystatic.config.ts` (visual editor at `/keystatic` in dev)
- **Static assets**: `public/` — copied verbatim to `dist/`. Images live in `public/images/blog/` named `{slug}-{name}.{ext}`
- **Worker**: `workers/site/index.ts` serves `dist/` and handles `Accept: text/markdown` content negotiation by serving the matching `index.md` produced by `src/pages/[slug]/index.md.ts`
- **Cloudflare**: `wrangler.toml` (worker + assets), `public/_headers` (security headers, CSP, content-types), `public/_redirects`

## Creating a new post

```bash
npm run new-post "My Post Title"
```

Writes a `src/content/posts/my-post-title.mdoc` stub with `draft: true`. Edit, set `draft: false`, then build. For posts with images, drop files into `public/images/blog/` named `{slug}-{name}.{ext}` and reference as `/images/blog/{slug}-{name}.{ext}`.

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
