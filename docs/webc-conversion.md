# Nunjucks to WebC Conversion — Final State

## Summary

Converted 11 Nunjucks templates to 11 WebC components/pages across 6 phases.
Build output is functionally identical to the pre-conversion baseline (84 files).

## What Was Converted

| Before (Nunjucks) | After (WebC) | Phase |
|---|---|---|
| `macros/social-icon.njk` | `components/social-icon.webc` + `socialIcon` shortcode | 1 |
| `partials/postslist.njk` | `components/post-list.webc` | 2 |
| `partials/postfeed.njk` | `components/post-feed.webc` | 2 |
| `partials/header.njk` | `components/site-header.webc` | 3 |
| `partials/footer.njk` | `components/site-footer.webc` | 3 |
| `partials/sidebar.njk` | `components/site-sidebar.webc` | 3 |
| `partials/webmentions.njk` | `components/web-mentions.webc` | 3 |
| `layouts/post.njk` | `layouts/post.webc` | 4 |
| `index.njk` | `index.webc` | 5 |
| `blog.njk` | `blog.webc` | 5 |

## What Stays in Nunjucks (and Why)

| Template | Reason |
|----------|--------|
| `layouts/base.njk` | Root layout uses async `{% favicons %}` shortcode and `{% css %}{% include %}{% endcss %}` paired shortcodes — both unsupported in WebC |
| `partials/meta-tags.njk` | Included by `base.njk`; `$data.schema` not available in WebC `renderTemplate` context |
| `partials/link-tags.njk` | Included by `base.njk`; uses async `{% favicons %}` shortcode |
| `tags.njk` | Paginated with dynamic permalinks — [broken in WebC](https://github.com/11ty/eleventy-plugin-webc/issues/87) |
| `tags-list.njk` | Requires explicit `permalink: /tags/` — same WebC permalink bug |
| `markdown-source.njk` | Build utility, no benefit to converting |
| `_headers.njk`, `_redirects.njk` | Plain text config output |
| `.well-known/*.njk` | Trivial files |
| `humans.txt.njk` | Trivial file |

## New Components Created

| Component | Purpose |
|-----------|---------|
| `slider-assets.webc` | Conditionally loads img-comparison-slider CSS/JS when post content contains `<img-comparison-slider>` |

## Key Technical Decisions

### `base.njk` kept as Nunjucks
WebC cannot call async shortcodes or use `{% css %}{% include "file" %}{% endcss %}` paired shortcodes. The root layout chains: `post.webc` → `base.njk`.

### `dateToRfc3339` re-registered as universal filter
The RSS plugin registers this as Nunjucks-only. Added a universal re-registration in `.eleventy.js` so WebC components can use it.

### `socialIcon` registered as universal shortcode
Replaced the Nunjucks macro with a `eleventyConfig.addShortcode()` so it's callable from both WebC and Nunjucks contexts.

### `webc:keep` for conditional external assets
The `slider-assets.webc` component outputs `<link>` and `<script>` tags with `webc:keep` to prevent WebC from bundling external CDN-style assets.

### `post.webc` uses split `<script webc:type="js">` blocks
Two JS blocks with `<web-mentions>` component in between to maintain correct DOM ordering (article → webmentions → prev/next nav).

### `eleventyImport` for collection dependency
Pages that access `post.templateContent` (homepage, blog archive) need `eleventyImport: collections: ["posts"]` in front matter to ensure posts are compiled before the page renders.

### WebC permalink bug ([#87](https://github.com/11ty/eleventy-plugin-webc/issues/87))
Any `.webc` page with explicit `permalink` in front matter is silently dropped (`Template not written false`). Only `.webc` pages using default file-path-based permalinks work. This blocks converting `tags-list.njk` and `tags.njk`.

## Data Access Patterns

In WebC components, access the Eleventy data cascade via `$data`:

```javascript
// In <script webc:type="js"> blocks:
$data.metadata.title      // Global data
$data.page.url             // Page data
$data.collections.posts    // Collections
$data.content              // Template content (in layouts)
$data.title                // Front matter data

// Filters are called as functions:
readableDate($data.page.date)
slugify(tag)
filterTagList($data.tags)
```

In WebC attributes, use dynamic binding:
```html
<my-component :posts="$data.collections.posts" :url="$data.page.url"></my-component>
```

## File Structure

```
src/
├── index.webc                          # Homepage (WebC)
├── blog.webc                           # Archive page (WebC)
├── tags-list.njk                       # Tags index (Nunjucks — permalink bug)
├── tags.njk                            # Tag pages (Nunjucks — pagination)
├── feed.xml.11ty.js                    # Atom feed (JS template)
├── feed.json.11ty.js                   # JSON feed (JS template)
├── _includes/
│   ├── layouts/
│   │   ├── base.njk                    # Root layout (Nunjucks)
│   │   └── post.webc                   # Post layout (WebC → chains to base.njk)
│   ├── components/
│   │   ├── post-feed.webc              # Homepage post feed
│   │   ├── post-list.webc              # Tag page post list
│   │   ├── site-header.webc            # Site header/nav
│   │   ├── site-footer.webc            # Site footer
│   │   ├── site-sidebar.webc           # Homepage sidebar
│   │   ├── social-icon.webc            # Social media SVG icons
│   │   ├── slider-assets.webc          # Conditional slider CSS/JS
│   │   └── web-mentions.webc           # Webmentions display
│   └── partials/
│       ├── meta-tags.njk              # OG/meta tags (Nunjucks)
│       └── link-tags.njk             # Link tags + favicons (Nunjucks)
```
