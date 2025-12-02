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

## SEO Improvements

### Phase 1: Social Sharing Meta Tags (High) ✅

- [x] Enable og:image for social previews
  - Custom social card generator in `plugins/social-images.js`
  - Auto-includes first image from post on right side of card
  - Images output to `_build/img/social-cards/`
- [x] Add Twitter/X Card meta tags
  - `twitter:card` (summary_large_image)
  - `twitter:title`
  - `twitter:description`
  - `twitter:image`

### Phase 2: Article-Specific OpenGraph (Medium)

- [ ] Add article meta tags for blog posts
  - `article:published_time`
  - `article:modified_time`
  - `article:author`
  - `article:tag`

### Phase 3: Schema.org Enhancements (Medium)

- [ ] Complete BlogPosting schema for posts
  - Add `datePublished` from page data
  - Add `dateModified` from page data
  - Add `headline` from title
  - Add `mainEntityOfPage` from canonical URL

### Phase 4: Minor Fixes (Low)

- [ ] Add standard `/sitemap.xml` location (currently only at `/.well-known/sitemap.xml`)
- [ ] Move SPDX comment in `robots.txt` below sitemap line

---

## License

- **Code**: [ISC License](https://opensource.org/license/isc-license-txt)
- **Content**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
