import { describe, it, expect } from "vitest";
import { generateSlug, parsePhotoValue, toYaml } from "./post.js";

describe("generateSlug", () => {
  it("generates slug from title", () => {
    expect(generateSlug("Hello World", "2024-01-15T12:00:00Z")).toBe("hello-world");
  });

  it("replaces special characters with hyphens", () => {
    expect(generateSlug("What's New in 2024?", "2024-01-15T12:00:00Z")).toBe("what-s-new-in-2024");
  });

  it("removes leading and trailing hyphens", () => {
    expect(generateSlug("---Hello---", "2024-01-15T12:00:00Z")).toBe("hello");
  });

  it("truncates long titles to 50 characters", () => {
    const longTitle = "This is a very long title that exceeds fifty characters and should be truncated";
    const slug = generateSlug(longTitle, "2024-01-15T12:00:00Z");
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug).toBe("this-is-a-very-long-title-that-exceeds-fifty-chara");
  });

  it("generates timestamp-based slug for notes without title", () => {
    const published = "2024-01-15T12:30:45Z";
    const slug = generateSlug(null, published);
    expect(slug).toMatch(/^note-\d+$/);
    expect(slug).toBe(`note-${new Date(published).getTime()}`);
  });

  it("generates timestamp-based slug for empty string title", () => {
    const published = "2024-06-20T08:00:00Z";
    const slug = generateSlug("", published);
    expect(slug).toMatch(/^note-\d+$/);
  });

  it("handles unicode characters", () => {
    expect(generateSlug("Café au Lait", "2024-01-15T12:00:00Z")).toBe("caf-au-lait");
  });

  it("collapses multiple special characters into single hyphen", () => {
    expect(generateSlug("Hello...World!!!", "2024-01-15T12:00:00Z")).toBe("hello-world");
  });
});

describe("parsePhotoValue", () => {
  it("parses simple URL string", () => {
    const result = parsePhotoValue("https://example.com/photo.jpg");
    expect(result).toEqual({
      url: "https://example.com/photo.jpg",
      alt: "",
    });
  });

  it("parses object with value and alt", () => {
    const result = parsePhotoValue({
      value: "https://example.com/photo.jpg",
      alt: "A beautiful sunset",
    });
    expect(result).toEqual({
      url: "https://example.com/photo.jpg",
      alt: "A beautiful sunset",
    });
  });

  it("parses object with url property (alternative format)", () => {
    const result = parsePhotoValue({
      url: "https://example.com/photo.jpg",
      alt: "Chicken photo",
    });
    expect(result).toEqual({
      url: "https://example.com/photo.jpg",
      alt: "Chicken photo",
    });
  });

  it("handles object with missing alt", () => {
    const result = parsePhotoValue({
      value: "https://example.com/photo.jpg",
    });
    expect(result).toEqual({
      url: "https://example.com/photo.jpg",
      alt: "",
    });
  });

  it("handles empty object", () => {
    const result = parsePhotoValue({});
    expect(result).toEqual({
      url: "",
      alt: "",
    });
  });
});

describe("toYaml", () => {
  it("converts simple key-value pairs", () => {
    const result = toYaml({ title: "Hello", date: "2024-01-15" });
    expect(result).toBe("title: Hello\ndate: 2024-01-15\n");
  });

  it("converts arrays to YAML list format", () => {
    const result = toYaml({ tags: ["chickens", "cooking"] });
    expect(result).toBe('tags:\n  - "chickens"\n  - "cooking"\n');
  });

  it("quotes strings containing colons", () => {
    const result = toYaml({ title: "Note: Something important" });
    expect(result).toBe('title: "Note: Something important"\n');
  });

  it("quotes strings containing hash symbols", () => {
    const result = toYaml({ title: "C# Programming" });
    expect(result).toBe('title: "C# Programming"\n');
  });

  it("quotes strings containing quotes", () => {
    const result = toYaml({ title: 'He said "hello"' });
    expect(result).toBe('title: "He said \\"hello\\""\n');
  });

  it("handles nested objects", () => {
    const result = toYaml({
      author: {
        name: "David",
        email: "david@example.com",
      },
    });
    expect(result).toBe("author:\n  name: David\n  email: david@example.com\n");
  });

  it("handles mixed content", () => {
    const result = toYaml({
      title: "My Post",
      date: "2024-01-15",
      tags: ["tech", "web"],
    });
    expect(result).toContain("title: My Post\n");
    expect(result).toContain("date: 2024-01-15\n");
    expect(result).toContain('tags:\n  - "tech"\n  - "web"\n');
  });

  it("handles empty object", () => {
    const result = toYaml({});
    expect(result).toBe("");
  });

  it("handles boolean and number values", () => {
    const result = toYaml({ draft: true, views: 42 });
    expect(result).toBe("draft: true\nviews: 42\n");
  });
});
