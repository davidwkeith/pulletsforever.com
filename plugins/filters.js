import { DateTime } from 'luxon';

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

}