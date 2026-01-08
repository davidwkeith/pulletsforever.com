import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeEach, vi } from "vitest";
import worker from "./index.js";

// Mock the token verification
vi.mock("./auth.js", () => ({
  verifyToken: vi.fn(),
}));

import { verifyToken } from "./auth.js";

describe("Media Endpoint", () => {
  const baseUrl = "https://micropub.pulletsforever.com";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /media", () => {
    it("returns 401 when no authorization header is provided", async () => {
      verifyToken.mockResolvedValue({
        valid: false,
        error: "Missing Authorization header",
      });

      const request = new Request(`${baseUrl}/media`, {
        method: "POST",
        body: new FormData(),
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("unauthorized");
    });

    it("returns 403 when token lacks media or create scope", async () => {
      verifyToken.mockResolvedValue({
        valid: true,
        scope: ["read"],
        me: "https://pulletsforever.com",
      });

      const request = new Request(`${baseUrl}/media`, {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
        },
        body: new FormData(),
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("insufficient_scope");
    });

    it("returns 400 when file field is missing", async () => {
      verifyToken.mockResolvedValue({
        valid: true,
        scope: ["media"],
        me: "https://pulletsforever.com",
      });

      const formData = new FormData();
      // No file field added

      const request = new Request(`${baseUrl}/media`, {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
        },
        body: formData,
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("invalid_request");
      expect(body.error_description).toContain("file");
    });

    it("returns 400 for unsupported file types", async () => {
      verifyToken.mockResolvedValue({
        valid: true,
        scope: ["media"],
        me: "https://pulletsforever.com",
      });

      const formData = new FormData();
      const file = new File(["test content"], "test.exe", {
        type: "application/x-msdownload",
      });
      formData.append("file", file);

      const request = new Request(`${baseUrl}/media`, {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
        },
        body: formData,
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("invalid_request");
      expect(body.error_description).toContain("not allowed");
    });

    it("rejects SVG uploads due to XSS risk", async () => {
      verifyToken.mockResolvedValue({
        valid: true,
        scope: ["media"],
        me: "https://pulletsforever.com",
      });

      const formData = new FormData();
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>';
      const file = new File([svgContent], "image.svg", {
        type: "image/svg+xml",
      });
      formData.append("file", file);

      const request = new Request(`${baseUrl}/media`, {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
        },
        body: formData,
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("invalid_request");
      expect(body.error_description).toContain("not allowed");
    });

    it("returns 201 with Location header for valid image upload", async () => {
      verifyToken.mockResolvedValue({
        valid: true,
        scope: ["media"],
        me: "https://pulletsforever.com",
      });

      const formData = new FormData();
      const imageData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes
      const file = new File([imageData], "photo.jpg", {
        type: "image/jpeg",
      });
      formData.append("file", file);

      const request = new Request(`${baseUrl}/media`, {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
        },
        body: formData,
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(201);
      const location = response.headers.get("Location");
      expect(location).toMatch(/^https:\/\/media\.pulletsforever\.com\/\d+-[a-f0-9]+\.jpg$/);
    });

    it("accepts create scope as alternative to media scope", async () => {
      verifyToken.mockResolvedValue({
        valid: true,
        scope: ["create"],
        me: "https://pulletsforever.com",
      });

      const formData = new FormData();
      const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "image.png", {
        type: "image/png",
      });
      formData.append("file", file);

      const request = new Request(`${baseUrl}/media`, {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
        },
        body: formData,
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(201);
    });
  });

  describe("Other methods on /media", () => {
    it("returns 405 for GET requests", async () => {
      const request = new Request(`${baseUrl}/media`, {
        method: "GET",
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("POST");
    });

    it("returns CORS headers for OPTIONS requests", async () => {
      const request = new Request(`${baseUrl}/media`, {
        method: "OPTIONS",
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });
  });
});

describe("Config query includes media-endpoint", () => {
  it("returns media-endpoint in config response", async () => {
    const request = new Request("https://micropub.pulletsforever.com/micropub?q=config", {
      method: "GET",
    });

    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body["media-endpoint"]).toBe("https://micropub.pulletsforever.com/media");
  });
});
