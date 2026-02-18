import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyToken } from "./auth.js";

const SITE_URL = "https://pulletsforever.com";

function makeRequest(authHeader) {
  const headers = {};
  if (authHeader) headers.Authorization = authHeader;
  return new Request("https://micropub.pulletsforever.com/micropub", {
    method: "POST",
    headers,
  });
}

describe("verifyToken", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns invalid when Authorization header is missing", async () => {
    const result = await verifyToken(makeRequest(null), { SITE_URL });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Missing");
  });

  it("returns invalid for non-Bearer authorization", async () => {
    const result = await verifyToken(makeRequest("Basic dXNlcjpwYXNz"), { SITE_URL });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid");
  });

  it("returns invalid when token endpoint returns non-200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const result = await verifyToken(makeRequest("Bearer bad-token"), { SITE_URL });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("401");
  });

  it("returns invalid when token response is missing me field", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ scope: "create" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await verifyToken(makeRequest("Bearer token"), { SITE_URL });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("me");
  });

  it("returns invalid when me URL does not match site URL", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ me: "https://evil.example.com/", scope: "create" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await verifyToken(makeRequest("Bearer token"), { SITE_URL });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("does not match");
  });

  it("returns valid with parsed scopes for matching me URL", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          me: "https://pulletsforever.com/",
          scope: "create update delete",
          client_id: "https://quill.p3k.io/",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await verifyToken(makeRequest("Bearer good-token"), { SITE_URL });
    expect(result.valid).toBe(true);
    expect(result.me).toBe("https://pulletsforever.com/");
    expect(result.scope).toEqual(["create", "update", "delete"]);
    expect(result.client_id).toBe("https://quill.p3k.io/");
  });

  it("returns empty scope array when scope is missing from response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ me: "https://pulletsforever.com/" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await verifyToken(makeRequest("Bearer token"), { SITE_URL });
    expect(result.valid).toBe(true);
    expect(result.scope).toEqual([]);
  });

  it("returns invalid when fetch throws a network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("DNS resolution failed"));

    const result = await verifyToken(makeRequest("Bearer token"), { SITE_URL });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("DNS resolution failed");
  });

  it("normalizes me URL with trailing slash to match site URL without", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ me: "https://pulletsforever.com/", scope: "create" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    // SITE_URL has no trailing slash
    const result = await verifyToken(makeRequest("Bearer token"), {
      SITE_URL: "https://pulletsforever.com",
    });
    expect(result.valid).toBe(true);
  });

  it("sends Bearer token to the token endpoint", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ me: "https://pulletsforever.com/", scope: "create" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await verifyToken(makeRequest("Bearer my-secret-token"), { SITE_URL });

    expect(globalThis.fetch).toHaveBeenCalledWith("https://indieauth.com/token", {
      method: "GET",
      headers: {
        Authorization: "Bearer my-secret-token",
        Accept: "application/json",
      },
    });
  });
});
