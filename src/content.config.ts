/**
 * Astro content collection schemas. Validates frontmatter at build time
 * for every Markdoc file in `src/content/`.
 *
 * @see https://docs.astro.build/en/guides/content-collections/
 * @module
 */

import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.mdoc", base: "./src/content/posts" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      // Accept both a quoted string (hand-written posts) and an unquoted YAML
      // date (Keystatic's fields.date output, parsed by js-yaml as a Date).
      publishDate: z.coerce.date(),
      image: image().optional(),
      imageAlt: z.string().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      syndication: z.array(z.url()).default([]),
    }),
});

export const collections = { posts };
