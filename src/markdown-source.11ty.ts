import { DateTime } from "luxon";

const filterTagList = (tags: string[]): string[] =>
  (tags || []).filter((tag) => !["all", "nav", "post", "posts"].includes(tag));

const htmlDateString = (dateObj: Date): string =>
  DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd");

export const data = {
  eleventyExcludeFromCollections: true,
  pagination: {
    data: "collections.posts",
    size: 1,
    alias: "post",
  },
  permalink: (data: EleventyData) => `${data.post!.url}index.md`,
  permalinkBypassOutputDir: false,
};

export async function render(
  this: { fixMarkdownImagePaths: (raw: string, inputPath: string, url: string) => Promise<string> },
  data: EleventyData,
): Promise<string> {
  const { metadata } = data;
  const post = data.post!;
  const title = (post.data.title as string) || "";
  const date = htmlDateString(post.data.date);
  const tags = filterTagList(post.data.tags as string[]);

  const body = await this.fixMarkdownImagePaths(
    post.rawInput,
    post.inputPath,
    post.url,
  );

  let frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
author: ${metadata.author.name}
url: ${metadata.url}${post.url}`;

  if (post.data.description) {
    frontmatter += `\ndescription: "${(post.data.description as string).replace(/"/g, '\\"')}"`;
  }

  if (tags.length > 0) {
    frontmatter += "\ntags:";
    for (const tag of tags) {
      frontmatter += `\n  - ${tag}`;
    }
  }

  frontmatter += "\n---";

  return `${frontmatter}\n\n${body}`;
}
