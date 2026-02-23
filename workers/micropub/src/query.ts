/**
 * Micropub query handler
 * https://www.w3.org/TR/micropub/#querying
 */

import type { Env } from "./env.ts";
import { jsonResponse } from "./utils.ts";

/**
 * Handle Micropub GET queries
 */
export function handleQuery(url: URL, _env: Env): Response {
  const q = url.searchParams.get("q");

  if (!q) {
    return jsonResponse({ error: "invalid_request", error_description: "Missing q parameter" }, 400);
  }

  switch (q) {
    case "config":
      return jsonResponse({
        "media-endpoint": `${new URL(url).origin}/media`,
        "syndicate-to": [],
        "post-types": [
          {
            type: "note",
            name: "Note",
          },
          {
            type: "article",
            name: "Article",
          },
          {
            type: "photo",
            name: "Photo",
          },
          {
            type: "reply",
            name: "Reply",
          },
        ],
      });

    case "syndicate-to":
      return jsonResponse({ "syndicate-to": [] });

    case "source":
      return jsonResponse({ error: "not_implemented", error_description: "Source query not yet supported" }, 501);

    default:
      return jsonResponse({ error: "invalid_request", error_description: `Unknown query: ${q}` }, 400);
  }
}
