/**
 * NodeInfo discovery document — points clients at /nodeinfo/2.1.
 */

import type { APIContext } from "astro";
import siteConfig from "../../site.config.ts";

export function GET(context: APIContext) {
  const origin = (context.site ?? new URL(siteConfig.url))
    .toString()
    .replace(/\/$/, "");

  const body = {
    links: [
      {
        rel: "http://nodeinfo.diaspora.software/ns/schema/2.1",
        href: `${origin}/nodeinfo/2.1`,
      },
    ],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
