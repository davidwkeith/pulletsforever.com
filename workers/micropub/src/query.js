/**
 * Micropub query handler
 * https://www.w3.org/TR/micropub/#querying
 */

/**
 * Handle Micropub GET queries
 * @param {URL} url
 * @param {object} env
 * @returns {Response}
 */
export function handleQuery(url, env) {
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
            type: "reply",
            name: "Reply",
          },
        ],
      });

    case "syndicate-to":
      // No syndication targets configured yet
      return jsonResponse({ "syndicate-to": [] });

    case "source":
      // Source query not implemented yet
      return jsonResponse({ error: "not_implemented", error_description: "Source query not yet supported" }, 501);

    default:
      return jsonResponse({ error: "invalid_request", error_description: `Unknown query: ${q}` }, 400);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
