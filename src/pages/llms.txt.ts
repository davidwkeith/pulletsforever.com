/**
 * llms.txt endpoint — a plain-text site map for language models.
 * Format: https://llmstxt.org/
 */

import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import siteConfig from "../site.config.ts";
import { publishedPosts } from "../utils/feed.ts";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(context: APIContext) {
  const all = await getCollection("posts");
  const posts = publishedPosts(all);
  const origin = (context.site ?? new URL(siteConfig.url)).toString().replace(/\/$/, "");

  const lines: string[] = [];
  lines.push(`# ${siteConfig.title}`);
  lines.push("");
  lines.push(`> ${siteConfig.description}`);
  lines.push("");
  lines.push(
    `${siteConfig.title} is a personal blog by ${siteConfig.author.name}.`,
  );
  lines.push("Content is licensed under CC BY 4.0. Code is licensed under ISC.");
  lines.push("");
  lines.push("## Pages");
  lines.push("");
  lines.push(`- [Blog](${origin}/blog/): All posts`);
  lines.push(`- [Tags](${origin}/tags/): Browse by topic`);
  lines.push(`- [Feed (Atom)](${origin}/feed.xml): RSS/Atom feed`);
  lines.push(`- [Feed (JSON)](${origin}/feed.json): JSON Feed`);
  lines.push("");
  lines.push("## Posts");
  lines.push("");
  for (const post of posts) {
    const url = `${origin}/${post.id}/`;
    const desc = post.data.description ? `: ${post.data.description}` : "";
    lines.push(
      `- [${post.data.title}](${url}) (${isoDate(post.data.publishDate)})${desc}`,
    );
  }

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
