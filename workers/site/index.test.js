import { describe, it, expect, vi } from "vitest";
import worker from "./index.js";

/**
 * Create a mock env.ASSETS that returns predefined responses by pathname.
 */
function mockEnv(assetMap = {}) {
  return {
    ASSETS: {
      fetch: vi.fn(async (input) => {
        const url = typeof input === "string" ? new URL(input) : new URL(input.url);
        const asset = assetMap[url.pathname];
        if (asset) {
          return new Response(asset.body, {
            status: 200,
            headers: asset.headers || {},
          });
        }
        return new Response("Not Found", { status: 404 });
      }),
    },
  };
}

describe("Site Worker — Markdown content negotiation", () => {
  it("serves markdown for trailing-slash URL when Accept includes text/markdown", async () => {
    const md = "# Hello\n\nThis is a post.";
    const env = mockEnv({
      "/blog/my-post/index.md": { body: md },
    });

    const request = new Request("https://pulletsforever.com/blog/my-post/", {
      headers: { accept: "text/markdown" },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("vary")).toBe("accept");
    expect(response.headers.get("content-signal")).toBe("ai-train=yes, search=yes, ai-input=yes");
    expect(await response.text()).toBe(md);
  });

  it("serves markdown for non-trailing-slash URL (appends .md)", async () => {
    const md = "# Page";
    const env = mockEnv({
      "/about.md": { body: md },
    });

    const request = new Request("https://pulletsforever.com/about", {
      headers: { accept: "text/markdown" },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(md);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
  });

  it("sets x-markdown-tokens header to ceil(length / 4)", async () => {
    const md = "A".repeat(100); // 100 chars → 25 tokens
    const env = mockEnv({
      "/post/index.md": { body: md },
    });

    const request = new Request("https://pulletsforever.com/post/", {
      headers: { accept: "text/markdown" },
    });

    const response = await worker.fetch(request, env);

    expect(response.headers.get("x-markdown-tokens")).toBe("25");
  });

  it("falls through to HTML when markdown file does not exist", async () => {
    const env = mockEnv({
      // No .md file — ASSETS will 404 for the md path
    });
    // Make ASSETS return HTML for the original request
    env.ASSETS.fetch.mockImplementation(async (input) => {
      const url = typeof input === "string" ? new URL(input) : new URL(input.url);
      if (url.pathname.endsWith(".md")) {
        return new Response("Not Found", { status: 404 });
      }
      return new Response("<html><body>Hello</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });

    const request = new Request("https://pulletsforever.com/blog/my-post/", {
      headers: { accept: "text/markdown" },
    });

    const response = await worker.fetch(request, env);

    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("vary")).toBe("accept");
  });
});

describe("Site Worker — HTML passthrough", () => {
  it("adds vary: accept header to HTML responses", async () => {
    const env = mockEnv({});
    env.ASSETS.fetch.mockResolvedValue(
      new Response("<html></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    );

    const request = new Request("https://pulletsforever.com/blog/");

    const response = await worker.fetch(request, env);

    expect(response.headers.get("vary")).toBe("accept");
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  it("does not add vary header to non-HTML responses", async () => {
    const env = mockEnv({});
    env.ASSETS.fetch.mockResolvedValue(
      new Response("body{}", {
        status: 200,
        headers: { "content-type": "text/css" },
      })
    );

    const request = new Request("https://pulletsforever.com/style.css");

    const response = await worker.fetch(request, env);

    expect(response.headers.get("vary")).toBeNull();
    expect(response.headers.get("content-type")).toBe("text/css");
  });

  it("passes through non-HTML responses unchanged", async () => {
    const imgBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const env = mockEnv({});
    env.ASSETS.fetch.mockResolvedValue(
      new Response(imgBytes, {
        status: 200,
        headers: { "content-type": "image/png" },
      })
    );

    const request = new Request("https://pulletsforever.com/img/photo.png");

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
