export default {
  async fetch(request, env) {
    const accept = request.headers.get("accept") || "";
    const url = new URL(request.url);

    if (accept.includes("text/markdown")) {
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
    }

    const response = await env.ASSETS.fetch(request);

    if (response.headers.get("content-type")?.includes("text/html")) {
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("vary", "accept");
      return newResponse;
    }

    return response;
  },
};
