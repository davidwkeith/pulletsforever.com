import { describe, it, expect } from "vitest";
import { rewriteBlogImageUrls } from "./blog-images.ts";

const stub = async (p: string) =>
  p === "/images/blog/hero.png" ? "/_astro/hero.abc123.webp" : null;

describe("rewriteBlogImageUrls", () => {
  it("rewrites a markdown image URL", async () => {
    const out = await rewriteBlogImageUrls(
      "![alt](/images/blog/hero.png)",
      stub,
    );
    expect(out).toBe("![alt](/_astro/hero.abc123.webp)");
  });

  it("rewrites compare-tag attributes", async () => {
    const input =
      '{% compare before="/images/blog/hero.png" after="/images/blog/hero.png" %}';
    const out = await rewriteBlogImageUrls(input, stub);
    expect(out).toBe(
      '{% compare before="/_astro/hero.abc123.webp" after="/_astro/hero.abc123.webp" %}',
    );
  });

  it("leaves unresolvable blog tokens untouched", async () => {
    const out = await rewriteBlogImageUrls(
      "![x](/images/blog/missing.png)",
      stub,
    );
    expect(out).toBe("![x](/images/blog/missing.png)");
  });

  it("leaves non-blog URLs untouched", async () => {
    const out = await rewriteBlogImageUrls(
      "![x](/images/pages/foo.png)",
      stub,
    );
    expect(out).toBe("![x](/images/pages/foo.png)");
  });
});
