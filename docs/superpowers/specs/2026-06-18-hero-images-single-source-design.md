# Hero images: collapse to a single source of truth

**Issue:** [#46](https://github.com/davidwkeith/pulletsforever.com/issues/46)
**Date:** 2026-06-18
**Status:** Approved design

## Problem

Every blog post's hero image is committed twice as byte-identical files:

- `src/assets/blog/{slug}-{name}.{ext}` — consumed by the frontmatter `image:`
  field via Astro's `image()` schema helper (`src/content.config.ts`). Drives
  `og:image`, JSON-LD, the home-feed thumbnail, related-post tiles, and the
  feed metadata. Referenced from frontmatter as `../../assets/blog/{file}`.
- `public/images/blog/{slug}-{name}.{ext}` — referenced by the body Markdoc
  image as `/images/blog/{file}`.

Audit at time of writing: **35 files, exact 1:1 overlap** between the two
directories — every `public/images/blog/` file has a byte-identical twin in
`src/assets/blog/`, with no public-only and no src-only files.

### Why the issue's original proposal does not fit this repo

The issue proposed rewriting bodies to `![alt](../../assets/blog/{file})` and
deleting the public copies. That is subtly wrong here, because the
`public/images/blog/` bytes are **load-bearing for two output paths that never
run the Astro image component**:

- **`src/pages/[slug]/index.md.ts`** serves `post.body` verbatim for
  `Accept: text/markdown` content negotiation. The raw body contains
  `/images/blog/{file}` URLs that a client fetches directly.
- **`src/utils/feed.ts`** (`renderPostHtml`) renders the body with the default
  Markdoc HTML renderer (not the Astro component), so feed `<img src>` is the
  raw `/images/blog/{file}`, absolutized for RSS/Atom/JSON readers.

Meanwhile the rendered HTML page already indirects through `src/assets/blog/`:
`src/components/MarkdocImage.astro` takes the body's `/images/blog/{file}`
string purely as a **lookup key**, maps it to `../assets/blog/{file}`,
glob-imports the `src/assets/blog/*` original as `ImageMetadata`, and hands it
to `astro:assets` `<Image>` for WebP/srcset generation. `ImageCompare.astro`
does the same for `{% compare %}` tags.

So the two copies are both genuinely consumed, by different representations.
Naively deleting the public copies breaks feeds and the markdown view.

## Goal

One copy of each hero image in the repo (`src/assets/blog/`), with the
`public/images/blog/` directory removed entirely, and no regression to the
rendered page, feeds, or the `text/markdown` content-negotiation view.

## Approach (chosen: "resolve to the hashed `_astro` asset")

Make `src/assets/blog/` the single source of truth. Treat `/images/blog/{file}`
as a **virtual reference** — a stable logical key, not a file on disk —
resolved to the optimized, content-hashed `_astro/…webp` asset at every render
site. Delete `public/images/blog/`.

Why this over a build-time copy of `src/assets/blog/` into `dist/images/blog/`:
`getImage()` from `astro:assets` works in both `astro dev` and `astro build`
(in dev it returns a live `/_image?href=…` URL), so feeds and the markdown view
render correctly in `npm start` with **no build copy step and no dev
middleware**. Smaller feed payloads (WebP) are a bonus. The cost is async
URL-rewriting logic in two endpoints, and `_astro` URLs (instead of clean
`/images/blog/…` ones) in the raw-markdown representation — an accepted
trade-off.

Bodies and frontmatter are **not** rewritten; there is zero post churn.
`/images/blog/{file}` stays the author-facing form. Frontmatter `image:`
stays `../../assets/blog/{file}` (already correct via `image()`).

## Components

### 1. Shared resolver helper

Split so the find/replace logic is unit-testable without `astro:assets`:

- **`rewriteBlogImageUrls(text, resolver)`** — pure. Finds every
  `/images/blog/<file>` token in a string and replaces it via an injected
  async `resolver(publicPath) => string | null`. Operates on plain strings so
  it covers both feed `<img src="…">` HTML and raw-body `{% compare %}`
  attributes. A token whose resolver returns `null` is left untouched.
- **`resolveBlogImage(publicPath)`** — thin, Astro-bound. Globs
  `src/assets/blog/*` to `ImageMetadata` (same glob `MarkdocImage.astro`
  uses), calls `getImage({ src: metadata })` with the **same default transform
  options** `MarkdocImage`'s `<Image>` uses (so it references the exact
  `_astro/…webp` already emitted by the page render — not a new variant), and
  returns the hashed `.src`. Returns `null` when the file is not found.

Location: extend `src/utils/feed.ts` (or a sibling util it imports).
`resolveBlogImage` keeps the `astro:assets` dependency, so `feed.ts` stays
Astro-only (it is already imported solely by Astro endpoints, not by the
vitest worker suite).

