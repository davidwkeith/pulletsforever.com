/**
 * Shared utilities for Atom and JSON feed generation.
 *
 * Renders a Markdoc post body to HTML, absolutizes any relative URLs against
 * the site origin, and tags posts with a normalized list of categories.
 */

import Markdoc from "@markdoc/markdoc";
import type { CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"posts">;

const RESERVED_TAGS = new Set(["all", "nav", "post", "posts"]);

export function filterTagList(tags: readonly string[] | undefined): string[] {
  return (tags ?? []).filter((tag) => !RESERVED_TAGS.has(tag));
}

/** Render the Markdoc body of a post to a string of HTML. */
export function renderPostHtml(post: Post): string {
  const ast = Markdoc.parse(post.body ?? "");
  const transformed = Markdoc.transform(ast);
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

/** Build a post's full article HTML for inclusion in a feed entry. */
export function renderArticleForFeed(post: Post, siteOrigin: string): string {
  const body = absolutizeHtml(renderPostHtml(post), siteOrigin);
  let html = "";
  if (post.data.image) {
    const img = absolutizeHtml(
      `<img src="${post.data.image}" alt="${post.data.imageAlt ?? ""}">`,
      siteOrigin,
    );
    html += `  <figure class="hero-image">\n    ${img}\n  </figure>\n`;
  }
  html += `  ${body}\n`;
  html += `  <p class="signature">-dwk</p>`;
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
