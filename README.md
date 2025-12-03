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

## Performance Improvements

### Current Optimizations

- Inlined CSS (no render-blocking stylesheets)
- System fonts only (no web font loading delay)
- Eleventy Image Transform (WebP format, lazy loading, responsive sizes)
- JavaScript bundled and deferred
- HTML minification via `@sherby/eleventy-plugin-files-minifier`

### Phase 1: Resource Hints (High Impact)

- [ ] Add `preconnect` for `static.cloudflareinsights.com`
- [ ] Add `dns-prefetch` for `app.greenweb.org`
- [ ] Add `dns-prefetch` for `mirrors.creativecommons.org`

### Phase 2: Caching & Loading Fixes (Medium Impact)

- [ ] Remove `?nocache=true` from green web badge URL (defeats browser caching)
- [ ] Fix logo `loading=""` attribute (empty string is invalid)
- [ ] Add `crossorigin="anonymous"` to Cloudflare Insights script

### Phase 3: Meta & Polish (Low Impact)

- [ ] Add `theme-color` meta tags for light/dark modes

---

## License

- **Code**: [ISC License](https://opensource.org/license/isc-license-txt)
- **Content**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
