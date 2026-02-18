/**
 * Shared utilities for Atom and JSON feed generation
 */

export function renderArticle(post: EleventyCollectionItem): string {
  let html = "";
  if (post.data.hero) {
    const src = post.page.filePathStem + "/" + post.data.hero.src;
    html += `  <figure class="hero-image">\n`;
    html += `      ${src}\n`;
    if (post.data.hero.caption) {
      html += `      <figcaption>${post.data.hero.caption}</figcaption>\n`;
    }
    html += `    </figure>\n`;
  }
  html += `  ${post.templateContent}\n`;
  html += `  <p class="signature">-dwk</p>`;
  return html;
}

export function filterTagList(tags: string[]): string[] {
  return (tags || []).filter(
    (tag) => !["all", "nav", "post", "posts"].includes(tag),
  );
}
