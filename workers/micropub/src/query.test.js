import { describe, it, expect } from "vitest";
import { handleQuery } from "./query.js";

const baseUrl = "https://micropub.pulletsforever.com/micropub";

describe("handleQuery", () => {
  it("returns config with media-endpoint and post-types for q=config", async () => {
    const url = new URL(`${baseUrl}?q=config`);
    const response = handleQuery(url, {});

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body["media-endpoint"]).toBe("https://micropub.pulletsforever.com/media");
    expect(body["syndicate-to"]).toEqual([]);
    expect(body["post-types"]).toHaveLength(4);
    expect(body["post-types"].map((t) => t.type)).toEqual(["note", "article", "photo", "reply"]);
  });

  it("returns empty syndicate-to for q=syndicate-to", async () => {
    const url = new URL(`${baseUrl}?q=syndicate-to`);
    const response = handleQuery(url, {});

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body["syndicate-to"]).toEqual([]);
  });

  it("returns 501 for q=source", async () => {
    const url = new URL(`${baseUrl}?q=source`);
    const response = handleQuery(url, {});

    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.error).toBe("not_implemented");
  });

  it("returns 400 when q param is missing", async () => {
    const url = new URL(baseUrl);
    const response = handleQuery(url, {});

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_request");
  });

  it("returns 400 for unknown q value", async () => {
    const url = new URL(`${baseUrl}?q=unknown`);
    const response = handleQuery(url, {});

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_request");
    expect(body.error_description).toContain("unknown");
  });
});
