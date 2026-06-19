# Hero Images Single Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `src/assets/blog/` the single source of truth for hero images, deleting `public/images/blog/` and resolving the body's `/images/blog/…` references to the hashed `_astro` asset at every render site.

**Architecture:** `/images/blog/{file}` becomes a virtual key, not a file on disk. Three render sites resolve it to the optimized `_astro/…webp`: the page (`MarkdocImage.astro`, unchanged), the feeds (`feed.ts`), and the `text/markdown` view (`index.md.ts`). A shared `src/utils/blog-images.ts` module provides a pure URL rewriter plus an `astro:assets`-backed resolver.

**Tech Stack:** Astro 6, `@astrojs/markdoc`, `astro:assets` (`getImage`), Keystatic, Vitest (new root suite via `getViteConfig`).

## Global Constraints

- Node/Astro: Astro `^6.4.8`. Output is fully static (no adapter in production build).
- Author-facing form is unchanged: bodies keep `![alt](/images/blog/{file})`; frontmatter keeps `image: ../../assets/blog/{file}`. **Do not rewrite post content.**
- `resolveBlogImage` must call `getImage({ src })` with **no** `format`/`width`/`height` overrides, so it references the same `_astro/…webp` variant the page already emits (no orphan duplicate).
- Each commit must leave a working tree: rewrite feeds and the markdown view **before** deleting `public/images/blog/`.
- Commit message trailer on every commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Prerequisites

This plan runs in the worktree at `../pulletsforever-hero-images-single-source` (branch `fix/hero-images-single-source`). It has no `node_modules`. Before Task 1:

```bash
cd ../pulletsforever-hero-images-single-source
npm install
```

## File Structure

- **Create** `src/utils/blog-images.ts` — pure `rewriteBlogImageUrls` + `astro:assets` `resolveBlogImage`.
- **Create** `src/utils/blog-images.test.ts` — unit tests for the pure rewriter.
- **Create** `vitest.config.ts` (repo root) — Astro-aware vitest config via `getViteConfig`.
- **Modify** `package.json` — add `vitest` devDep; `test` script runs root suite + worker suite.
- **Modify** `src/utils/feed.ts` — `renderPostHtml`/`renderArticleForFeed` become async + rewrite.
- **Modify** `src/pages/feed.xml.ts` — await the now-async article render.
- **Modify** `src/pages/feed.json.ts` — await the now-async article render.
- **Modify** `src/pages/[slug]/index.md.ts` — rewrite body URLs before serving.
- **Delete** `public/images/blog/*` (35 files).
- **Modify** `keystatic.config.ts` — markdoc image `directory`/`publicPath`; fix frontmatter `image` description.
- **Modify** `scripts/new-post.ts` — single-location hint.
- **Modify** `CLAUDE.md` — Static assets + Creating a new post sections.

---

### Task 1: Shared `blog-images` module + root test suite

**Files:**
- Create: `src/utils/blog-images.ts`
- Create: `src/utils/blog-images.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (devDependencies + `test` script)

**Interfaces:**
- Produces:
  - `rewriteBlogImageUrls(text: string, resolver: (publicPath: string) => Promise<string | null>): Promise<string>` — replaces every `/images/blog/<file>.<ext>` token via `resolver`; tokens resolving to `null` are left untouched.
  - `resolveBlogImage(publicPath: string): Promise<string | null>` — resolves a `/images/blog/{file}` key to the hashed `_astro` URL, or `null` if not under `/images/blog/` or no matching `src/assets/blog/` file.

- [ ] **Step 1: Install vitest in the root project**

```bash
cd ../pulletsforever-hero-images-single-source
npm install -D vitest
```

- [ ] **Step 2: Create the root vitest config**

Create `vitest.config.ts`:

```ts
import { getViteConfig } from "astro/config";

