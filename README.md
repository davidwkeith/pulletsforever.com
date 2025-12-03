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
└── _site/            # Generated output (gitignored)
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

## Blog Best Practices Improvements

### Current State (Good)

- JSON Feed at `/feed.json`
- Sitemap at `/.well-known/sitemap.xml`
- Schema.org structured data (BlogPosting)
- OpenGraph & Twitter card meta tags
- rel="me" links & Fediverse integration
- Tag system with index and individual tag pages
- 404 page, robots.txt, security.txt, humans.txt

### Phase 1: Reader Experience (High Impact) - COMPLETE

- [x] Add reading time estimates to posts
- [x] Add table of contents for long posts (auto-generated from headings)
- [x] Add RSS/Atom feed alongside JSON Feed

### Phase 2: Content & Navigation (Medium Impact)

- [x] Create About page with author bio and h-card microformat
- [x] Add related posts section (tag-based suggestions)
- [x] Add h-entry microformat classes to post template

### Phase 3: IndieWeb & Engagement (Lower Priority)

- [x] Implement webmentions support (webmention.io)
- [ ] Add client-side search (Pagefind or Lunr.js)
- [ ] Consider newsletter signup integration

---

## Webmentions

This site supports [webmentions](https://indieweb.org/Webmention) via [webmention.io](https://webmention.io/).

### Receiving Webmentions

1. Set the `WEBMENTION_IO_TOKEN` environment variable (get from webmention.io dashboard)
2. Webmentions are fetched at build time and cached in `.cache/webmentions.json`
3. Client-side JavaScript refreshes webmentions for visitors

### Sending Webmentions

After publishing new content with external links:

```bash
# Preview what would be sent
npm run webmentions:send:dry

# Send webmentions
npm run webmentions:send
```

Sent webmentions are tracked in `.cache/webmentions-sent.json` to avoid duplicates.

---

## License

- **Code**: [ISC License](https://opensource.org/license/isc-license-txt)
- **Content**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
