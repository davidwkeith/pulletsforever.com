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

## Refactoring Plan

This project was recently extracted from a multi-site monorepo (`static-websites`). The following cleanup tasks remain to align with Eleventy best practices.

### Phase 1: Remove Multi-Site Debris ✅

**Priority: High** — **COMPLETED**

- [x] Remove legistar plugin (santaclara.dwk.io-specific)
  - Deleted `plugins/legistar.js`
  - Deleted `plugins/lib/fetchWithCache.js`
  - Removed import and plugin registration from `.eleventy.js`
- [x] Remove webmentions configuration (dwk.io-specific)
  - Removed `configWebmentions` and conditional plugin loading from `.eleventy.js`
  - Removed webmention/pingback links from `data/head_links.js`
  - Cleaned up commented code in `src/blog/blog.11tydata.js`
- [x] Remove site detection logic
  - Removed hardcoded `const site` variable and conditional blocks in `.eleventy.js`
- [x] Remove unused dependencies from `package.json`
  - `jsonld-checker` (never used)
  - `node-fetch` (only used by legistar)
  - `ical-generator` (only used by legistar)
  - `@chrisburnell/eleventy-cache-webmentions` (dwk.io-specific)
  - Note: `sharp` was kept as it's a peer dependency of `eleventy-plugin-gen-favicons`
- [x] Delete legistar cache directory `plugins/.cache/`

### Phase 2: Standardize Directory Structure ✅

**Priority: High** — **COMPLETED**

- [x] Move `/data/` contents into `src/_data/`
  - Merged `data/metadata.js` into `src/_data/metadata.js` (flattened inheritance)
  - Moved `data/author.js` → `src/_data/author.js`
  - Merged `data/schema.js` into `src/_data/schema.js` (flattened inheritance)
  - Moved `data/head_links.js` → `src/_data/head_links.js`
  - Moved `data/csp.js` → `src/_data/csp.js`
  - Deleted `/data/` directory
- [x] Move `/includes/` to `src/_includes/`
  - Moved all layouts, partials, macros, css, js
  - Updated include paths in templates (`includes/css/` → `css/`, etc.)
  - Deleted `/includes/` directory
- [x] Update `.eleventy.js` configuration
  - Removed custom `includes: "../includes"` path (now uses Eleventy default)
  - Updated CSP import path to `./src/_data/csp.js`

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
- [ ] Clean up FIXME comments in `.eleventy.js`

---

## License

- **Code**: [ISC License](https://opensource.org/license/isc-license-txt)
- **Content**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
