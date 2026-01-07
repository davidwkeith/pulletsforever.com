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

## Micropub (Planned)

Support for [Micropub](https://indieweb.org/Micropub) is planned to enable posting from IndieWeb clients.

### Implementation Plan

1. ~~**Site discovery** - Add `rel` links to HTML head~~ ✓
   - `rel="micropub"` → `https://micropub.pulletsforever.com/micropub`
   - `rel="authorization_endpoint"` → `https://indieauth.com/auth`
   - `rel="token_endpoint"` → `https://indieauth.com/token`

2. ~~**Micropub endpoint** - Cloudflare Worker to handle requests~~ ✓
   - Accept `h-entry` posts (notes, articles, photos)
   - Parse form-encoded and JSON payloads
   - Support `q=config` and `q=syndicate-to` queries
   - See `workers/micropub/`

3. ~~**IndieAuth integration** - Token verification via indieauth.com~~ ✓
   - Verify tokens by calling `https://indieauth.com/token` with the bearer token
   - Confirm `me` matches site URL
   - Scope checking (`create`, `update`, `delete`)

4. ~~**Content creation** - Generate markdown files~~ ✓
   - Create frontmatter from Micropub properties
   - Slug generation from title or timestamp
   - Handle post types: articles (with `name`), notes (no `name`), replies (`in-reply-to`)
   - Commit to git repository via GitLab API

5. ~~**Media endpoint** - Photo/file uploads~~ ✓
   - Accept multipart uploads at `/media`
   - Store in Cloudflare R2 bucket
   - Return URL for embedding
   - See `workers/micropub/src/media.js`

6. **Build trigger** - Automatic deployment
   - GitLab CI/CD pipeline triggers on commit
   - Cloudflare Pages rebuild

7. **Update/delete support** (optional, phase 2)
   - `action=update` with `replace`/`add`/`delete` operations
   - `action=delete` to remove posts

### Micropub Properties Mapping

| Micropub Property | Frontmatter Field | Notes |
|-------------------|-------------------|-------|
| `name` | `title` | If absent, treat as note |
| `content` | Post body | HTML or plain text |
| `published` | `date` | ISO 8601 |
| `category` | `tags` | Array |
| `summary` | `description` | Meta description |
| `photo` | Embedded image | Upload to media endpoint |
| `in-reply-to` | `in-reply-to` | URL being replied to |
| `mp-slug` | Filename/URL slug | Auto-generate if absent |

---

## License

- **Code**: [ISC License](https://opensource.org/license/isc-license-txt)
- **Content**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
