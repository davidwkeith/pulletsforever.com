/**
 * NodeInfo 2.1 document. Reports site identity and post count to
 * fediverse crawlers and discovery tools.
 */

import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import siteConfig from "../../site.config.ts";
import { publishedPosts } from "../../utils/feed.ts";

export async function GET(_context: APIContext) {
  const all = await getCollection("posts");
  const postCount = publishedPosts(all).length;

  const body = {
    version: "2.1",
    software: {
      name: "anglesite",
      version: "0.9.0",
      repository: "https://github.com/davidwkeith/pulletsforever.com",
      homepage: siteConfig.url,
    },
    protocols: ["activitypub"],
    services: {
      inbound: [],
      outbound: ["atom1.0"],
    },
    openRegistrations: false,
    usage: {
      users: { total: 1, activeHalfyear: 1, activeMonth: 1 },
      localPosts: postCount,
      localComments: 0,
    },
    metadata: {
      nodeName: siteConfig.title,
      nodeDescription: siteConfig.description,
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type":
        'application/json; profile="http://nodeinfo.diaspora.software/ns/schema/2.1#"',
    },
  });
}