// Astro-aware vitest config so `astro:assets` and `import.meta.glob`
// resolve inside unit tests. Runs the src/ suite; the worker suite has
// its own config under worker/.
export default getViteConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Point the `test` script at both suites**

In `package.json`, change the `test` script:

```json
"test": "vitest run && npm test --prefix worker",
```

- [ ] **Step 4: Write the failing unit test**

Create `src/utils/blog-images.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rewriteBlogImageUrls } from "./blog-images.ts";

const stub = async (p: string) =>
  p === "/images/blog/hero.png" ? "/_astro/hero.abc123.webp" : null;

describe("rewriteBlogImageUrls", () => {
  it("rewrites a markdown image URL", async () => {
    const out = await rewriteBlogImageUrls(
      "![alt](/images/blog/hero.png)",
      stub,
    );
    expect(out).toBe("![alt](/_astro/hero.abc123.webp)");
  });

  it("rewrites compare-tag attributes", async () => {
    const input =
      '{% compare before="/images/blog/hero.png" after="/images/blog/hero.png" %}';
    const out = await rewriteBlogImageUrls(input, stub);
    expect(out).toBe(
      '{% compare before="/_astro/hero.abc123.webp" after="/_astro/hero.abc123.webp" %}',
    );
  });

  it("leaves unresolvable blog tokens untouched", async () => {
    const out = await rewriteBlogImageUrls(
      "![x](/images/blog/missing.png)",
      stub,
    );
    expect(out).toBe("![x](/images/blog/missing.png)");
  });

  it("leaves non-blog URLs untouched", async () => {
    const out = await rewriteBlogImageUrls(
      "![x](/images/pages/foo.png)",
      stub,
    );
    expect(out).toBe("![x](/images/pages/foo.png)");
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run src/utils/blog-images.test.ts`
Expected: FAIL — cannot resolve `./blog-images.ts` (module does not exist yet).

- [ ] **Step 6: Implement `src/utils/blog-images.ts`**