### 2. `src/utils/feed.ts`

- `renderPostHtml` becomes `async`. After rendering the body HTML, run
  `rewriteBlogImageUrls(html, resolveBlogImage)` **before** `absolutizeHtml`,
  so the resulting `/_astro/…webp` URL is absolutized to the site origin for
  feed readers.
- `renderArticleForFeed` (and its callers in `feed.xml.ts` / `feed.json.ts`)
  thread the now-async render.

### 3. `src/pages/[slug]/index.md.ts`

- Before pushing `post.body`, run `rewriteBlogImageUrls(post.body,
  resolveBlogImage)` over the whole body string. This rewrites both
  `![alt](/images/blog/…)` images and `{% compare before="/images/blog/…" %}`
  attributes to `/_astro/…webp`.

### 4. Delete `public/images/blog/`

- Byte-compare each `public/images/blog/{file}` against its
  `src/assets/blog/{file}` twin; on confirmed identity, delete all 35.
- Grep `public/_headers` and `public/_redirects` for any `/images/blog/` rules
  and remove them if present.
- Leave `public/images/pages/` and all other public assets untouched.

### 5. Keystatic (`keystatic.config.ts`)

- Configure the markdoc content field's image handling:
  `fields.markdoc({ label: "Content", options: { image: { directory:
  "src/assets/blog", publicPath: "/images/blog/" } } })`. CMS body-image
  uploads then land in the single source and embed `/images/blog/{file}`,
  which all three resolvers (page, feed, markdown) handle.
- Fix the misleading `image` (frontmatter hero) field description — currently
  "Hero image path under public/" — to reflect the `../../assets/blog/{file}`
  relative form. The field stays free text (it cannot enforce a directory).

### 6. Docs & tooling

- `scripts/new-post.ts`: change the closing hint from "add files to
  `public/images/blog/`" to "add files to `src/assets/blog/`". The
  `/images/blog/{file}` URL form the author types in the body is unchanged.
- `CLAUDE.md`: update the "Static assets" bullet (`public/images/blog/` →
  `src/assets/blog/`, note `/images/blog/…` is a virtual reference resolved to
  the optimized asset) and the "Creating a new post" image instructions.

## Data flow after the change

```
src/assets/blog/{file}   ← single committed copy
        │
        ├── frontmatter image: ../../assets/blog/{file}
        │       → image() schema → astro:assets → og:image, JSON-LD, thumbnails
        │
        └── body /images/blog/{file}   (virtual key)
                ├── page:  MarkdocImage.astro / ImageCompare.astro → <Image> → /_astro/…webp
                ├── feed:  feed.ts rewriteBlogImageUrls → resolveBlogImage → /_astro/…webp (absolutized)
                └── md:    index.md.ts rewriteBlogImageUrls → resolveBlogImage → /_astro/…webp
```

`public/images/blog/` no longer exists.

## Error handling / edge cases

- **Unresolvable token:** `resolveBlogImage` returns `null`; the
  `/images/blog/…` token is left as-is. Verification confirms none remain after
  build (the audit shows full overlap, so all body refs resolve).
- **Variant matching:** `resolveBlogImage` must call `getImage` with the same
  options as `MarkdocImage`'s `<Image>` so it points at the already-emitted
  hashed file rather than producing an orphan duplicate in `_astro/`.
- **`{% compare %}` in feeds:** already dropped (the feed transform only
  registers `footnoteTags`), so feeds need only the `<img>` rewrite; the
  compare-tag rewrite matters only for the raw-markdown view.

## Testing & verification

- Unit test `rewriteBlogImageUrls` (pure function, injected stub resolver):
  rewrites `![]()` image URLs and `{% compare %}` attributes; leaves
  unresolvable tokens and non-blog URLs untouched.
- `npm run build` succeeds; `_astro` hero output is byte-identical to before
  (single source unchanged).
- A built feed entry (`dist/feed.xml` / `dist/feed.json`) and a built
  `/{slug}/index.md` both reference a `/_astro/…webp` file that exists in
  `dist/_astro/`, and that file matches the one the rendered page emits (no
  orphan duplicate).
- `npm run typecheck` passes (async signature changes).
- `npm test` (worker suite) passes.
- `npm start`: a post page, `/feed.xml`, and `/{slug}/index.md` all render hero
  images via the dev `/_image` endpoint.

## Out of scope

- The `../../assets/blog/` frontmatter form (already correct — left as-is).
- Non-blog public images (`public/images/pages/`, etc.).
- Any rewriting of post body content beyond the automatic URL resolution.
- Restyling, optimization, or re-export of the images themselves.
