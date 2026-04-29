#!/usr/bin/env node
/**
 * Create a new blog post as a Markdoc file in src/content/posts/.
 *
 * Usage:
 *   npm run new-post "My Post Title"
 */

import { writeFileSync, existsSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);
const title = args.filter((arg) => !arg.startsWith("--"))[0];

if (!title) {
  console.error('Usage: npm run new-post "Post Title"');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const date = new Date().toISOString().split("T")[0];

const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: ""
publishDate: "${date}"
tags: []
draft: true
---

`;

const filePath = join("src/content/posts", `${slug}.mdoc`);

if (existsSync(filePath)) {
  console.error(`Error: File already exists: ${filePath}`);
  process.exit(1);
}

writeFileSync(filePath, frontmatter);
console.log(`Created: ${filePath}`);
console.log("Set draft: false when ready to publish.");
console.log(
  "For posts with images, add files to public/images/blog/ and reference",
);
console.log(`as /images/blog/${slug}-{name}.{ext}.`);
