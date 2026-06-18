/**
 * Cloudflare Worker fronting the static Astro build in dist/.
 *
 * Handles content negotiation: when a client sends `Accept: text/markdown`,
 * serve the matching `index.md` file (emitted by `src/pages/[slug]/index.md.ts`)
 * instead of the rendered HTML. Otherwise pass through to the assets binding
 * and stamp `Vary: accept` on HTML responses for cache correctness.
 */

interface Env {
  ASSETS: { fetch: (input: string | Request) => Promise<Response> };
}

async function contentNegotiation(
  request: Request,
  url: URL,
  env: Env,
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

  return null;
}

function addVaryHeader(response: Response): Response {
  if (response.headers.get("content-type")?.includes("text/html")) {
    const newResponse = new Response(response.body, response);
    newResponse.headers.set("vary", "accept");
    return newResponse;
  }
  return response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const negotiated = await contentNegotiation(request, url, env);
    if (negotiated) return negotiated;
    const response = await env.ASSETS.fetch(request);
    return addVaryHeader(response);
  },
};
