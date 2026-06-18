/**
 * Shared utilities for Atom and JSON feed generation.
 *
 * Renders a Markdoc post body to HTML, absolutizes any relative URLs against
 * the site origin, and tags posts with a normalized list of categories.
 */

import Markdoc from "@markdoc/markdoc";
import type { CollectionEntry } from "astro:content";
import { applyFootnotePatch, footnoteTags } from "./footnotes.ts";
import { applyTypographyPatch } from "./typography.ts";

applyFootnotePatch();
applyTypographyPatch();

export type Post = CollectionEntry<"posts">;

const RESERVED_TAGS = new Set(["all", "nav", "post", "posts"]);

export function filterTagList(tags: readonly string[] | undefined): string[] {
  return (tags ?? []).filter((tag) => !RESERVED_TAGS.has(tag));
}

/** Render the Markdoc body of a post to a string of HTML. */
export function renderPostHtml(post: Post): string {
  const ast = Markdoc.parse(post.body ?? "");
  const transformed = Markdoc.transform(ast, { tags: footnoteTags });
  return Markdoc.renderers.html(transformed);
}

/**
 * Rewrite relative `href` and `src` attributes to absolute URLs against
 * `siteOrigin`. Mirrors `convertHtmlToAbsoluteUrls` from the old feed.
 */
export function absolutizeHtml(html: string, siteOrigin: string): string {
  const origin = siteOrigin.replace(/\/$/, "");
  return html.replace(
    /\b(href|src)="(?!https?:\/\/|mailto:|data:|#)([^"]*)"/g,
    (_match, attr: string, value: string) => {
      const path = value.startsWith("/") ? value : `/${value}`;
      return `${attr}="${origin}${path}"`;
    },
  );
}

/**
 * Build a post's full article HTML for inclusion in a feed entry.
 *
 * Mirrors the website (`[slug].astro`), which renders only the post
 * body. The frontmatter `image` is metadata (og:image, JSON-LD,
 * related-post tiles) — every post that wants a visible hero authors
 * it as the first inline image in the body. We deliberately do NOT
 * prepend a hero `<figure>` here: doing so duplicated the image, since
 * the body already contains it.
 */
export function renderArticleForFeed(
  post: Post,
  siteOrigin: string,
): string {
  const body = absolutizeHtml(renderPostHtml(post), siteOrigin);
  // Posts with footnotes already include the "-dwk" signature inside
  // `body` (injected by the `fnblock` Markdoc transform so it sits
  // before the footnote section). Footnote-less posts get it appended
  // here at the end.
  const hasFootnotes = /^\[\^[^\]]+\]:/m.test(post.body ?? "");
  let html = `  ${body}\n`;
  if (!hasFootnotes) {
    html += `  <p class="signature">-dwk</p>`;
  }
  return html;
}

export function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function rfc3339(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Find posts related to `current` by shared tag count.
 * Returns up to `limit` posts sorted by number of shared tags (descending),
 * tie-broken by most recent first. Excludes the current post and drafts.
 */
export function relatedPosts(
  current: Post,
  all: Post[],
  limit = 3,
): Post[] {
  const currentTags = filterTagList(current.data.tags);
  if (currentTags.length === 0) return [];

  const candidates = publishedPosts(all)
    .filter((p) => p.id !== current.id)
    .map((post) => {
      const tags = filterTagList(post.data.tags);
      const score = currentTags.filter((t) => tags.includes(t)).length;
      return { post, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (
        b.post.data.publishDate.getTime() - a.post.data.publishDate.getTime()
      );
    });

  return candidates.slice(0, limit).map((item) => item.post);
}

/** Estimated reading time in minutes from a post's raw Markdoc body. */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function publishedPosts(
  posts: Post[],
  { newestFirst = true }: { newestFirst?: boolean } = {},
): Post[] {
  const filtered = posts.filter((p) => !p.data.draft);
  filtered.sort((a, b) => {
    const diff =
      a.data.publishDate.getTime() - b.data.publishDate.getTime();
    return newestFirst ? -diff : diff;
  });
  return filtered;
}
