#!/usr/bin/env node
/**
 * Create a new blog post with proper frontmatter
 *
 * Usage:
 *   npm run new-post "My Post Title"
 *   npm run new-post "My Post Title" --with-assets
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const args = process.argv.slice(2);
const withAssets = args.includes('--with-assets');
const title = args.filter(arg => !arg.startsWith('--'))[0];

if (!title) {
  console.error('Usage: npm run new-post "Post Title" [--with-assets]');
  process.exit(1);
}

// Generate slug from title
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const date = new Date().toISOString().split('T')[0];

const frontmatter = `---
title: ${title}
date: ${date}
tags: []
---

`;

const postsDir = 'src/posts';

if (withAssets) {
  // Create directory-based post for posts with images
  const postDir = join(postsDir, slug);

  if (existsSync(postDir)) {
    console.error(`Error: Directory already exists: ${postDir}`);
    process.exit(1);
  }

  mkdirSync(postDir, { recursive: true });
  const filePath = join(postDir, 'index.md');
  writeFileSync(filePath, frontmatter);
  console.log(`Created: ${filePath}`);
  console.log(`Add images to: ${postDir}/`);
} else {
  // Create simple flat post
  const filePath = join(postsDir, `${slug}.md`);

  if (existsSync(filePath)) {
    console.error(`Error: File already exists: ${filePath}`);
    process.exit(1);
  }

  writeFileSync(filePath, frontmatter);
  console.log(`Created: ${filePath}`);
}
