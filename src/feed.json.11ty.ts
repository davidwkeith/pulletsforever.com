import {
  absoluteUrl,
  convertHtmlToAbsoluteUrls,
  dateToRfc3339,
} from "@11ty/eleventy-plugin-rss";
import { renderArticle, filterTagList } from "./_utils/feed.ts";

export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/feed.json",
};

export async function render(data: EleventyData): Promise<string> {
  const { metadata, collections } = data;

  const items: Record<string, unknown>[] = [];
  for (const post of [...(collections.posts as EleventyCollectionItem[])].reverse()) {
    const postUrl = absoluteUrl(post.url, metadata.url);
    const articleHtml = renderArticle(post);
    const absoluteHtml = await convertHtmlToAbsoluteUrls(articleHtml, postUrl);
    const tags = filterTagList(post.data.tags as string[]);

    const item: Record<string, unknown> = {
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
