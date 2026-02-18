import { describe, it, expect } from "vitest";
import { corsHeaders, jsonResponse, errorResponse } from "./utils.js";

describe("corsHeaders", () => {
  it("returns expected CORS headers", () => {
    const headers = corsHeaders();
    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(headers["Access-Control-Allow-Methods"]).toBe("GET, POST, OPTIONS");
    expect(headers["Access-Control-Allow-Headers"]).toBe("Authorization, Content-Type");
  });
});

describe("jsonResponse", () => {
  it("returns JSON body with correct content-type", async () => {
    const response = jsonResponse({ hello: "world" });
    const body = await response.json();

    expect(body).toEqual({ hello: "world" });
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("defaults to status 200", () => {
    const response = jsonResponse({ ok: true });
    expect(response.status).toBe(200);
  });

  it("uses provided status code", () => {
    const response = jsonResponse({ error: "bad" }, 400);
    expect(response.status).toBe(400);
  });

  it("includes CORS headers", () => {
    const response = jsonResponse({});
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("errorResponse", () => {
  it("returns Micropub-format error with correct status", async () => {
    const response = errorResponse("invalid_request", "Missing field", 400);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_request");
    expect(body.error_description).toBe("Missing field");
  });
});
