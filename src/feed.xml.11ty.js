import {
  absoluteUrl,
  convertHtmlToAbsoluteUrls,
  dateToRfc3339,
  getNewestCollectionItemDate,
} from "@11ty/eleventy-plugin-rss";

/**
 * Render article content for feed entries (replaces article.njk macro)
 */
function renderArticle(post) {
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

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const filterTagList = (tags) =>
  (tags || []).filter((tag) => !["all", "nav", "post", "posts"].includes(tag));

export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/feed.xml",
};

export async function render(data) {
  const { metadata, collections } = data;
  const selfUrl = absoluteUrl("/feed.xml", metadata.url);
  const updated = dateToRfc3339(getNewestCollectionItemDate(collections.posts));

  const entries = [];
  for (const post of [...collections.posts].reverse()) {
    const postUrl = absoluteUrl(post.url, metadata.url);
    const articleHtml = renderArticle(post);
    const absoluteHtml = await convertHtmlToAbsoluteUrls(articleHtml, postUrl);
    const tags = filterTagList(post.data.tags);

    const categoryTags = tags
      .map((tag) => `\t\t<category term="${escapeXml(tag)}"/>`)
      .join("\n");

    const modified = post.data.modified || post.date;

    entries.push(`\t<entry>
\t\t<title>${escapeXml(post.data.title)}</title>
\t\t<link href="${postUrl}" rel="alternate" type="text/html"/>
\t\t<id>${postUrl}</id>
\t\t<published>${dateToRfc3339(post.date)}</published>
\t\t<updated>${dateToRfc3339(modified)}</updated>
${categoryTags ? categoryTags + "\n" : ""}\t\t<content type="html">${escapeXml(absoluteHtml)}</content>
\t</entry>`);
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${metadata.language}">
\t<title>${escapeXml(metadata.title)}</title>
\t<subtitle>${escapeXml(metadata.description)}</subtitle>
\t<link href="${selfUrl}" rel="self" type="application/atom+xml"/>
\t<link href="${metadata.url}/" rel="alternate" type="text/html"/>
\t<link href="${metadata.websub.hub}" rel="hub"/>
\t<updated>${updated}</updated>
\t<id>${metadata.url}/</id>
\t<author>
\t\t<name>${escapeXml(metadata.author.name)}</name>
\t\t<email>${metadata.author.email}</email>
\t\t<uri>${metadata.author.url}</uri>
\t</author>
\t<icon>${absoluteUrl(metadata.logo.src, metadata.url)}</icon>
${entries.join("\n")}
</feed>
`;
}
