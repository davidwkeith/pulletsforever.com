import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import worker from "./index.js";

// Mock auth and downstream handlers to isolate routing logic
vi.mock("./auth.js", () => ({
  verifyToken: vi.fn(),
}));
vi.mock("./post.js", () => ({
  createPost: vi.fn(),
}));
vi.mock("./update.js", () => ({
  updatePost: vi.fn(),
  deletePost: vi.fn(),
}));

import { verifyToken } from "./auth.js";
import { createPost } from "./post.js";
import { updatePost, deletePost } from "./update.js";

const baseUrl = "https://micropub.pulletsforever.com";

describe("Micropub routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CORS preflight", () => {
    it("returns 200 with CORS headers for OPTIONS on any path", async () => {
      const request = new Request(`${baseUrl}/micropub`, { method: "OPTIONS" });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });
  });

  describe("Unknown paths", () => {
    it("returns 404 for unrecognized paths", async () => {
      const request = new Request(`${baseUrl}/unknown`, { method: "GET" });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /micropub", () => {
    it("routes to query handler and returns config", async () => {
      const request = new Request(`${baseUrl}/micropub?q=config`, { method: "GET" });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body["media-endpoint"]).toBeDefined();
    });

    it("returns 400 when q param is missing", async () => {
      const request = new Request(`${baseUrl}/micropub`, { method: "GET" });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /micropub — auth and scope", () => {
    it("returns 401 when auth fails", async () => {
      verifyToken.mockResolvedValue({ valid: false, error: "Missing Authorization header" });

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: ["h-entry"], properties: { content: ["test"] } }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("unauthorized");
    });

    it("returns 403 for create without create scope", async () => {
      verifyToken.mockResolvedValue({ valid: true, scope: ["read"], me: "https://pulletsforever.com" });

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ type: ["h-entry"], properties: { content: ["test"] } }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("insufficient_scope");
    });

    it("returns 403 for update without update scope", async () => {
      verifyToken.mockResolvedValue({ valid: true, scope: ["create"], me: "https://pulletsforever.com" });

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ action: "update", url: "https://pulletsforever.com/post/", replace: {} }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(403);
    });

    it("returns 403 for delete without delete scope", async () => {
      verifyToken.mockResolvedValue({ valid: true, scope: ["create"], me: "https://pulletsforever.com" });

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ action: "delete", url: "https://pulletsforever.com/post/" }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(403);
    });
  });

  describe("POST /micropub — content types", () => {
    it("returns 400 for unsupported content type", async () => {
      verifyToken.mockResolvedValue({ valid: true, scope: ["create"], me: "https://pulletsforever.com" });

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: { "Content-Type": "text/plain", Authorization: "Bearer token" },
        body: "hello",
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("invalid_request");
      expect(body.error_description).toContain("content type");
    });
  });

  describe("POST /micropub — actions", () => {
    it("returns 201 with Location for successful create", async () => {
      verifyToken.mockResolvedValue({ valid: true, scope: ["create"], me: "https://pulletsforever.com" });
      createPost.mockResolvedValue({ url: "https://pulletsforever.com/new-post/" });

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ type: ["h-entry"], properties: { content: ["hello"] } }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(201);
      expect(response.headers.get("Location")).toBe("https://pulletsforever.com/new-post/");
    });

    it("returns 200 for successful update", async () => {
      verifyToken.mockResolvedValue({ valid: true, scope: ["update"], me: "https://pulletsforever.com" });
      updatePost.mockResolvedValue({});

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ action: "update", url: "https://pulletsforever.com/post/", replace: { name: ["New"] } }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
    });

    it("returns 200 for successful delete", async () => {
      verifyToken.mockResolvedValue({ valid: true, scope: ["delete"], me: "https://pulletsforever.com" });
      deletePost.mockResolvedValue({});

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ action: "delete", url: "https://pulletsforever.com/post/" }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
    });

    it("returns 400 for unknown action", async () => {
      verifyToken.mockResolvedValue({ valid: true, scope: ["create"], me: "https://pulletsforever.com" });

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ action: "purge" }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("invalid_request");
    });

    it("returns 500 when create fails", async () => {
      verifyToken.mockResolvedValue({ valid: true, scope: ["create"], me: "https://pulletsforever.com" });
      createPost.mockResolvedValue({ error: "GitLab API failed" });

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer token" },
        body: JSON.stringify({ type: ["h-entry"], properties: { content: ["hello"] } }),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(500);
    });
  });

  describe("Method not allowed", () => {
    it("returns 405 for PUT on /micropub", async () => {
      const request = new Request(`${baseUrl}/micropub`, { method: "PUT" });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(405);
    });
  });

  describe("formDataToMicropub — form-encoded posts", () => {
    it("parses form-encoded h-entry with h, content, and category[]", async () => {
      verifyToken.mockResolvedValue({ valid: true, scope: ["create"], me: "https://pulletsforever.com" });
      createPost.mockResolvedValue({ url: "https://pulletsforever.com/note/" });

      const formBody = new URLSearchParams();
      formBody.set("h", "entry");
      formBody.set("content", "Hello IndieWeb");
      formBody.append("category[]", "indieweb");
      formBody.append("category[]", "test");

      const request = new Request(`${baseUrl}/micropub`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Bearer token",
        },
        body: formBody.toString(),
      });
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(201);
      // Verify the data passed to createPost
      const data = createPost.mock.calls[0][0];
      expect(data.type).toEqual(["h-entry"]);
      expect(data.properties.content).toEqual(["Hello IndieWeb"]);
      expect(data.properties.category).toEqual(["indieweb", "test"]);
    });
  });
});