```ts
/**
 * Hero image resolution for the single-source `src/assets/blog/` layout.
 *
 * Body posts reference heroes as the virtual key `/images/blog/{file}`.
 * The rendered page resolves this via `MarkdocImage.astro`; the feeds and
 * the `text/markdown` view resolve it here to the same content-hashed
 * `_astro/…webp` asset, so no copy lives in `public/`.
 */
import { getImage } from "astro:assets";

/** Matches a `/images/blog/<file>.<ext>` token anywhere in a string. */
const BLOG_IMG_RE =
  /\/images\/blog\/[A-Za-z0-9._-]+\.(?:png|jpe?g|webp|gif|avif)/g;

/** Lazy glob of the single-source originals; loaders run only on demand. */
const blogImages = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/blog/*.{png,jpg,jpeg,webp,gif,avif}",
);

/**
 * Replace every `/images/blog/<file>` token in `text` using `resolver`.
 * Tokens whose resolver returns `null` are left as-is. Pure: no Astro
 * dependency, so it is unit-testable with a stub resolver.
 */
export async function rewriteBlogImageUrls(
  text: string,
  resolver: (publicPath: string) => Promise<string | null>,
): Promise<string> {
  const tokens = [...new Set(text.match(BLOG_IMG_RE) ?? [])];
  if (tokens.length === 0) return text;

  const resolved = new Map<string, string>();
  await Promise.all(
    tokens.map(async (token) => {
      const url = await resolver(token);
      if (url) resolved.set(token, url);
    }),
  );

  return text.replace(BLOG_IMG_RE, (match) => resolved.get(match) ?? match);
}

/**
 * Resolve a `/images/blog/{file}` key to its hashed `_astro` URL via
 * astro:assets. Uses default `getImage` options to match the variant
 * `MarkdocImage.astro`'s `<Image>` already emits. Returns `null` for
 * non-blog paths or unknown files.
 */
export async function resolveBlogImage(
  publicPath: string,
): Promise<string | null> {
  if (!publicPath.startsWith("/images/blog/")) return null;
  const filename = publicPath.replace("/images/blog/", "");
  const loader = blogImages[`../assets/blog/${filename}`];
  if (!loader) return null;
  const mod = await loader();
  const img = await getImage({ src: mod.default });
  return img.src;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/utils/blog-images.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 8: Verify typecheck is clean**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/utils/blog-images.ts src/utils/blog-images.test.ts vitest.config.ts package.json package-lock.json
git commit -m "$(printf 'feat(images): add blog-images URL resolver + root vitest suite (#46)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 2: Resolve `/images/blog/…` in the feeds

**Files:**
- Modify: `src/utils/feed.ts` (`renderPostHtml`, `renderArticleForFeed`)
- Modify: `src/pages/feed.xml.ts:26-44`
- Modify: `src/pages/feed.json.ts:22-40`

**Interfaces:**
- Consumes: `rewriteBlogImageUrls`, `resolveBlogImage` from `./blog-images.ts`.
- Produces: `renderPostHtml(post): Promise<string>`, `renderArticleForFeed(post, siteOrigin): Promise<string>` (both now async).

- [ ] **Step 1: Make the feed renderer rewrite image URLs**

In `src/utils/feed.ts`, add the import near the other relative imports:

```ts
import { rewriteBlogImageUrls, resolveBlogImage } from "./blog-images.ts";
```

Replace `renderPostHtml`:

```ts
/** Render the Markdoc body of a post to HTML with hero URLs resolved. */
export async function renderPostHtml(post: Post): Promise<string> {
  const ast = Markdoc.parse(post.body ?? "");
  const transformed = Markdoc.transform(ast, { tags: footnoteTags });
  const html = Markdoc.renderers.html(transformed);
  return rewriteBlogImageUrls(html, resolveBlogImage);
}
```

Update `renderArticleForFeed` to await it:

```ts
export async function renderArticleForFeed(
  post: Post,
  siteOrigin: string,
): Promise<string> {
  const body = absolutizeHtml(await renderPostHtml(post), siteOrigin);
  const hasFootnotes = /^\[\^[^\]]+\]:/m.test(post.body ?? "");
  let html = `  ${body}\n`;
  if (!hasFootnotes) {
    html += `  <p class="signature">-dwk</p>`;
  }
  return html;
}
```

- [ ] **Step 2: Await the async render in the Atom feed**

In `src/pages/feed.xml.ts`, replace the synchronous `posts.map(...)` block (lines ~26-44) so entries are built with `await`:

```ts
  const entries = (
    await Promise.all(
      posts.map(async (post) => {
        const postUrl = `${origin}/${post.id}/`;
        const articleHtml = await renderArticleForFeed(post, origin);
        const tags = filterTagList(post.data.tags);
        const categoryTags = tags
          .map((tag) => `\t\t<category term="${escapeXml(tag)}"/>`)
          .join("\n");
        const published = rfc3339(post.data.publishDate);
        return `\t<entry>
\t\t<title>${escapeXml(post.data.title)}</title>
\t\t<link href="${postUrl}" rel="alternate" type="text/html"/>
\t\t<id>${postUrl}</id>
\t\t<published>${published}</published>
\t\t<updated>${published}</updated>
${categoryTags ? categoryTags + "\n" : ""}\t\t<content type="html">${escapeXml(articleHtml)}</content>
\t</entry>`;
      }),
    )
  ).join("\n");
```

- [ ] **Step 3: Await the async render in the JSON feed**

In `src/pages/feed.json.ts`, change line ~32 inside the existing `async` map:

```ts
        content_html: await renderArticleForFeed(post, origin),
