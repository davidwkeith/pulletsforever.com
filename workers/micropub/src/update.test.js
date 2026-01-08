import { describe, it, expect } from "vitest";
import {
  extractSlugFromUrl,
  parseMarkdownPost,
  buildMarkdownPost,
  applyOperations,
} from "./update.js";

describe("extractSlugFromUrl", () => {
  const siteUrl = "https://pulletsforever.com";

  it("extracts slug from valid post URL", () => {
    expect(extractSlugFromUrl("https://pulletsforever.com/my-post/", siteUrl)).toBe("my-post");
  });

  it("extracts slug without trailing slash", () => {
    expect(extractSlugFromUrl("https://pulletsforever.com/my-post", siteUrl)).toBe("my-post");
  });

  it("returns null for different domain", () => {
    expect(extractSlugFromUrl("https://example.com/my-post/", siteUrl)).toBe(null);
  });

  it("returns null for root URL", () => {
    expect(extractSlugFromUrl("https://pulletsforever.com/", siteUrl)).toBe(null);
  });

  it("returns null for invalid URL", () => {
    expect(extractSlugFromUrl("not-a-url", siteUrl)).toBe(null);
  });

  it("handles URL with query parameters", () => {
    expect(extractSlugFromUrl("https://pulletsforever.com/my-post/?utm=test", siteUrl)).toBe("my-post");
  });
});

describe("parseMarkdownPost", () => {
  it("parses frontmatter and body", () => {
    const content = `---
title: Hello World
date: 2024-01-15
---

This is the body content.`;

    const result = parseMarkdownPost(content);
    expect(result.frontmatter).toEqual({
      title: "Hello World",
      date: "2024-01-15",
    });
    expect(result.body).toBe("This is the body content.");
  });

  it("parses inline array tags", () => {
    const content = `---
title: Test
tags: [web, chickens]
---

Body`;

    const result = parseMarkdownPost(content);
    expect(result.frontmatter.tags).toEqual(["web", "chickens"]);
  });

  it("parses multi-line array tags", () => {
    const content = `---
title: Test
tags:
  - web
  - chickens
---

Body`;

    const result = parseMarkdownPost(content);
    expect(result.frontmatter.tags).toEqual(["web", "chickens"]);
  });

  it("handles empty body", () => {
    const content = `---
title: Empty Post
---
`;

    const result = parseMarkdownPost(content);
    expect(result.frontmatter.title).toBe("Empty Post");
    expect(result.body).toBe("");
  });

  it("handles content without frontmatter", () => {
    const content = "Just some text without frontmatter";

    const result = parseMarkdownPost(content);
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("Just some text without frontmatter");
  });

  it("preserves multi-line body content", () => {
    const content = `---
title: Test
---

First paragraph.

Second paragraph.

Third paragraph.`;

    const result = parseMarkdownPost(content);
    expect(result.body).toContain("First paragraph.");
    expect(result.body).toContain("Second paragraph.");
    expect(result.body).toContain("Third paragraph.");
  });

  it("handles quoted values in frontmatter", () => {
    const content = `---
title: "A title with: special chars"
description: 'Single quoted'
---

Body`;

    const result = parseMarkdownPost(content);
    expect(result.frontmatter.title).toBe("A title with: special chars");
    expect(result.frontmatter.description).toBe("Single quoted");
  });
});

describe("buildMarkdownPost", () => {
  it("builds markdown with frontmatter and body", () => {
    const frontmatter = { title: "Hello", date: "2024-01-15" };
    const body = "This is content.";

    const result = buildMarkdownPost(frontmatter, body);

    expect(result).toContain("---\n");
    expect(result).toContain("title: Hello\n");
    expect(result).toContain("date: 2024-01-15\n");
    expect(result).toContain("---\n");
    expect(result).toContain("This is content.");
  });

  it("handles empty body", () => {
    const frontmatter = { title: "Empty" };
    const body = "";

    const result = buildMarkdownPost(frontmatter, body);

    expect(result).toContain("title: Empty");
    expect(result).toMatch(/---\n$/);
  });

  it("handles array values", () => {
    const frontmatter = { title: "Test", tags: ["web", "tech"] };
    const body = "Content";

    const result = buildMarkdownPost(frontmatter, body);

    expect(result).toContain("tags:\n");
    expect(result).toContain('  - "web"');
    expect(result).toContain('  - "tech"');
  });
});

