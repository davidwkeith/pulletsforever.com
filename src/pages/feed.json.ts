/**
 * JSON Feed v1.1 endpoint at `/feed.json`. Includes full post HTML
 * (`content_html`) with absolute URLs, WebSub hub, and an author block.
 */

import type { APIContext } from "astro";
import { getImage } from "astro:assets";
import { getCollection } from "astro:content";
import siteConfig from "../site.config.ts";
import {
  filterTagList,
  publishedPosts,
  renderArticleForFeed,
  rfc3339,
} from "../utils/feed.ts";

export async function GET(context: APIContext) {
  const all = await getCollection("posts");
  const posts = publishedPosts(all);
  const origin = (context.site ?? new URL(siteConfig.url)).toString().replace(/\/$/, "");

  const items = await Promise.all(
    posts.map(async (post) => {
      const postUrl = `${origin}/${post.id}/`;
      const heroUrl = post.data.image
        ? `${origin}${(await getImage({ src: post.data.image, format: "webp", width: 1200 })).src}`
        : undefined;
      const item: Record<string, unknown> = {
        id: postUrl,
        url: postUrl,
        title: post.data.title,
        content_html: renderArticleForFeed(post, origin),
        date_published: rfc3339(post.data.publishDate),
        tags: filterTagList(post.data.tags),
      };
      if (heroUrl) item.image = heroUrl;
      if (post.data.description) item.summary = post.data.description;
      return item;
    }),
  );

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: siteConfig.title,
    language: siteConfig.language,
    home_page_url: `${origin}/`,
    feed_url: `${origin}/feed.json`,
    hubs: [{ type: "WebSub", url: siteConfig.websub.hub }],
    icon: `${origin}${siteConfig.logo.src}`,
    favicon: `${origin}${siteConfig.favicon}`,
    description: siteConfig.description,
    author: {
      name: siteConfig.author.name,
      url: siteConfig.author.url,
      avatar: `${origin}${siteConfig.author.avatar}`,
    },
    items,
  };

  return new Response(JSON.stringify(feed, null, "\t"), {
    headers: { "content-type": "application/feed+json; charset=utf-8" },
  });
}
