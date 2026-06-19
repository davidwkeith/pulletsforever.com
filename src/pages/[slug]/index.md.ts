/**
 * Raw Markdown source for each post at `/{slug}/index.md`.
 *
 * Powers content negotiation in workers/site: when a client requests a post
 * URL with `Accept: text/markdown`, the worker rewrites the path to the
 * matching `index.md` here and serves it instead of the rendered HTML.
 */

import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import siteConfig from "../../site.config.ts";
import { filterTagList, publishedPosts, type Post } from "../../utils/feed.ts";
import { rewriteBlogImageUrls, resolveBlogImage } from "../../utils/blog-images.ts";

export async function getStaticPaths() {
  const all = await getCollection("posts");
  return publishedPosts(all).map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

export async function GET({ props }: APIContext) {
  const post = props.post as Post;
  const isoDate = post.data.publishDate.toISOString().slice(0, 10);
  const tags = filterTagList(post.data.tags);

  const lines: string[] = [];
  lines.push("---");
  lines.push(`title: "${post.data.title.replace(/"/g, '\\"')}"`);
  lines.push(`date: ${isoDate}`);
  lines.push(`author: ${siteConfig.author.name}`);
  lines.push(`url: ${siteConfig.url}/${post.id}/`);
  if (post.data.description) {
    lines.push(
      `description: "${post.data.description.replace(/"/g, '\\"')}"`,
    );
  }
  if (tags.length) {
    lines.push("tags:");
    for (const tag of tags) lines.push(`  - ${tag}`);
  }
  lines.push("---");
  lines.push("");
  const body = await rewriteBlogImageUrls(post.body ?? "", resolveBlogImage);
  lines.push(body);

  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
