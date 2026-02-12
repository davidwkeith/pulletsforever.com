# Nunjucks to WebC Conversion Plan

## Current State

- **27 Nunjucks templates** (~800 lines of template code)
- **18 custom filters**, 2 macros, 5 partials, 3 layouts, 6 page templates
- Eleventy 3.1.2 with `@11ty/eleventy-plugin-bundle` for CSS/JS bundling
- WebC is **not installed**

## Why WebC

- Single-file components with co-located HTML, CSS, and JS
- Scoped CSS via `<style webc:scoped>` (no manual BEM or class collision worries)
- Automatic CSS/JS bundle extraction from component `<style>`/`<script>` tags
- Standards-based HTML syntax (no `{% %}` template directives)
- Incremental build awareness from WebC's component dependency graph

## Risks and Constraints

| Risk | Severity | Mitigation |
|------|----------|------------|
| WebC is v0.x, last stable release April 2024 | Medium | Keep Nunjucks for critical paths; conversion is reversible |
| Pagination + dynamic permalinks broken in WebC | High | **Keep paginated templates in Nunjucks** (tags.njk) |
| RSS/Atom feeds require Nunjucks (plugin uses it) | High | **Keep feed templates in Nunjucks** (feed.xml.njk, feed.json.njk) |
| `$data` prefix required in child components | Low | Consistent convention, document in CLAUDE.md |
| Eleventy is a side-project; WebC velocity uncertain | Medium | Incremental approach limits blast radius |
| Vento is emerging as alternative template language | Low | WebC and Vento serve different purposes |

## Conversion Phases

### Phase 0: Setup (1 commit)

**Install dependencies and enable WebC alongside Nunjucks.**

```bash
npm install @11ty/eleventy-plugin-webc @11ty/webc
```

Update `.eleventy.js`:
```javascript
import pluginWebc from "@11ty/eleventy-plugin-webc";

// Inside export default function:
eleventyConfig.addPlugin(pluginWebc, {
  components: "src/_includes/components/**/*.webc"
});

// Add "webc" to templateFormats
return {
  templateFormats: ["html", "md", "njk", "webc"],
  // Keep njk as markdown/html engine for now
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
};
```

Create the components directory:
```
src/_includes/components/
```

**Validation:** `npm run build` passes, no behavior change.

---

### Phase 1: Leaf Components (macros -> WebC)

**Convert the 2 Nunjucks macros to WebC components.** These are self-contained with no data cascade dependencies.

#### 1a. Social Icon macro -> `<social-icon>` component

**Before** (`src/_includes/macros/social-icon.njk`):
```nunjucks
{% macro socialIcon(service, s) %}
  {% if service == "mastodon" %}
    <svg ...>...</svg>
  {% elif service == "github" %}
    <svg ...>...</svg>
  {% endif %}
{% endmacro %}
```

**After** (`src/_includes/components/social-icon.webc`):
```html
<script webc:type="js">
const icons = {
  mastodon: `<svg ...>...</svg>`,
  github: `<svg ...>...</svg>`,
  // ... etc
};
icons[service] || '';
</script>
```

**Usage changes:**
```diff
- {% from "macros/social-icon.njk" import socialIcon %}
- {{ socialIcon("mastodon", 24) }}
+ <social-icon service="mastodon" size="24"></social-icon>
```

Files touched: `sidebar.njk`, `footer.njk`, `social-icon.njk` (deleted), new `social-icon.webc`.

#### 1b. Article macro -> `<blog-article>` component

**Before** (`src/_includes/macros/article.njk`):
```nunjucks
{% macro article(page, content) %}
  {{ content | safe }}
{% endmacro %}
```

**After** (`src/_includes/components/blog-article.webc`):
```html
<slot></slot>
```

Files touched: `post.njk`, `project.njk`, `article.njk` (deleted), new `blog-article.webc`.

**Validation:** Build passes. Visually compare rendered HTML before/after.

---

### Phase 2: Simple Includes -> WebC Components

**Convert stateless includes that render markup from passed data.**

#### 2a. Post list (`postslist.njk`) -> `<post-list>`

The `postslist.njk` partial iterates over a posts collection and renders a list. Convert to a WebC component that receives the list via `$data`.

#### 2b. Post feed (`postfeed.njk`) -> `<post-feed>`

Renders the homepage feed with images, excerpts, reading time. Uses several custom filters (`firstImage`, `postImageUrl`, `excerpt`, `readingTime`). These filters remain as-is; WebC calls them as functions.

**Validation:** Homepage and archive render identically.

---

### Phase 3: Partials -> WebC Components

**Convert partials that access global data via `$data`.**

| Partial | Component Name | Complexity | Notes |
|---------|---------------|------------|-------|
| `header.njk` | `<site-header>` | Low | Uses `eleventyNavigation` filter |
| `footer.njk` | `<site-footer>` | Low | Static + social links loop |
| `sidebar.njk` | `<site-sidebar>` | Medium | Accesses `$data.metadata`, `$data.collections` |
| `link-tags.njk` | `<link-tags>` | Low | Conditional `<link>` elements |
| `meta-tags.njk` | `<meta-tags>` | Medium | Many filters, conditional OG tags |
| `webmentions.njk` | `<web-mentions>` | High | Nested loops, conditionals, 5+ filters |