```

- [ ] **Step 4: Build and verify feeds reference `_astro`, not `/images/blog/`**

```bash
npm run build
grep -c '/images/blog/' dist/feed.xml dist/feed.json
grep -c '_astro' dist/feed.xml
```

Expected: both `dist/feed.xml` and `dist/feed.json` report `0` for `/images/blog/`; `dist/feed.xml` reports a non-zero `_astro` count.

- [ ] **Step 5: Verify every feed `_astro` URL points at a real file (no orphan/broken)**

```bash
for u in $(grep -o '/_astro/[^"&]*\.webp' dist/feed.xml | sort -u); do
  test -f "dist$u" || echo "MISSING dist$u";
done; echo "done"
```

Expected: prints only `done` (no `MISSING` lines).

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/utils/feed.ts src/pages/feed.xml.ts src/pages/feed.json.ts
git commit -m "$(printf 'feat(feeds): resolve hero images to _astro assets (#46)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 3: Resolve `/images/blog/…` in the markdown view

**Files:**
- Modify: `src/pages/[slug]/index.md.ts:12,44`

**Interfaces:**
- Consumes: `rewriteBlogImageUrls`, `resolveBlogImage` from `../../utils/blog-images.ts`.

- [ ] **Step 1: Import the resolver**

In `src/pages/[slug]/index.md.ts`, add to the imports:

```ts
import { rewriteBlogImageUrls, resolveBlogImage } from "../../utils/blog-images.ts";
```

- [ ] **Step 2: Rewrite the body before serving**

Replace `lines.push(post.body ?? "");` with:

```ts
  const body = await rewriteBlogImageUrls(post.body ?? "", resolveBlogImage);
  lines.push(body);
