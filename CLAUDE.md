# Claude Code Instructions for Pullets Forever

This is an Eleventy (11ty) static blog written in TypeScript. Posts live in `src/posts/`.

## Architecture

- **Templates**: WebC (`.webc`) for components and simple generated files, Nunjucks (`.njk`) for layouts, `.11ty.ts` for complex templates needing async/imports
- **Data**: `src/_data/*.ts` — accessed in WebC as `$data.metadata`, `$data.author`, etc.
- **Layouts**: `src/_includes/layouts/` (base.njk, post.webc)
- **Components**: `src/_includes/components/*.webc`
- **Workers**: `workers/site/` (content negotiation), `workers/micropub/` (Micropub endpoint)
- **Node**: Requires Node 22+ (pinned via `.nvmrc`) for native TypeScript support

## Creating a New Post

### Quick method (npm script)
```bash
npm run new-post "My Post Title"           # Simple post
npm run new-post "My Post Title" --with-assets  # Post with images
```

### Manual method
For a simple post (no images):
1. Create `src/posts/my-post-slug.md`
2. Add frontmatter:
```yaml
---
title: My Post Title
date: 2025-01-30
tags: []
---
```

For a post with images:
1. Create `src/posts/my-post-slug/index.md`
2. Add images to the same directory
3. Reference images with relative paths: `![alt text](image.jpg)`

## Post Structure Rules
- **Text-only posts**: `src/posts/slug.md`
- **Posts with assets**: `src/posts/slug/index.md` + images in same folder
- **Downloadable files**: Name them `*-prompt.md` to exclude from template processing

## Required Frontmatter
```yaml
---
title: Post Title        # Required
date: YYYY-MM-DD        # Required
tags: [tag1, tag2]      # Optional
description: ...        # Optional, used for meta tags
---
```

## Development
```bash
npm start              # Dev server with live reload
npm run build          # Production build
```

## Template Patterns

For simple generated files (text, JSON, XML without async logic), prefer WebC:
```html
---
eleventyExcludeFromCollections: true
permalink: /.well-known/example.txt
---
Static text with <template webc:nokeep @text="$data.metadata.title"></template> interpolation.
```

Use `.11ty.ts` only when the template needs imports, async operations, or collection iteration that can't be expressed with `webc:for`.

## Testing Changes
After editing, run `npm run build` to verify no errors before committing.
