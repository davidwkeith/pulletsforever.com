# SEO Audit Report — pulletsforever.com

Run against `dist/` after build. 51 HTML pages crawled.

## Summary

| Check | Status |
|---|---|
| `<title>` present on every page | Pass (51/51) |
| `<meta name="description">` present | Pass (51/51) |
| Canonical URL | Pass (51/51) |
| Open Graph (`og:title`, `og:description`, `og:image`, `og:url`) | Pass (51/51) |
| Twitter Card | Pass (51/51) |
| JSON-LD structured data | Pass (51/51) |
| Sitemap (`sitemap-index.xml`) | Pass — 50 URLs (excludes 404) |
| `robots.txt` | **Fixed** (added) |
| `llms.txt` for AI crawlers | Pass — already generated |
| Duplicate titles / descriptions | None |

## Critical issues fixed

- **`public/robots.txt` added** with `Sitemap:` directive pointing at `https://pulletsforever.com/sitemap-index.xml`. Without this, search engines could not discover the sitemap from the well-known location.

## Warnings fixed

- **7 post titles over 60 chars** (rendered as `Title — Pullets Forever`). `BaseLayout.astro` now omits the brand suffix when the bare title is already long enough that the suffix would push the rendered `<title>` past 60 chars. Affects:
  - `20-years-of-banning-phones-we-dont-have-that-long-for-ai`
  - `claude-writes-better-image-prompts-than-i-do`
  - `coverleaf-magazines-can-still-be-read-for-free`
  - `how-coverleaf-could-use-my-hack-to-make-a-mint`
  - `i-forced-claude-to-write-a-json-parser-in-brainfuck`
  - `running-jslint-with-safaris-javascript-core`
  - `using-gemini-to-give-the-feedback-you-know-you-should-write`
- **Homepage description** expanded from "A blog by dwk." → 2-line summary covering scope.
- **`/blog/` description** expanded from "All posts." → archive description.
- **`/tags/` description** expanded from "Browse posts by tag." → topic-aware copy.
- **`/tags/[tag]/` descriptions** now include post count and stable boilerplate so each tag page has a unique 70–120 char description rather than the previous 16–24 char placeholder.
- **`the-future-of-product-development.mdoc`** description expanded from 29 chars to a complete 1-line summary.

## Remaining warnings (intentional / non-actionable)

- **`404.html` description** at 42 chars (under 50 threshold). 404 pages aren't indexed by search engines, so this doesn't affect SEO.
- **3 post descriptions 1–6 chars over 160** (`claude-writes-better-image-prompts-than-i-do` at 161; `letter-to-city-council` at 164; `using-gemini-to-give-the-feedback-you-know-you-should-write` at 166). Google's SERP cutoff is flexible (typically 155–160 mobile, up to ~320 desktop) and the copy is deliberate. Trimming would weaken the descriptions without measurable benefit.
- **Several titles under 30 chars** for posts with naturally short names (`iBank Tapp`, `Bloggin'`, `PoultryGate`). The 30-char guideline is for landing pages competing in search; padding actual post titles would harm clarity.

## Schema.org coverage

Every page emits JSON-LD via `BaseLayout.astro`. Posts use `Article` with `headline`, `description`, `datePublished`, and `image`. The site root uses `WebSite` from `siteConfig.schema`. No pages without structured data.

## AI search / LLM optimization

- `dist/llms.txt` is generated and lists all posts with title, date, and description.
- `feed.xml` (Atom) and `feed.json` (JSON Feed) include full post HTML.
- CSP allows only first-party scripts and Cloudflare's analytics beacon — no `'unsafe-inline'`.

## Files changed

- `public/robots.txt` (new)
- `src/layouts/BaseLayout.astro` — smart title brand-suffix logic
- `src/pages/index.astro` — homepage description
- `src/pages/blog/index.astro` — blog index description
- `src/pages/tags/index.astro` — tags index description
- `src/pages/tags/[tag].astro` — per-tag dynamic description
- `src/content/posts/the-future-of-product-development.mdoc` — description expansion
