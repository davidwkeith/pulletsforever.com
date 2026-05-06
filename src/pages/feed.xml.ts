/**
 * Atom feed at `/feed.xml`. Mirrors the old Eleventy output: full
 * post HTML, absolutized URLs, WebSub hub link, author block.
 */

import type { APIContext } from "astro";
import { getImage } from "astro:assets";
import { getCollection } from "astro:content";
import siteConfig from "../site.config.ts";
import {
  escapeXml,
  filterTagList,
  publishedPosts,
  renderArticleForFeed,
  rfc3339,
} from "../utils/feed.ts";

export async function GET(context: APIContext) {
  const all = await getCollection("posts");
  const posts = publishedPosts(all);
  const origin = (context.site ?? new URL(siteConfig.url)).toString().replace(/\/$/, "");
  const selfUrl = `${origin}/feed.xml`;
  const updated = posts.length
    ? rfc3339(posts[0].data.publishDate)
    : rfc3339(new Date());

  const entries = (
    await Promise.all(
      posts.map(async (post) => {
        const postUrl = `${origin}/${post.id}/`;
        const heroUrl = post.data.image
          ? `${origin}${(await getImage({ src: post.data.image, format: "webp", width: 1200 })).src}`
          : undefined;
        const articleHtml = renderArticleForFeed(post, origin, heroUrl);
        const tags = filterTagList(post.data.tags);
        const categoryTags = tags
          .map((tag) => `\t\t<category term="${escapeXml(tag)}"/>`)
          .join("\n");
        const published = rfc3339(post.data.publishDate);
        return `\t<entry>
\t\t<title>${escapeXml(post.data.title)}</title>
\t\t<link href="${postUrl}" rel="alternate" type="text/html"/>
\t\t<id>${postUrl}</id>
\t\t<published>${published}</published>
\t\t<updated>${published}</updated>
${categoryTags ? categoryTags + "\n" : ""}\t\t<content type="html">${escapeXml(articleHtml)}</content>
\t</entry>`;
      }),
    )
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${siteConfig.language}">
\t<title>${escapeXml(siteConfig.title)}</title>
\t<subtitle>${escapeXml(siteConfig.description)}</subtitle>
\t<link href="${selfUrl}" rel="self" type="application/atom+xml"/>
\t<link href="${origin}/" rel="alternate" type="text/html"/>
\t<link href="${siteConfig.websub.hub}" rel="hub"/>
\t<updated>${updated}</updated>
\t<id>${origin}/</id>
\t<author>
\t\t<name>${escapeXml(siteConfig.author.name)}</name>
\t\t<email>${siteConfig.author.email}</email>
\t\t<uri>${siteConfig.author.url}</uri>
\t</author>
\t<icon>${origin}${siteConfig.logo.src}</icon>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: { "content-type": "application/atom+xml; charset=utf-8" },
  });
}