```

(The function is already inside the `async` `GET` handler.)

- [ ] **Step 3: Build and verify the markdown view uses `_astro`**

Use a known hero post (`pullets-forever`):

```bash
npm run build
grep -c '/images/blog/' dist/pullets-forever/index.md
grep -c '_astro' dist/pullets-forever/index.md
```

Expected: `/images/blog/` count is `0`; `_astro` count is non-zero.

- [ ] **Step 4: Verify no markdown view across the site still emits `/images/blog/`**

```bash
grep -rl '/images/blog/' dist --include='index.md' || echo "clean"
```

Expected: prints `clean`.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/[slug]/index.md.ts
git commit -m "$(printf 'feat(content-negotiation): resolve hero images to _astro in markdown view (#46)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 4: Delete the duplicated `public/images/blog/` directory

**Files:**
- Delete: `public/images/blog/*` (35 files)

- [ ] **Step 1: Confirm every file is byte-identical to its `src/assets/blog/` twin**

```bash
for f in public/images/blog/*; do
  cmp -s "$f" "src/assets/blog/$(basename "$f")" || echo "DIFFERS: $f";
done; echo "compared"
```

Expected: prints only `compared` (no `DIFFERS` lines). If any file differs, STOP and report — the design assumes exact overlap.

- [ ] **Step 2: Remove the directory**

```bash
git rm -r public/images/blog
```

- [ ] **Step 3: Rebuild and confirm `_astro` hero output is unchanged and intact**

```bash
npm run build
for u in $(grep -o '/_astro/[^"&]*\.webp' dist/feed.xml | sort -u); do
  test -f "dist$u" || echo "MISSING dist$u";
done; echo "done"
test -d dist/images/blog && echo "UNEXPECTED dist/images/blog" || echo "no public blog dir (expected)"
```

Expected: `done` with no `MISSING` lines; `no public blog dir (expected)`.

- [ ] **Step 4: Confirm the rendered page hero still resolves**

```bash
grep -o '/_astro/[^"]*\.webp' dist/pullets-forever/index.html | head -1
```

Expected: prints a `/_astro/….webp` path (the in-article hero), confirming the page render is unaffected by the deletion.

- [ ] **Step 5: Run the pre-deploy scan and worker tests**

```bash
npm run scan
npm test
```

Expected: scan passes; all tests pass.

- [ ] **Step 6: Commit**

```bash
git commit -m "$(printf 'refactor(images): delete duplicated public/images/blog (#46)\n\nsrc/assets/blog is now the single source; /images/blog/ resolves to the\nhashed _astro asset at every render site.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 5: Align Keystatic with the single source

**Files:**
- Modify: `keystatic.config.ts:32-35` (frontmatter `image` description), `:54` (markdoc field options)

- [ ] **Step 1: Point the markdoc content field's image uploads at the single source**

In `keystatic.config.ts`, replace `content: fields.markdoc({ label: "Content" }),` with:

```ts
        content: fields.markdoc({
          label: "Content",
          options: {
            image: {
              directory: "src/assets/blog",
              publicPath: "/images/blog/",
            },
          },
        }),
```

- [ ] **Step 2: Fix the misleading frontmatter `image` description**

Replace the `image` field's description string `"Hero image path under public/ (optional)"` with:

```ts
          description:
            "Hero image, relative path e.g. ../../assets/blog/{slug}-{name}.{ext} (optional)",
```

- [ ] **Step 3: Verify typecheck and build still pass**

```bash
npm run typecheck
npm run build
```

Expected: no errors; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add keystatic.config.ts
git commit -m "$(printf 'chore(cms): point Keystatic image uploads at src/assets/blog (#46)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

### Task 6: Update docs and the new-post helper

**Files:**
- Modify: `scripts/new-post.ts:47-50`
- Modify: `CLAUDE.md` (Static assets bullet; Creating a new post section)

- [ ] **Step 1: Update the new-post hint to the single location**

In `scripts/new-post.ts`, replace the final three `console.log` calls (the image hint) with:

```ts
console.log(
  "For posts with images, add files to src/assets/blog/ named",
);
console.log(
  `{slug}-{name}.{ext} and reference in the body as /images/blog/${slug}-{name}.{ext}.`,
);
```

- [ ] **Step 2: Update the CLAUDE.md "Static assets" bullet**

In `CLAUDE.md`, replace the Static assets line:

> - **Static assets**: `public/` — copied verbatim to `dist/`. Images live in `public/images/blog/` named `{slug}-{name}.{ext}`

with:

> - **Static assets**: `public/` — copied verbatim to `dist/`. Hero/blog images live **only** in `src/assets/blog/` named `{slug}-{name}.{ext}`; bodies reference them as the virtual path `/images/blog/{slug}-{name}.{ext}`, resolved to the optimized `_astro` asset by `src/utils/blog-images.ts` (page, feeds, and the markdown view). There is no `public/images/blog/`.

- [ ] **Step 3: Update the CLAUDE.md "Creating a new post" image guidance**

Replace the sentence:

> For posts with images, drop files into `public/images/blog/` named `{slug}-{name}.{ext}` and reference as `/images/blog/{slug}-{name}.{ext}`.

with:

> For posts with images, drop files into `src/assets/blog/` named `{slug}-{name}.{ext}` and reference in the body as `/images/blog/{slug}-{name}.{ext}` (a virtual path resolved to the optimized asset; no file is committed under `public/`).

- [ ] **Step 4: Verify markdown lint and a fresh stub**

```bash
npm run lint:md
npm run new-post "Scratch Doc Test"
```

Expected: lint passes (advisory); the new-post output names `src/assets/blog/`. Then remove the scratch stub:

```bash
rm src/content/posts/scratch-doc-test.mdoc
```

- [ ] **Step 5: Commit**

```bash
git add scripts/new-post.ts CLAUDE.md
git commit -m "$(printf 'docs: describe single-source hero images in CLAUDE.md + new-post (#46)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Final verification (after all tasks)

- [ ] `npm run build` succeeds.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes (root unit suite + worker suite).
- [ ] `npm run scan` passes.
- [ ] `git status` shows `public/images/blog/` gone and no stray files.
- [ ] Spot-check in dev: `npm start`, then load a post page, `/feed.xml`, and `/{slug}/index.md` — hero images render via the dev `/_image` endpoint in all three.
