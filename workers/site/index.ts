import { createWorkerHandler } from "@dwk/eleventy-shared/worker";

/**
 * Content negotiation: serve raw Markdown when Accept: text/markdown is requested.
 */
async function contentNegotiation(
  request: Request,
  url: URL,
  env: { ASSETS: { fetch: (input: string | Request) => Promise<Response> } },
): Promise<Response | null> {
  const accept = request.headers.get("accept") || "";
  if (!accept.includes("text/markdown")) return null;

  const mdPath = url.pathname.endsWith("/")
    ? `${url.pathname}index.md`
    : `${url.pathname}.md`;

  const mdUrl = new URL(url);
  mdUrl.pathname = mdPath;
  const mdResponse = await env.ASSETS.fetch(mdUrl.toString());

  if (mdResponse.ok) {
    const body = await mdResponse.text();
    const tokenEstimate = Math.ceil(body.length / 4);

    return new Response(body, {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "vary": "accept",
        "x-markdown-tokens": String(tokenEstimate),
        "content-signal": "ai-train=yes, search=yes, ai-input=yes",
      },
    });
  }

  // No markdown found — fall through to default asset fetch
  return null;
}

/**
 * Post-process HTML responses to add Vary: accept for content negotiation caching.
 */
function addVaryHeader(response: Response): Response {
  if (response.headers.get("content-type")?.includes("text/html")) {
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("vary", "accept");
    return newResponse;
  }
  return response;
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const handler = createWorkerHandler({
      before: contentNegotiation,
    });
    const response = await handler(request, env, ctx);
    return addVaryHeader(response);
  },
};
