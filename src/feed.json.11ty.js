import {
  absoluteUrl,
  convertHtmlToAbsoluteUrls,
  dateToRfc3339,
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

const filterTagList = (tags) =>
  (tags || []).filter((tag) => !["all", "nav", "post", "posts"].includes(tag));

export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/feed.json",
};

export async function render(data) {
  const { metadata, collections } = data;

  const items = [];
  for (const post of [...collections.posts].reverse()) {
    const postUrl = absoluteUrl(post.url, metadata.url);
    const articleHtml = renderArticle(post);
    const absoluteHtml = await convertHtmlToAbsoluteUrls(articleHtml, postUrl);
    const tags = filterTagList(post.data.tags);

    const item = {
      id: postUrl,
      url: postUrl,
      title: post.data.title,
      content_html: absoluteHtml,
      date_published: dateToRfc3339(post.date),
      tags,
    };

    if (post.data.hero?.src) {
      item.image = absoluteUrl(post.url + post.data.hero.src, metadata.url);
    }

    items.push(item);
  }

  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: metadata.title,
    language: metadata.language,
    home_page_url: metadata.url,
    feed_url: absoluteUrl("/feed.json", metadata.url),
    hubs: [
      {
        type: "WebSub",
        url: metadata.websub.hub,
      },
    ],
    icon: absoluteUrl(metadata.logo.src, metadata.url),
    favicon: absoluteUrl(metadata.favicon, metadata.url),
    description: metadata.description,
    author: {
      name: metadata.author.name,
      url: metadata.author.url,
      avatar: metadata.author.avatar,
    },
    items,
  };

  return JSON.stringify(feed, null, "\t");
}
