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
│   ├── _data/        # Site-specific data
│   └── ...
├── data/             # Global data files (to be moved)
├── includes/         # Layouts and partials (to be moved)
├── plugins/          # Custom Eleventy plugins
└── _build/           # Generated output (gitignored)
```

---

## Refactoring Plan

This project was recently extracted from a multi-site monorepo (`static-websites`). The following cleanup tasks remain to align with Eleventy best practices.

### Phase 1: Remove Multi-Site Debris

**Priority: High**

- [ ] Remove legistar plugin (santaclara.dwk.io-specific)
  - Delete `plugins/legistar.js`
  - Delete `plugins/lib/fetchWithCache.js`
  - Remove import and plugin registration from `.eleventy.js`
- [ ] Remove webmentions configuration (dwk.io-specific)
  - Remove `configWebmentions` and conditional plugin loading from `.eleventy.js`
- [ ] Remove site detection logic
  - Remove hardcoded `const site = "pulletsforever.com"` and conditional blocks in `.eleventy.js`
- [ ] Remove unused dependencies from `package.json`
  - `jsonld-checker` (never used)
  - `sharp` (not imported anywhere)
  - `node-fetch` (only used by legistar)
  - `@chrisburnell/eleventy-cache-webmentions` (dwk.io-specific)

### Phase 2: Standardize Directory Structure

**Priority: High**

- [ ] Move `/data/` contents into `src/_data/`
  - Merge `data/metadata.js` with `src/_data/metadata.js`
  - Move `data/author.js` → `src/_data/author.js`
  - Move `data/schema.js` → `src/_data/schema.js` (merge with existing)
  - Move `data/head_links.js` → `src/_data/head_links.js`
  - Move `data/csp.js` → `src/_data/csp.js`
  - Delete `/data/` directory
- [ ] Move `/includes/` to `src/_includes/`
  - Move all layouts, partials, macros, css, js
  - Delete `/includes/` directory
- [ ] Update `.eleventy.js` configuration
  - Remove custom `includes: "../includes"` path (use Eleventy default)
  - Add `data: "_data"` if needed

### Phase 3: Update Repository References

**Priority: Medium**

- [ ] Update `data/head_links.js` repository URLs
  - Change `static-websites` → `pulletsforever.com` in:
    - `code-repository`
    - `content-repository`
    - `issues`
- [ ] Update `package.json`
  - Update repository URL to new repo path

### Phase 4: Code Cleanup

**Priority: Low**

- [ ] Delete empty file `src/_js/index.js`
- [ ] Fix CSP glob syntax in `.eleventy.js` line 87
  - Change `"/*.{png|jpg|jpeg|webp}"` to `"/*.{png,jpg,jpeg,webp}"`
- [ ] Remove commented embed plugin from `plugins/markdown-it.js`
- [ ] Remove multi-site comment from `includes/partials/link-tags.njk`
- [ ] Delete legistar cache directory `plugins/.cache/`
- [ ] Clean up FIXME comments in `.eleventy.js`

---

## License

- **Code**: [ISC License](https://opensource.org/license/isc-license-txt)
- **Content**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
