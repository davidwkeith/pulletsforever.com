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
      publishDate: z.string().transform((str) => new Date(str)),
      image: image().optional(),
      imageAlt: z.string().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      syndication: z.array(z.url()).default([]),
    }),
});

export const collections = { posts };
