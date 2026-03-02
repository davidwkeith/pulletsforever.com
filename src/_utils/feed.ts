/**
 * Shared utilities for Atom and JSON feed generation
 */

export function renderArticle(post: EleventyCollectionItem): string {
  let html = "";

  // Posts use fileSlug permalinks that strip the /posts/ prefix, but images
  // are passthrough-copied at the source path.  Resolve relative image src
  // attributes against the source directory so convertHtmlToAbsoluteUrls
  // produces correct URLs (e.g. /posts/slug/img.png, not /slug/img.png).
  const srcDir = post.page.filePathStem.substring(
    0,
    post.page.filePathStem.lastIndexOf("/"),
  );

  if (post.data.hero) {
    const src = srcDir + "/" + post.data.hero.src;
    html += `  <figure class="hero-image">\n`;
    html += `      <img src="${src}" alt="${post.data.hero.alt || ""}">\n`;
    if (post.data.hero.caption) {
      html += `      <figcaption>${post.data.hero.caption}</figcaption>\n`;
    }
    html += `    </figure>\n`;
  }

  let content = post.templateContent;
  content = content.replace(
    /(<img\s[^>]*\bsrc=")(?!https?:\/\/|\/)([^"]+)(")/g,
    `$1${srcDir}/$2$3`,
  );

  html += `  ${content}\n`;
  html += `  <p class="signature">-dwk</p>`;
  return html;
}

export function filterTagList(tags: string[]): string[] {
  return (tags || []).filter(
    (tag) => !["all", "nav", "post", "posts"].includes(tag),
  );
}
