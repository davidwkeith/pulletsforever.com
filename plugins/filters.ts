import { DateTime } from "luxon";
import Image from "@11ty/eleventy-img";
import path from "path";
import {
  normalizeImageReference,
  parseMarkdownImageInner,
} from "./utils/image-reference.ts";

const MARKDOWN_IMAGE_PROCESSING_CONCURRENCY = 4;
const markdownImageOutputCache = new Map<string, Promise<string | null>>();

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (!items.length) return;
  const workers: Promise<void>[] = [];
  let index = 0;

  for (let i = 0; i < Math.min(limit, items.length); i += 1) {
    workers.push(
      (async () => {
        while (index < items.length) {
          const current = items[index];
          index += 1;
          await worker(current);
        }
      })(),
    );
  }

  await Promise.all(workers);
}

export default function (eleventyConfig: EleventyConfig): void {
  eleventyConfig.addFilter("head", (array: unknown[], n: number) => {
    if (!Array.isArray(array) || array.length === 0) {
      return [];
    }
    if (n < 0) {
      return array.slice(n);
    }
    return array.slice(0, n);
  });

  eleventyConfig.addFilter("min", (...numbers: number[]) => {
    return Math.min.apply(null, numbers);
  });

  eleventyConfig.addFilter(
    "readableDate",
    (dateObj: Date, format?: string, zone?: string) => {
      return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(
        format || "dd LLLL yyyy",
      );
    },
  );

  eleventyConfig.addFilter("htmlDateString", (dateObj: Date) => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat(
      "yyyy-LL-dd",
    );
  });

  eleventyConfig.addFilter(
    "getAllTags",
    (collection: EleventyCollectionItem[]) => {
      const tagSet = new Set<string>();
      for (const item of collection) {
        (item.data.tags || []).forEach((tag: string) => tagSet.add(tag));
      }
      return Array.from(tagSet);
    },
  );

  eleventyConfig.addFilter("filterTagList", function filterTagList(
    tags: string[],
  ) {
    return (tags || []).filter(
      (tag) => ["all", "nav", "post", "posts"].indexOf(tag) === -1,
    );
  });

  eleventyConfig.addFilter("json", function json(value: unknown) {
    return JSON.stringify(value);
  });

  eleventyConfig.addFilter("excerpt", (content: string) => {
    if (!content) return "";
    const text = content
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length <= 155) return text;
    const truncated = text.slice(0, 155);
    const lastSpace = truncated.lastIndexOf(" ");
    return (lastSpace > 80 ? truncated.slice(0, lastSpace) : truncated) + "…";
  });

  eleventyConfig.addFilter("readingTime", (content: string) => {
    if (!content) return "1 min read";
    const textOnly = content.replace(/<[^>]+>/g, "");
    const wordCount = textOnly
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    const minutes = Math.ceil(wordCount / 200);
    return `${minutes} min read`;
  });

  eleventyConfig.addFilter(
    "postImageUrl",
    (imagePath: string, inputPath: string) => {
      if (!imagePath || !inputPath) return "";

      const resolvedPath = normalizeImageReference(imagePath);
      if (!resolvedPath) return "";

      if (
        resolvedPath.startsWith("http://") ||
        resolvedPath.startsWith("https://")
      ) {
        return resolvedPath;
      }
      if (resolvedPath.startsWith("/")) {
        return resolvedPath;
      }

      const sourceDir = path.dirname(inputPath).replace(/\\/g, "/");
      const joined = path.posix.normalize(
        path.posix.join(sourceDir, resolvedPath),
      );
      const withoutSrc = joined.startsWith("src/") ? joined.slice(3) : joined;
      return `/${withoutSrc.replace(/^\/+/, "")}`;
    },
  );

  eleventyConfig.addFilter("tableOfContents", (content: string) => {
    if (!content) return [];
    const headingRegex =
      /<h([23])[^>]*id="([^"]+)"[^>]*>([^<]*)<a[^>]*class="header-anchor"[^>]*>.*?<\/a><\/h[23]>/gi;
    const toc: { level: number; id: string; text: string }[] = [];
    let match;
    const decodeHtmlEntities = (str: string) =>
      str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    while ((match = headingRegex.exec(content)) !== null) {
      toc.push({
        level: parseInt(match[1]),
        id: match[2],
        text: decodeHtmlEntities(match[3].trim()),
      });
    }
    return toc;
  });

  eleventyConfig.addFilter(
    "relatedPosts",
    (
      currentTags: string[],
      currentUrl: string,
      posts: EleventyCollectionItem[],
      limit = 3,
    ) => {
      if (!posts) return [];
      const filteredTags = (currentTags || []).filter(
        (tag) => ["all", "nav", "post", "posts"].indexOf(tag) === -1,
      );
      if (filteredTags.length === 0) return [];

      const scored = posts
        .filter((post) => post.url !== currentUrl)
        .map((post) => {
          const postTags = ((post.data.tags as string[]) || []).filter(
            (tag) => ["all", "nav", "post", "posts"].indexOf(tag) === -1,
          );
          const sharedTags = filteredTags.filter((tag) =>
            postTags.includes(tag),
          );
          return { post, score: sharedTags.length };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return scored.map((item) => item.post);
    },
  );

  eleventyConfig.addFilter(
    "getWebmentions",
    (
      webmentions: {
        byTarget?: Record<
          string,
          { likes: unknown[]; reposts: unknown[]; replies: unknown[]; mentions: unknown[] }
        >;
      },
      url: string,
    ) => {
      if (!webmentions || !webmentions.byTarget) {
        return { likes: [], reposts: [], replies: [], mentions: [] };
      }
      const urlPath = url.replace(/\/$/, "") || "/";
      return (
        webmentions.byTarget[urlPath] || {
          likes: [],
          reposts: [],
          replies: [],
          mentions: [],
        }
      );
    },
  );

  eleventyConfig.addFilter(
    "sortWebmentions",
    (mentions: { published?: string; "wm-received"?: string }[]) => {
      if (!Array.isArray(mentions)) return [];
      return [...mentions].sort((a, b) => {
        const dateA = new Date(a.published || a["wm-received"] || 0);
        const dateB = new Date(b.published || b["wm-received"] || 0);
        return dateB.getTime() - dateA.getTime();
      });
    },
  );

  eleventyConfig.addFilter("urlHost", (value: string) => {
    if (!value || typeof value !== "string") return "";
    try {
      const host = new URL(value).hostname || "";
      return host.replace(/^www\./, "");
    } catch {
      return "";
    }
  });

  eleventyConfig.addAsyncFilter(
    "fixMarkdownImagePaths",
    async (content: string, inputPath: string, pageUrl: string) => {
      if (!content || !inputPath) return content;

      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const matches = [...content.matchAll(imageRegex)];

      if (matches.length === 0) return content;

      const sourceDir = path.dirname(inputPath);
      const outputUrl = pageUrl || "/img/";
      const outputDir = pageUrl
        ? path.join("./_site", pageUrl)
        : "./_site/img/";

      const replacements = new Map<string, string>();
      const uniqueMatches = Array.from(
        new Map(matches.map((match) => [match[0], match])).values(),
      );

      await runWithConcurrency(
        uniqueMatches,
        MARKDOWN_IMAGE_PROCESSING_CONCURRENCY,
        async (match) => {
          const [fullMatch, alt, imageInner] = match;
          const { path: imagePath, title } =
            parseMarkdownImageInner(imageInner);
          if (!imagePath) return;

          if (
            imagePath.startsWith("http://") ||
            imagePath.startsWith("https://")
          ) {
            return;
          }

          let fullImagePath: string;
          if (imagePath.startsWith("/")) {
            fullImagePath = path.join(
              "./src",
              imagePath.replace(/^\/+/, ""),
            );
          } else {
            fullImagePath = path.join(sourceDir, imagePath);
          }
          fullImagePath = path.normalize(fullImagePath);

          try {
            const cacheKey = `${fullImagePath}|${outputDir}|${outputUrl}`;
            let cachedResult = markdownImageOutputCache.get(cacheKey);

            if (!cachedResult) {
              cachedResult = Image(fullImagePath, {
                widths: ["auto"],
                formats: ["jpeg"],
                outputDir,
                urlPath: outputUrl,
              }).then(
                (metadata: Record<string, { url: string }[]>) =>
                  metadata.jpeg?.[0]?.url || null,
              );
              markdownImageOutputCache.set(cacheKey, cachedResult);
            }

            const jpegUrl = await cachedResult;
            if (jpegUrl) {
              const titlePart = title ? ` "${title}"` : "";
              replacements.set(
                fullMatch,
                `![${alt}](${jpegUrl}${titlePart})`,
              );
            }
          } catch (error) {
            console.warn(
              `[fixMarkdownImagePaths] Could not process image: ${fullImagePath}`,
              (error as Error).message,
            );
          }
        },
      );

      let result = content;
      for (const [original, replacement] of replacements) {
        result = result.replace(original, replacement);
      }

      return result;
    },
  );
}
