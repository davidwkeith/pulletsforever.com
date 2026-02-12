import { DateTime } from 'luxon';
import Image from "@11ty/eleventy-img";
import path from "path";
import { normalizeImageReference, parseMarkdownImageInner } from "./utils/image-reference.js";

const MARKDOWN_IMAGE_PROCESSING_CONCURRENCY = 4;
const markdownImageOutputCache = new Map();

async function runWithConcurrency(items, limit, worker) {
  if (!items.length) return;
  const workers = [];
  let index = 0;

  for (let i = 0; i < Math.min(limit, items.length); i += 1) {
    workers.push((async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await worker(current);
      }
    })());
  }

  await Promise.all(workers);
}

export default function(eleventyConfig) {
  /**
   * Get the first `n` elements of a collection.
   */
  eleventyConfig.addFilter("head", (array, n) => {
    if(!Array.isArray(array) || array.length === 0) {
      return [];
    }
    if( n < 0 ) {
      return array.slice(n);
    }

    return array.slice(0, n);
  });

  /**
   *  Return the smallest number argument
   */
  eleventyConfig.addFilter("min", (...numbers) => {
    return Math.min.apply(null, numbers);
  });

  eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
  // Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
  return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(format || "dd LLLL yyyy");
  });


  eleventyConfig.addFilter('htmlDateString', (dateObj) => {
    // dateObj input: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
  });

  /**
   * Return all the tags used in a collection
   */
  eleventyConfig.addFilter("getAllTags", collection => {
    let tagSet = new Set();
    for(let item of collection) {
      (item.data.tags || []).forEach(tag => tagSet.add(tag));
    }
    return Array.from(tagSet);
  });

  eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
    return (tags || []).filter(tag => ["all", "nav", "post", "posts"].indexOf(tag) === -1);
  });

  eleventyConfig.addFilter("json", function json (value) {
    return JSON.stringify(value);
  });

  /**
   * Generate an excerpt from HTML content
   * Strips tags, collapses whitespace, and truncates to ~155 characters at a word boundary
   */
  eleventyConfig.addFilter("excerpt", (content) => {
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

  /**
   * Calculate reading time from content
   * Assumes average reading speed of 200 words per minute
   */
  eleventyConfig.addFilter("readingTime", (content) => {
    if (!content) return "1 min read";
    const textOnly = content.replace(/<[^>]+>/g, '');
    const wordCount = textOnly.split(/\s+/).filter(word => word.length > 0).length;
    const minutes = Math.ceil(wordCount / 200);
    return `${minutes} min read`;
  });

  /**
   * Resolve a post-local image reference to a public URL.
   * Supports absolute URLs, root-relative URLs, and relative paths from inputPath.
   */
  eleventyConfig.addFilter("postImageUrl", (imagePath, inputPath) => {
    if (!imagePath || !inputPath) return "";

    const resolvedPath = normalizeImageReference(imagePath);
    if (!resolvedPath) return "";

    if (resolvedPath.startsWith("http://") || resolvedPath.startsWith("https://")) {
      return resolvedPath;
    }
    if (resolvedPath.startsWith("/")) {
      return resolvedPath;
    }

    const sourceDir = path.dirname(inputPath).replace(/\\/g, "/");
    const joined = path.posix.normalize(path.posix.join(sourceDir, resolvedPath));
    const withoutSrc = joined.startsWith("src/") ? joined.slice(3) : joined;
    return `/${withoutSrc.replace(/^\/+/, "")}`;
  });

  /**
   * Extract table of contents from HTML content
   * Returns array of { id, text, level } for h2 and h3 headings
   */
  eleventyConfig.addFilter("tableOfContents", (content) => {
    if (!content) return [];
    const headingRegex = /<h([23])[^>]*id="([^"]+)"[^>]*>([^<]*)<a[^>]*class="header-anchor"[^>]*>.*?<\/a><\/h[23]>/gi;
    const toc = [];
    let match;
    const decodeHtmlEntities = (str) => str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    while ((match = headingRegex.exec(content)) !== null) {
      toc.push({
        level: parseInt(match[1]),
        id: match[2],
        text: decodeHtmlEntities(match[3].trim())
      });
    }
    return toc;
  });

  /**
   * Get related posts based on shared tags
   * Returns up to `limit` posts sorted by number of shared tags (descending)
   */
  eleventyConfig.addFilter("relatedPosts", (currentTags, currentUrl, posts, limit = 3) => {
    if (!posts) return [];
    const filteredTags = (currentTags || []).filter(
      tag => ["all", "nav", "post", "posts"].indexOf(tag) === -1
    );
    if (filteredTags.length === 0) return [];

    const scored = posts
      .filter(post => post.url !== currentUrl)
      .map(post => {
        const postTags = (post.data.tags || []).filter(
          tag => ["all", "nav", "post", "posts"].indexOf(tag) === -1
        );
        const sharedTags = filteredTags.filter(tag => postTags.includes(tag));
        return { post, score: sharedTags.length };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(item => item.post);
  });

  /**
   * Get webmentions for a specific page URL
   * Uses the webmentions data file which groups mentions by target URL
   */
  eleventyConfig.addFilter("getWebmentions", (webmentions, url) => {
    if (!webmentions || !webmentions.byTarget) {
      return { likes: [], reposts: [], replies: [], mentions: [] };
    }
    // Normalize URL path
    const path = url.replace(/\/$/, "") || "/";
    return webmentions.byTarget[path] || { likes: [], reposts: [], replies: [], mentions: [] };
  });

  /**
   * Sort webmentions by date (newest first)
   */
  eleventyConfig.addFilter("sortWebmentions", (mentions) => {
    if (!Array.isArray(mentions)) return [];
    return [...mentions].sort((a, b) => {
      const dateA = new Date(a.published || a["wm-received"]);
      const dateB = new Date(b.published || b["wm-received"]);
      return dateB - dateA;
    });
  });

  /**
   * Return the hostname for a URL (without leading www.)
   */
  eleventyConfig.addFilter("urlHost", (value) => {
    if (!value || typeof value !== "string") return "";
    try {
      const host = new URL(value).hostname || "";
      return host.replace(/^www\./, "");
    } catch {
      return "";
    }
  });

  /**
   * Fix relative image paths in markdown content to use optimized images
   * Uses Eleventy Image to get the same processed URLs as HTML output
   * @param {string} content - Raw markdown content
   * @param {string} inputPath - The source file path (e.g., ./src/posts/copper-charlie/index.md)
   * @param {string} pageUrl - The output URL for the page (e.g., /copper-charlie/)
   */
  eleventyConfig.addAsyncFilter("fixMarkdownImagePaths", async (content, inputPath, pageUrl) => {
    if (!content || !inputPath) return content;

    // Find all markdown image references, including optional titles
    // Matches: ![alt](path) and ![alt](path "title")
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const matches = [...content.matchAll(imageRegex)];

    if (matches.length === 0) return content;

    // Get the source directory for resolving relative paths
    const sourceDir = path.dirname(inputPath);

    // Determine output paths - use page URL if available, fallback to /img/
    const outputUrl = pageUrl || "/img/";
    const outputDir = pageUrl ? path.join("./_site", pageUrl) : "./_site/img/";

    // Process each image and build replacement map
    const replacements = new Map();
    const uniqueMatches = Array.from(new Map(matches.map((match) => [match[0], match])).values());

    await runWithConcurrency(uniqueMatches, MARKDOWN_IMAGE_PROCESSING_CONCURRENCY, async (match) => {
      const [fullMatch, alt, imageInner] = match;
      const { path: imagePath, title } = parseMarkdownImageInner(imageInner);
      if (!imagePath) return;

      // Skip URLs
      if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return;
      }

      // Resolve the full path to the source image
      let fullImagePath;
      if (imagePath.startsWith("/")) {
        // Absolute path from site root - prepend src/
        fullImagePath = path.join("./src", imagePath.replace(/^\/+/, ""));
      } else {
        // Relative path - resolve from source file directory
        fullImagePath = path.join(sourceDir, imagePath);
      }
      fullImagePath = path.normalize(fullImagePath);

      try {
        const cacheKey = `${fullImagePath}|${outputDir}|${outputUrl}`;
        let cachedResult = markdownImageOutputCache.get(cacheKey);

        if (!cachedResult) {
          cachedResult = Image(fullImagePath, {
            widths: ["auto"],
            formats: ["jpeg"], // Use jpeg for markdown (simpler than picture element)
            outputDir,
            urlPath: outputUrl,
          }).then((metadata) => metadata.jpeg?.[0]?.url || null);
          markdownImageOutputCache.set(cacheKey, cachedResult);
        }

        const jpegUrl = await cachedResult;
        if (jpegUrl) {
          // Preserve the title if it existed
          const titlePart = title ? ` "${title}"` : "";
          replacements.set(fullMatch, `![${alt}](${jpegUrl}${titlePart})`);
        }
      } catch (error) {
        // If image processing fails, leave the original reference
        // This handles cases like missing files or unsupported formats
        console.warn(`[fixMarkdownImagePaths] Could not process image: ${fullImagePath}`, error.message);
      }
    });

    // Apply all replacements
    let result = content;
    for (const [original, replacement] of replacements) {
      result = result.replace(original, replacement);
    }

    return result;
  });

}
