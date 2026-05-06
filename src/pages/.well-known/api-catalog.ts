/**
 * RFC 9727 API catalog — points consumers at the IndieWeb endpoints
 * (feeds, webmention, websub) this site supports.
 */

import type { APIContext } from "astro";
import siteConfig from "../../site.config.ts";

export function GET(context: APIContext) {
  const origin = (context.site ?? new URL(siteConfig.url))
    .toString()
    .replace(/\/$/, "");

  const body = {
    linkset: [
      {
        anchor: `${origin}/.well-known/api-catalog`,
        item: [
          { href: `${origin}/feed.xml`, type: "application/atom+xml" },
          { href: `${origin}/feed.json`, type: "application/feed+json" },
          {
            href: siteConfig.webmention.endpoint,
            type: "application/x-www-form-urlencoded",
          },
          {
            href: siteConfig.websub.hub,
            type: "application/x-www-form-urlencoded",
          },
        ],
      },
      {
        anchor: siteConfig.webmention.endpoint,
        "service-desc": [
          { href: "https://www.w3.org/TR/webmention/", type: "text/html" },
        ],
      },
    ],
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type":
        'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
    },
  });
}