**Order:** header -> footer -> link-tags -> sidebar -> meta-tags -> webmentions (easiest first).

**Validation per component:** Build passes. Diff rendered HTML output before/after.

---

### Phase 4: Layouts -> WebC

**Convert the 3 layout templates.** This is the highest-risk phase.

#### 4a. `base.njk` -> `base.webc`

The root layout. Handles:
- HTML skeleton with `<head>` and `<body>`
- CSS/JS bundle output (`getBundle`)
- Includes: header, footer, meta-tags, link-tags
- Conditional sidebar on homepage

```html
<!-- base.webc -->
<!doctype html>
<html :lang="$data.metadata.language">
<head>
  <meta-tags></meta-tags>
  <link-tags></link-tags>
  <style @raw="getBundle('css')" webc:keep></style>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <site-header></site-header>
  <main id="main-content">
    <slot></slot>
  </main>
  <site-footer></site-footer>
  <script @raw="getBundle('js')" webc:keep></script>
</body>
</html>
```

#### 4b. `post.njk` -> `post.webc`

The most complex template. Handles:
- Post metadata (date, tags, reading time)
- Table of contents generation
- Article content rendering
- Related posts with images
- Webmentions
- Previous/next navigation

This will use `webc:type="js"` blocks for complex filter chains and `webc:for` for loops.

#### 4c. `project.njk` -> `project.webc`

Simple variant of post layout. Low complexity.

**Validation:** Full site build. Compare every page's HTML output before/after.

---

### Phase 5: Page Templates

**Convert page-level `.njk` files to `.webc`.**

| Page | Convertible? | Notes |
|------|-------------|-------|
| `index.njk` | Yes | Homepage with post feed |
| `blog.njk` | Yes | Archive grid |
| `tags-list.njk` | Yes | Simple tag listing |
| `tags.njk` | **No** | Uses pagination with dynamic permalinks (broken in WebC) |
| `feed.xml.njk` | **No** | RSS plugin requires Nunjucks |
| `feed.json.njk` | **No** | JSON Feed with Nunjucks filters |
| `404.md` | N/A | Markdown, uses layout only |

Also **keep in Nunjucks**:
- `_headers.njk`, `_redirects.njk` (plain text config files)
- `.well-known/*.njk` (minimal files, not worth converting)
- `markdown-source.njk` (build utility)

**Validation:** Full site build. All pages render correctly.

---

### Phase 6: Cleanup

- Remove unused Nunjucks macros directory
- Update `CLAUDE.md` with WebC conventions
- Update `.eleventy.js`: if all non-feed pages are WebC, consider removing `njk` from `templateFormats` (keep `markdownTemplateEngine: "njk"` for markdown files)
- Document the `$data` convention for component data access
- Document which templates remain in Nunjucks and why

---

## Templates That Stay in Nunjucks

These templates should **not** be converted due to WebC limitations:

| Template | Reason |
|----------|--------|
| `src/tags.njk` | Pagination with dynamic permalinks is broken in WebC |
| `src/feed.xml.njk` | `@11ty/eleventy-plugin-rss` requires Nunjucks |
| `src/feed.json.njk` | JSON Feed with Nunjucks-specific filter chains |
| `src/markdown-source.njk` | Build utility template |
| `src/_headers.njk` | Plain text output, no benefit to converting |
| `src/_redirects.njk` | Plain text output, no benefit to converting |
| `src/.well-known/*.njk` | Trivial files, no benefit to converting |

## Filter Migration

All 18 custom filters registered via `eleventyConfig.addFilter()` work automatically in WebC. The syntax changes from pipe notation to function call notation:

```diff
- {{ title | slugify }}
+ @text="slugify(title)"

- {{ page.date | readableDate }}
+ @text="readableDate(page.date)"

- {{ content | firstImage | socialImageUrl(title) }}
+ :src="socialImageUrl(firstImage(content), title)"
```

The async filter `fixMarkdownImagePaths` only runs during markdown processing (configured via `markdownTemplateEngine`), so it is unaffected by the WebC conversion.

## Validation Strategy

For each phase:

1. **Build test:** `npm run build` completes without errors
2. **HTML diff:** Compare rendered HTML output of affected pages before/after
3. **Visual check:** Spot-check pages in the dev server (`npm start`)
4. **Bundle check:** Verify CSS/JS bundles still contain all expected styles/scripts
5. **Feed check:** RSS and JSON feeds remain valid (only relevant after layout changes)

## Estimated Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 0: Setup | 15 min | None |
| Phase 1: Leaf components | 1 hour | Low |
| Phase 2: Simple includes | 1 hour | Low |
| Phase 3: Partials | 2-3 hours | Medium |
| Phase 4: Layouts | 2-3 hours | High |
| Phase 5: Page templates | 1-2 hours | Medium |
| Phase 6: Cleanup | 30 min | None |
| **Total** | **~8-10 hours** | |

Each phase is independently deployable. If a phase causes issues, roll back that phase only.
