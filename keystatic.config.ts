/**
 * Keystatic CMS configuration — the visual editor at `/keystatic` (dev only).
 *
 * Local-file storage: edits write `.mdoc` files in `src/content/posts/`, which
 * are committed and deployed as a static build. The schema here mirrors the Zod
 * schema in `src/content.config.ts`; both validate the same frontmatter.
 *
 * @see https://keystatic.com/docs/configuration
 * @module
 */

import { config, fields, collection } from "@keystatic/core";

export default config({
  storage: { kind: "local" },
  collections: {
    posts: collection({
      label: "Blog Posts",
      slugField: "title",
      path: "src/content/posts/*",
      format: { contentField: "content" },
      schema: {
        title: fields.slug({ name: { label: "Title" } }),
        description: fields.text({
          label: "Description",
          description: "For search engines and social sharing (1–2 sentences)",
        }),
        publishDate: fields.date({
          label: "Publish Date",
          validation: { isRequired: true },
        }),
        image: fields.text({
          label: "Image",
          description: "Hero image path under public/ (optional)",
        }),
        imageAlt: fields.text({
          label: "Image Alt Text",
          description: "Required if image is set",
        }),
        tags: fields.array(fields.text({ label: "Tag" }), {
          label: "Tags",
          itemLabel: (props) => props.value || "tag",
        }),
        draft: fields.checkbox({
          label: "Draft",
          description: "Drafts are not published to the live site",
          defaultValue: false,
        }),
        syndication: fields.array(fields.url({ label: "URL" }), {
          label: "Syndication Links",
          description: "URLs where this post was cross-posted",
          itemLabel: (props) => props.value || "Add URL",
        }),
        content: fields.markdoc({ label: "Content" }),
      },
    }),
  },
});