describe("applyOperations", () => {
  describe("replace", () => {
    it("replaces existing property", () => {
      const frontmatter = { title: "Old Title", date: "2024-01-01" };
      const body = "Content";

      const result = applyOperations(frontmatter, body, {
        replace: { name: ["New Title"] },
      });

      expect(result.frontmatter.title).toBe("New Title");
      expect(result.frontmatter.date).toBe("2024-01-01");
    });

    it("creates new property if missing", () => {
      const frontmatter = { title: "Test" };
      const body = "Content";

      const result = applyOperations(frontmatter, body, {
        replace: { summary: ["A description"] },
      });

      expect(result.frontmatter.title).toBe("Test");
      expect(result.frontmatter.description).toBe("A description");
    });

    it("replaces content body", () => {
      const frontmatter = { title: "Test" };
      const body = "Old content";

      const result = applyOperations(frontmatter, body, {
        replace: { content: ["New content"] },
      });

      expect(result.body).toBe("New content");
    });

    it("replaces content with html object", () => {
      const frontmatter = { title: "Test" };
      const body = "Old content";

      const result = applyOperations(frontmatter, body, {
        replace: { content: [{ html: "<p>HTML content</p>" }] },
      });

      expect(result.body).toBe("<p>HTML content</p>");
    });

    it("replaces array properties", () => {
      const frontmatter = { title: "Test", tags: ["old"] };
      const body = "Content";

      const result = applyOperations(frontmatter, body, {
        replace: { category: ["new1", "new2"] },
      });

      expect(result.frontmatter.tags).toEqual(["new1", "new2"]);
    });
  });

  describe("add", () => {
    it("appends to existing array", () => {
      const frontmatter = { title: "Test", tags: ["web"] };
      const body = "Content";

      const result = applyOperations(frontmatter, body, {
        add: { category: ["micropub"] },
      });

      expect(result.frontmatter.tags).toEqual(["web", "micropub"]);
    });

    it("creates array if property missing", () => {
      const frontmatter = { title: "Test" };
      const body = "Content";

      const result = applyOperations(frontmatter, body, {
        add: { category: ["new-tag"] },
      });

      expect(result.frontmatter.tags).toBe("new-tag");
    });

    it("converts single value to array when adding", () => {
      const frontmatter = { title: "Test", tags: "single" };
      const body = "Content";

      const result = applyOperations(frontmatter, body, {
        add: { category: ["new-tag"] },
      });

      expect(result.frontmatter.tags).toEqual(["single", "new-tag"]);
    });

    it("appends to content body", () => {
      const frontmatter = { title: "Test" };
      const body = "First part";

      const result = applyOperations(frontmatter, body, {
        add: { content: ["Second part"] },
      });

      expect(result.body).toBe("First part\n\nSecond part");
    });
  });

  describe("delete", () => {
    it("removes property entirely when given property name array", () => {
      const frontmatter = { title: "Test", description: "Remove me" };
      const body = "Content";

      const result = applyOperations(frontmatter, body, {
        delete: ["summary"],
      });

      expect(result.frontmatter.title).toBe("Test");
      expect(result.frontmatter.description).toBeUndefined();
    });

    it("removes specific values from array", () => {
      const frontmatter = { title: "Test", tags: ["web", "chickens", "tech"] };
      const body = "Content";

      const result = applyOperations(frontmatter, body, {
        delete: { category: ["chickens"] },
      });

      expect(result.frontmatter.tags).toEqual(["web", "tech"]);
    });

    it("removes property when all values deleted", () => {
      const frontmatter = { title: "Test", tags: ["chickens"] };
      const body = "Content";

      const result = applyOperations(frontmatter, body, {
        delete: { category: ["chickens"] },
      });

      expect(result.frontmatter.tags).toBeUndefined();
    });

    it("clears content body", () => {
      const frontmatter = { title: "Test" };
      const body = "Some content";

      const result = applyOperations(frontmatter, body, {
        delete: ["content"],
      });

      expect(result.body).toBe("");
    });

    it("removes matching single value property", () => {
      const frontmatter = { title: "Test", description: "Remove me" };
      const body = "Content";

      const result = applyOperations(frontmatter, body, {
        delete: { summary: ["Remove me"] },
      });

      expect(result.frontmatter.description).toBeUndefined();
    });
  });

  describe("combined operations", () => {
    it("applies multiple operations in order", () => {
      const frontmatter = { title: "Old", tags: ["keep", "remove"], description: "Delete me" };
      const body = "Original";

      const result = applyOperations(frontmatter, body, {
        replace: { name: ["New Title"] },
        add: { category: ["added"] },
        delete: { category: ["remove"] },
      });

      expect(result.frontmatter.title).toBe("New Title");
      expect(result.frontmatter.tags).toEqual(["keep", "added"]);
      expect(result.frontmatter.description).toBe("Delete me");
    });
  });

  describe("property mapping", () => {
    it("maps name to title", () => {
      const result = applyOperations({}, "", { replace: { name: ["Test"] } });
      expect(result.frontmatter.title).toBe("Test");
    });

    it("maps category to tags", () => {
      const result = applyOperations({}, "", { replace: { category: ["tag1", "tag2"] } });
      expect(result.frontmatter.tags).toEqual(["tag1", "tag2"]);
    });

    it("maps summary to description", () => {
      const result = applyOperations({}, "", { replace: { summary: ["Desc"] } });
      expect(result.frontmatter.description).toBe("Desc");
    });

    it("maps published to date", () => {
      const result = applyOperations({}, "", { replace: { published: ["2024-06-15"] } });
      expect(result.frontmatter.date).toBe("2024-06-15");
    });

    it("preserves in-reply-to as-is", () => {
      const result = applyOperations({}, "", { replace: { "in-reply-to": ["https://example.com"] } });
      expect(result.frontmatter["in-reply-to"]).toBe("https://example.com");
    });
  });
});
