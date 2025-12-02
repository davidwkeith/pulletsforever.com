# pulletsforever.com

A personal blog about backyard chickens, technology, and other interests. Built with [Eleventy](https://www.11ty.dev/).

## Development

```bash
# Install dependencies
npm install

# Run development server
npm start

# Build for production
npm run build
```

## Project Structure

```
pulletsforever.com/
├── src/              # Content and templates
│   ├── blog/         # Blog posts
│   ├── _data/        # Data files (metadata, schema, CSP, etc.)
│   ├── _includes/    # Layouts, partials, macros, CSS, JS
│   └── ...
├── plugins/          # Custom Eleventy plugins
└── _build/           # Generated output (gitignored)
```

---

## Blog Post Frontmatter

Blog posts support the following frontmatter fields (see [frontmatter.json](frontmatter.json)):

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Post title |
| `date` | Yes | Publication date (`YYYY-MM-DD` or ISO 8601) |
| `description` | No | Short description for meta tags |
| `tags` | No | Array of categorization tags |
| `modified` | No | Last modification date (`YYYY-MM-DD`) |

---

## Accessibility Improvements

### Current State (Good)

- ✅ Semantic HTML structure (`<header>`, `<main>`, `<nav>`, `<article>`, `<footer>`)
- ✅ Language attribute on `<html>` element
- ✅ `aria-current="page"` on active nav links
- ✅ `.visually-hidden` utility class available
- ✅ All images have `alt` attributes
- ✅ Responsive images with `width`/`height` to prevent layout shift
- ✅ `prefers-color-scheme` dark mode support
- ✅ System font stack for readability
- ✅ Line height 1.5 for body text

### Phase 1: Color Contrast (High) ✅

- [x] Light mode link colors WCAG AA compliant
- [x] Dark mode link colors WCAG AA compliant
  - Fixed `--text-color-link-active` from `#6969f7` to `#7b7bff` (~5.4:1)
- [x] Added visible `:focus-visible` styles for keyboard navigation

### Phase 2: Keyboard Navigation (Medium)

- [ ] Add skip-to-main-content link
- [ ] Ensure all interactive elements are keyboard accessible
- [ ] Add focus trap for any modals (if added in future)

### Phase 3: Screen Reader Improvements (Medium)

- [ ] Add `aria-label` to nav element
- [ ] Add `role="list"` to styled lists if needed
- [ ] Ensure header anchors have accessible names

### Phase 4: Motion & Preferences (Low)

- [ ] Add `prefers-reduced-motion` media query for any animations
- [ ] Consider `prefers-contrast` for high contrast mode

---

## License

- **Code**: [ISC License](https://opensource.org/license/isc-license-txt)
- **Content**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
