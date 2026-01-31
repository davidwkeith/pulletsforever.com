# Claude Code Instructions for Pullets Forever

This is an Eleventy (11ty) static blog. Posts live in `src/posts/`.

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

## Testing Changes
After editing, run `npm run build` to verify no errors before committing.
